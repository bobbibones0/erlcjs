import type { Client } from './client.js';
import { ERLCEvents, type ClientEvents } from './events.js';
import type { InGameCommand, RawServerData } from '../types/index.js';
import type { RestManager } from '../rest/manager.js';
import { ServerInfo } from '../structures/serverinfo.js';
import { Base } from '../structures/base.js';
import { PlayerManager } from '../managers/playermanager.js';
import { VehicleManager } from '../managers/vehiclemanager.js';
import { CommandManager } from '../managers/commandmanager.js';
import { CommandLogManager } from '../managers/commandlogmanager.js';
import { EmergencyCallManager } from '../managers/emergencycallmanager.js';
import { KillLogManager } from '../managers/killlogmanager.js';
import { ModCallManager } from '../managers/modcallmanager.js';
import { StaffManager } from '../managers/staffmanager.js';
import { Collection } from '../util/collection.js';
import { CustomCommandError, InvalidGlobalKeyError, ServerOfflineError, TimeoutError } from '../errors/index.js';

const FULL_POLL_QUERY =
    '/v2/server?Players=true&Vehicles=true&Staff=true&JoinLogs=true&Queue=true&KillLogs=true&CommandLogs=true&ModCalls=true&EmergencyCalls=true';

/** Consecutive non-offline poll failures before a server is treated as offline. */
const OFFLINE_FAILURE_THRESHOLD = 3;

/**
 * Represents a single ER:LC game server managed by a {@link Client}.
 * Holds the server's own managers, caches, polling loop, and webhook routing.
 * @public
 */
export class Server {
    /** The Client that manages this server. */
    public readonly client: Client;
    /** The ER:LC server ID, parsed from the server API key. */
    public readonly id: string;
    /** The ER:LC Server API key. */
    public readonly key: string;
    /** REST adapter bound to this server's API key. */
    public readonly rest: Pick<RestManager, 'request'>;
    /** The current server information snapshot, populated after the first successful poll. */
    public info?: ServerInfo;
    /** Whether the server is currently offline (unreachable via the API). */
    public offline = false;

    /** Manager for fetching and caching general server configuration. */
    public players: PlayerManager;
    /** Manager for player caching, joining, and management actions. */
    public commands: CommandManager;
    /** Manager for spawned vehicles cache and events. */
    public vehicles: VehicleManager;
    /** Manager for command execution log events. */
    public commandLogs: CommandLogManager;
    /** Manager for active emergency calls. */
    public emergencyCalls: EmergencyCallManager;
    /** Manager for kill logs. */
    public killLogs: KillLogManager;
    /** Manager for moderator call logs. */
    public modCalls: ModCallManager;
    /** Manager for staff members. */
    public staff: StaffManager;
    /** A collection of in-game custom commands registered for this server only. */
    public readonly inGameCommands = new Collection<string, InGameCommand>();

    /** The pending timer for the next poll. */
    private timer?: NodeJS.Timeout;
    /** Whether the polling loop is active. */
    private polling = false;
    /** Whether the first poll attempt has completed. */
    private _hasPolledOnce = false;
    /** Consecutive poll failures since the last successful poll. */
    private consecutiveFailures = 0;

    /**
     * Creates an instance of Server.
     * @param client - The client that owns this server.
     * @param key - The ER:LC Server API key.
     */
    constructor(client: Client, key: string) {
        this.client = client;
        this.key = key;
        this.id = String(key.split('-')[1]);

        this.rest = {
            request: (method, endpoint, body) => this.client.rest.request(method, endpoint, body, this.key),
        };

        this.players = new PlayerManager(this);
        this.commands = new CommandManager(this);
        this.vehicles = new VehicleManager(this);
        this.commandLogs = new CommandLogManager(this, client.options.maxCacheSize?.commandLog);
        this.emergencyCalls = new EmergencyCallManager(this);
        this.killLogs = new KillLogManager(this, client.options.maxCacheSize?.killLog);
        this.modCalls = new ModCallManager(this, client.options.maxCacheSize?.modCalls);
        this.staff = new StaffManager(this);
    }

