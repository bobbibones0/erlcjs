import { EventEmitter } from 'node:events';
import { type ClientOptions, type RawServerData, type InGameCommand } from '../types/index.js';
import { RestManager } from '../rest/manager.js';
import { ServerManager } from '../managers/servermanager.js';
import { PlayerManager } from '../managers/playermanager.js';
import { CommandManager } from '../managers/commandmanager.js';
import { WebhookServer } from '../gateway/webhookserver.js';
import { VehicleManager } from '../managers/vehiclemanager.js';
import { CommandLogManager } from '../managers/commandlogmanager.js';
import { EmergencyCallManager } from '../managers/emergencycallmanager.js';
import { KillLogManager } from '../managers/killlogmanager.js';
import { ModCallManager } from '../managers/modcallmanager.js';
import { Server } from '../structures/server.js';
import { Player } from '../structures/player.js';
import { Vehicle } from '../structures/vehicle.js';
import { CommandLog } from '../structures/commandlog.js';
import { ModCall } from '../structures/modcall.js';
import { EmergencyCall } from '../structures/emergencycall.js';
import type { KillLog } from '../structures/killlog.js';
import type { Staff } from '../structures/staff.js';
import { StaffManager } from '../managers/staffmanager.js';
import { clearInterval } from 'node:timers';
import { CustomCommandError, InvalidGlobalKeyError, TimeoutError } from '../errors/index.js';
import { Collection } from '../util/collection.js';

/**
 * Event names emitted by the ERLCApi Client.
 * @public
 */
export enum ERLCEvents {
    /** Emitted when the first poll is complete and the client is ready. */
    ready = 'READY',
    /** Emitted when a periodic server poll finishes. */
    poll = 'POLL',
    /** Emitted when server details are updated. */
    serverUpdate = 'SERVER_UPDATE',
    /** Emitted when server details are first loaded. */
    serverCreate = 'SERVER_CREATE',
    /** Emitted when a player joins the server. */
    playerJoin = 'PLAYER_JOIN',
    /** Emitted when a player's data (e.g. location, team) updates. */
    playerUpdate = 'PLAYER_UPDATE',
    /** Emitted when a player leaves the server. */
    playerLeave = 'PLAYER_LEAVE',
    /** Emitted when a vehicle is spawned. */
    vehicleAdd = 'VEHICLE_ADD',
    /** Emitted when a vehicle is despawned. */
    vehicleRemove = 'VEHICLE_REMOVE',
    /** Emitted when a vehicle's data updates. */
    vehicleUpdate = 'VEHICLE_UPDATE',
    /** Emitted when a server command is run. */
    command = 'COMMAND',
    /** Emitted when a player requests moderator assistance. */
    modCall = 'MOD_CALL',
    /** Emitted when a mod call is answered by a moderator. */
    modCallAnswered = 'MOD_CALL_ANSWERED',
    /** Emitted when a player is killed. */
    kill = 'KILL',
    /** Emitted when an emergency call is created. */
    emergencyCallAdd = 'EMERGENCY_CALL_ADD',
    /** Emitted when an emergency call is cleared. */
    emergencyCallRemove = 'EMERGENCY_CALL_REMOVE',
    /** Emitted when an emergency call is updated. */
    emergencyCallUpdate = 'EMERGENCY_CALL_UPDATE',
    /** Emitted when a staff member is added */
    staffAdd = 'STAFF_ADD',
    /** Emitted when a staff member is removed */
    staffRemove = 'STAFF_REMOVE',
    /** Emitted when a custom command is executed in-game */
    customCommand = 'CUSTOM_COMMAND',
    /** Emitted when a user enters the webhook in-game */
    webhookProbe = 'WEBHOOK_PROBE',
}

/**
 * Interface mapping client event names to their callback parameters.
 * @public
 */
export interface ClientEvents {
    /** Emitted when the first poll is complete and the client is ready. */
    [ERLCEvents.ready]: [];
    /** Emitted when a periodic server poll finishes. */
    [ERLCEvents.poll]: [server: RawServerData];
    /** Emitted when server details are updated. */
    [ERLCEvents.serverUpdate]: [oldServer: Server | null, newServer: Server];
    /** Emitted when server details are first loaded. */
    [ERLCEvents.serverCreate]: [server: Server];