    /**
     * Whether the first poll attempt has completed.
     */
    public get hasPolledOnce(): boolean {
        return this._hasPolledOnce;
    }

    /**
     * Sends a request to the ER:LC API on behalf of this server.
     * @param method - The HTTP method to use ('GET' or 'POST').
     * @param endpoint - The API endpoint path.
     * @param body - The optional request body payload.
     * @returns A promise resolving to the API response data.
     */
    public request(method: 'GET' | 'POST', endpoint: string, body?: any): Promise<any> {
        return this.client.rest.request(method, endpoint, body, this.key);
    }

    /**
     * Fetches the latest server data and applies it to the caches and info snapshot.
     * @returns A promise resolving to the raw server data from the API.
     */
    public async fetch(): Promise<RawServerData> {
        const rawServerData: RawServerData = await this.rest.request('GET', FULL_POLL_QUERY);
        this.applyPollData(rawServerData);
        return rawServerData;
    }

    /**
     * Starts the periodic api-polling loop if enabled. Polls never overlap.
     */
    private async beginPolling(pollingRateMs?: number) {
        const rate = this.sanitizePollRate(pollingRateMs);
        const tick = async () => {
            if (!this.polling) return;
            await this.poll();
            if (this.polling) this.timer = setTimeout(tick, rate);
        };
        this.polling = true;
        await this.poll();
        if (this.polling) this.timer = setTimeout(tick, rate);
    }

    /**
     * Applies raw server data to the info snapshot and all manager caches, emitting events.
     */
    private applyPollData(rawServerData: RawServerData) {
        if (this.info?.compare(rawServerData)) {
            // No server info changes.
        } else if (this.info) {
            const oldInfo = new ServerInfo(this, this.info.toJSON());
            this.info._patch(rawServerData);
            this.client.emit(ERLCEvents.serverUpdate, oldInfo, this.info);
        } else {
            this.info = new ServerInfo(this, rawServerData);
            this.client.emit(ERLCEvents.serverCreate, this.info);
        }

        this.client.emit(ERLCEvents.poll, this);
        if (rawServerData.Players) this.players.updateCache(rawServerData.Players);
        if (rawServerData.Vehicles) this.vehicles.updateCache(rawServerData.Vehicles);
        if (rawServerData.CommandLogs) this.commandLogs.updateCache(rawServerData.CommandLogs);
        if (rawServerData.EmergencyCalls) this.emergencyCalls.updateCache(rawServerData.EmergencyCalls);
        if (rawServerData.KillLogs) this.killLogs.updateCache(rawServerData.KillLogs);
        if (rawServerData.ModCalls) this.modCalls.updateCache(rawServerData.ModCalls);
        if (rawServerData.Staff) this.staff.updateCache(rawServerData.Staff);
    }

    private async poll() {
        let success = false;

        try {
            const rawServerData: RawServerData = await this.rest.request('GET', FULL_POLL_QUERY);

            if (this.offline) {
                this.offline = false;
                this.client.emit(ERLCEvents.serverOnline, this);
            }

            this.applyPollData(rawServerData);
            this.consecutiveFailures = 0;
            success = true;
        } catch (err) {
            this.consecutiveFailures++;

            if (err instanceof ServerOfflineError || this.consecutiveFailures >= OFFLINE_FAILURE_THRESHOLD) {
                if (!this.offline) {
                    this.offline = true;
                    this.client.emit(ERLCEvents.serverOffline, this);
                }
                this.clearCaches();
                if (!(err instanceof ServerOfflineError)) {
                    this.client._emitError(err);
                }
            } else {
                this.client._emitError(err);
            }
        } finally {
            if (!this._hasPolledOnce) {
                this._hasPolledOnce = true;
                if (success) this.client.emit(ERLCEvents.serverReady, this);
                this.client._handleServerReady();
            }
        }
    }