    /** Emitted when a player joins the server. */
    [ERLCEvents.playerJoin]: [player: Player];
    /** Emitted when a player's data updates. */
    [ERLCEvents.playerUpdate]: [oldPlayer: Player | null, newPlayer: Player];
    /** Emitted when a player leaves the server. */
    [ERLCEvents.playerLeave]: [player: Player];

    /** Emitted when a vehicle is spawned. */
    [ERLCEvents.vehicleAdd]: [vehicle: Vehicle];
    /** Emitted when a vehicle is despawned. */
    [ERLCEvents.vehicleRemove]: [vehicle: Vehicle];
    /** Emitted when a vehicle's data updates. */
    [ERLCEvents.vehicleUpdate]: [oldVehicle: Vehicle | null, newVehicle: Vehicle];

    /** Emitted when a server command is run. */
    [ERLCEvents.command]: [log: CommandLog];
    /** Emitted when a player requests moderator assistance. */
    [ERLCEvents.modCall]: [call: ModCall];
    /** Emitted when a mod call is answered by a moderator. */
    [ERLCEvents.modCallAnswered]: [call: ModCall];
    /** Emitted when a player is killed. */
    [ERLCEvents.kill]: [kill: KillLog];

    /** Emitted when an emergency call is created. */
    [ERLCEvents.emergencyCallAdd]: [call: EmergencyCall];
    /** Emitted when an emergency call is cleared. */
    [ERLCEvents.emergencyCallRemove]: [call: EmergencyCall];
    /** Emitted when an emergency call is updated. */
    [ERLCEvents.emergencyCallUpdate]: [oldCall: EmergencyCall | null, newCall: EmergencyCall];

    /** Emitted when a player is given a staff role. */
    [ERLCEvents.staffAdd]: [staff: Staff, type: 'Admin' | 'Mod' | 'Helper'];
    /** Emitted when a player is removed from a staff role. */
    [ERLCEvents.staffRemove]: [staff: Staff, type: 'Admin' | 'Mod' | 'Helper'];

    /** Emitted when a custom command is executed in-game. */
    [ERLCEvents.customCommand]: [player: Player, command: string, args: string[]];

    /** Emitted when a player enters the webhook in-game. */
    [ERLCEvents.webhookProbe]: [];

    /** Emitted when an error is caught during polling or gateway operations. */
    error: [error: unknown];
}

/**
 * The main client for interacting with the ER:LC API and gateway.
 * @public
 */
export class Client extends EventEmitter<ClientEvents> {
    /** Internal Server ID. */
    public serverId: string;
    /** Global App ID. */
    public globalAppId?: string | number;
    /** REST Manager for sending manual requests to the ER:LC API. */
    public rest: RestManager;
    /** Manager for fetching and caching general server configuration. */
    public server: ServerManager;
    /** Manager for player caching, joining, and management actions. */
    public players: PlayerManager;
    /** Manager for executing server-side console commands. */
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
    /** Webhook Gateway server instance, if enabled. */
    private readonly gateway?: WebhookServer;
    /** The interval for the periodic API polling loop. */
    private pollingInterval?: NodeJS.Timeout;
    /** A collection of registered in-game commands. */
    private inGameCommands = new Collection<string, InGameCommand>();

    /**
     * Creates an instance of Client.
     * @param options - The ClientOptions configuration.
     */
    constructor(public options: ClientOptions) {
        super();
        this.rest = new RestManager(options);
        this.server = new ServerManager(this);
        this.players = new PlayerManager(this);
        this.commands = new CommandManager(this);
        this.vehicles = new VehicleManager(this);
        this.commandLogs = new CommandLogManager(this, options.maxCacheSize?.commandLog);
        this.emergencyCalls = new EmergencyCallManager(this);
        this.killLogs = new KillLogManager(this, options.maxCacheSize?.killLog);
        this.modCalls = new ModCallManager(this, options.maxCacheSize?.modCalls);
        this.staff = new StaffManager(this);
        this.serverId = String(options.serverKey.split('-')[1]);
        this.globalAppId = options.globalAppId;

        if (options.webhook?.enabled) {
            this.gateway = new WebhookServer(this);
            this.gateway.listen();
        }

        if (options.polling === true || (options.polling?.enabled === true && !options.polling.autoStartPolling)) {
            (async () => {
                await this.beginPolling(options.polling === true ? undefined : options.polling?.pollingRateMs);
            })();
        }

        this.emit(ERLCEvents.ready);
    }

    /**
     * Starts the periodic api-polling loop if enabled.
     */
    private async beginPolling(pollingRateMs?: number) {
        await this.poll();
        this.pollingInterval = setInterval(async () => {
            await this.poll();
        }, this.sanitizePollRate(pollingRateMs));
    }

    private async poll() {
        try {
            const server = await this.server.fetch();
            this.emit(ERLCEvents.poll, server);
            if (server.Players) this.players.updateCache(server.Players);
            if (server.Vehicles) this.vehicles.updateCache(server.Vehicles);
            if (server.CommandLogs) this.commandLogs.updateCache(server.CommandLogs);
            if (server.EmergencyCalls) this.emergencyCalls.updateCache(server.EmergencyCalls);
            if (server.KillLogs) this.killLogs.updateCache(server.KillLogs);
            if (server.ModCalls) this.modCalls.updateCache(server.ModCalls);
            if (server.Staff) this.staff.updateCache(server.Staff);
        } catch (err) {
            this.emit('error', err);
        }
    }

    /**
     * Starts polling the ER:LC API with a set poll rate, restarts the poll if it is already exists.
     * @param pollRateMs - The new poll rate, minimum 500.
     */
    public startPolling(pollRateMs: number) {
        this.stopPolling();
        this.beginPolling(pollRateMs);
    }

    /**
     * Stops polling the ER:LC API.
     */
    public stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = undefined;
        }
    }

    private sanitizePollRate(rate?: number) {
        if (typeof rate !== 'number' || rate <= 0) return 5000;
        return Math.max(500, rate);
    }

    /**
     * Waits for a specific event to be emitted.
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
                if (timeout) clearTimeout(timeout);
                resolve(args);
            };

            this.once(event, listener as any);

            if (timeoutMs > 0) {
                timeout = setTimeout(() => {
                    this.off(event, listener as any);
                    reject(new TimeoutError(`Timeout waiting for event: "${event}" after ${timeoutMs}ms`));
                }, timeoutMs);
            }
        });
    }

    /**
     * Destroys the client, cleaning up resources and stopping any ongoing operations.
     */
    public destroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        if (this.gateway) {
            this.gateway.close();
        }
    }

    /**
     * Registers an in-game custom command.
     * @param command - The command to register.
     */
    public registerCommand(cmd: InGameCommand) {
        const command = { ...cmd };
        if (command.name.startsWith(';')) command.name = command.name.slice(1);
        command.name = command.name.toLowerCase();
        if (this.inGameCommands.has(command.name)) {
            throw new CustomCommandError(`Command with name "${command.name}" is already registered.`);
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
        if (this.inGameCommands.size === 0) this.handleCustomCommands();
        this.inGameCommands.set(command.name, command);
    }

    /**
     * Unregisters an in-game custom command.
     * @param commandName - The command name to unregister.
     */
    public unregisterCommand(commandName: string) {
        this.inGameCommands.delete(commandName.toLowerCase());
    }

    /**
     * Creates an authorization link for this server to allow post requests.
     */
    public get authorizationLink() {
        if (!this.globalAppId) throw new InvalidGlobalKeyError('No Global App ID.')
        return `https://api.erlc.gg/server-owners/server/${this.serverId}/authorize/${this.globalAppId}`
    }

    private handleCustomCommands() {
        this.on(ERLCEvents.customCommand, (player, commandName, args) => {
            const command = this.inGameCommands.get(commandName.toLowerCase());
            if (!command) return;
            try {
                if (command.permission?.length && command.permission.length > 0 && !command.permission.includes(player.permission)) return;
                command.execute({ player: player, args });
            } catch (err) {
                this.emit('error', err);
            }
        });
    }
}