    /**
     * Starts polling the ER:LC API with a set poll rate, restarts the poll if one already exists.
     * @param pollRateMs - The new poll rate, minimum 500. Defaults to 5000.
     */
    public startPolling(pollRateMs?: number) {
        this.stopPolling();
        this.beginPolling(pollRateMs);
    }

    /**
     * Stops polling the ER:LC API.
     */
    public stopPolling() {
        this.polling = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    /**
     * Whether this server is currently being polled.
     */
    public get isPolling(): boolean {
        return this.polling;
    }

    private sanitizePollRate(rate?: number) {
        if (typeof rate !== 'number' || rate <= 0) return 5000;
        return Math.max(500, rate);
    }

    /**
     * Clears all volatile caches for this server.
     * Called automatically when the server goes offline.
     */
    public clearCaches() {
        this.players.clear();
        this.vehicles.cache.clear();
        this.emergencyCalls.cache.clear();
        this.staff.admins.clear();
        this.staff.mods.clear();
        this.staff.helpers.clear();
    }

    /**
     * Waits for a specific client event to be emitted for this server.
     * @param event - The event to wait for.
     * @param timeoutMs - The maximum time to wait in milliseconds.
     * @returns A promise resolving to the event arguments.
     */
    public async waitFor<K extends keyof ClientEvents>(
        event: K,
        timeoutMs: number = 0,
    ): Promise<ClientEvents[K]> {
        return new Promise((resolve, reject) => {
            let timeout: NodeJS.Timeout | undefined;

            const listener = (...args: ClientEvents[K]) => {
                const first = args[0] as unknown;
                const firstServer = first instanceof Base ? first.server : first instanceof Server ? first : undefined;
                if (firstServer && firstServer.id !== this.id) return;
                if (timeout) clearTimeout(timeout);
                this.client.off(event, listener as any);
                resolve(args);
            };

            this.client.on(event, listener as any);

            if (timeoutMs > 0) {
                timeout = setTimeout(() => {
                    this.client.off(event, listener as any);
                    reject(new TimeoutError(`Timeout waiting for event: "${event}" after ${timeoutMs}ms`));
                }, timeoutMs);
            }
        });
    }

    /**
     * Creates an authorization link for this server to allow post requests.
     */
    public get authorizationLink() {
        if (!this.client.globalAppId) throw new InvalidGlobalKeyError('No Global App ID.');
        return `https://api.erlc.gg/server-owners/server/${this.id}/authorize/${this.client.globalAppId}`;
    }

    /**
     * Returns a boolean whether the server is currently full.
     */
    public get isFull(): boolean {
        return this.info?.currentPlayers === this.info?.maxPlayers;
    }

    /**
     * Returns a boolean whether the server has a queue.
     */
    public get hasQueue(): boolean {
        return !!this.info?.queue.length;
    }

    /**
     * Registers an in-game custom command scoped to this server.
     * @param cmd - The command to register.
     */
    public registerCommand(cmd: InGameCommand) {
        const command = { ...cmd };
        if (command.name.startsWith(';')) command.name = command.name.slice(1);
        command.name = command.name.toLowerCase();
        if (this.inGameCommands.has(command.name)) {
            throw new CustomCommandError(`Command with name "${command.name}" is already registered for server "${this.id}".`);
        }
        if (command.aliases?.length && command.aliases.length > 0) command.aliases.forEach((alias) => {
            const aliasCmd = { ...command };
            aliasCmd.name = alias;
            aliasCmd.aliases = undefined;
            this.registerCommand(aliasCmd);
        });
        if (!command.name || !command.execute) {
            throw new CustomCommandError('Invalid command: must have a name and an execute function.');
        }
        this.inGameCommands.set(command.name, command);
    }

    /**
     * Unregisters an in-game custom command scoped to this server.
     * @param commandName - The command name to unregister.
     */
    public unregisterCommand(commandName: string) {
        this.inGameCommands.delete(commandName.toLowerCase());
    }

    /**
     * Cleans up the server, stopping polling and clearing all caches.
     */
    public destroy() {
        this.stopPolling();
        this.clearCaches();
        this.info = undefined;
        this.inGameCommands.clear();
    }
}
