import { EventEmitter } from 'node:events';
import { type ClientOptions, type InGameCommand } from '../types/index.js';
import { RestManager } from '../rest/manager.js';
import { ServerManager } from '../managers/servermanager.js';
import { Server } from './server.js';
import { ERLCEvents, type ClientEvents } from './events.js';
import { WebhookServer } from '../gateway/webhookserver.js';
import { Collection } from '../util/collection.js';
import { CustomCommandError, TimeoutError } from '../errors/index.js';

/**
 * The main client for interacting with the ER:LC API and gateway.
 * Manages multiple ER:LC game servers, each with its own caches and polling loop.
 * @public
 */
export class Client extends EventEmitter<ClientEvents> {
    /** Global App ID. */
    public globalAppId?: string | number;
    /** REST Manager for sending manual requests to the ER:LC API, shared across all servers. */
    public rest: RestManager;
    /** Collection of the game servers managed by this client, keyed by server ID. */
    public servers: ServerManager;
    /** Webhook Gateway server instance, if enabled. */
    private readonly gateway?: WebhookServer;
    /** A collection of globally registered in-game commands. */
    private inGameCommands = new Collection<string, InGameCommand>();
    private readyEmitted = false;

    /**
     * Creates an instance of Client.
     * @param options - The ClientOptions configuration.
     */
    constructor(public options: ClientOptions) {
        super();

        this.rest = new RestManager(options.globalKey);
        this.servers = new ServerManager(this);
        this.globalAppId = options.globalAppId;

        for (const key of options.servers) {
            this.servers.add(new Server(this, key));
        }

        if (options.webhook?.enabled) {
            this.gateway = new WebhookServer(this);
            this.gateway.listen();
        }

        this.handleCustomCommands();

        const polling = options.polling;
        const autoStart =
            polling === true ||
            (typeof polling === 'object' && polling.enabled === true && polling.autoStartPolling !== false);

        if (autoStart) {
            const rate = polling === true ? undefined : polling.pollingRateMs;
            for (const server of this.servers.values()) {
                server.startPolling(rate);
            }
        }

        if (!autoStart || this.servers.size === 0) {
            this.readyEmitted = true;
            this.emit(ERLCEvents.ready);
        }
    }

    /**
     * Emits the error event if there are listeners, otherwise logs it to avoid
     * an uncaught `error` emission crashing the process.
     * @internal
     */
    public _emitError(err: unknown) {
        if (this.listenerCount('error') > 0) {
            this.emit('error', err);
        } else {
            console.error('[erlcjs] Unhandled error:', err);
        }
    }

    /**
     * Whether any managed server is currently being polled.
     */
    public get isPolling(): boolean {
        return Array.from(this.servers.values()).some((server) => server.isPolling);
    }

    /**
     * Adds a server to the client at runtime, returning the created server.
     * Polling is started automatically if the client options enable auto-start polling.
     * @param key - The ER:LC Server API key.
     * @returns The created Server.
     */
    public addServer(key: string): Server {
        const server = new Server(this, key);
        this.servers.add(server);

        const polling = this.options.polling;
        const autoStart =
            polling === true ||
            (typeof polling === 'object' && polling.enabled === true && polling.autoStartPolling !== false);
        if (autoStart) {
            server.startPolling(polling === true ? undefined : polling.pollingRateMs);
        }

        return server;
    }

    /**
     * Removes and destroys a server by its ID, stopping its polling and clearing its caches.
     * @param id - The server ID.
     * @returns True if a server was removed.
     */
    public removeServer(id: string | number): boolean {
        const server = this.servers.resolve(id);
        if (!server) return false;
        server.destroy();
        return this.servers.delete(server.id);
    }

    /**
     * Resolves once the client is ready (after every server's first poll), or immediately
     * if it is already ready.
     * @returns This client.
     */
    public async onceReady(): Promise<this> {
        if (this.readyEmitted) return this;
        return new Promise((resolve) => this.once(ERLCEvents.ready, () => resolve(this)));
    }

    /**
     * Called by a Server after its first poll attempt completes.
     * Emits the ready event once every configured server has polled for the first time.
     * @internal
     */
    public _handleServerReady() {
        if (this.readyEmitted) return;
        if (this.servers.size > 0 && Array.from(this.servers.values()).every((server) => server.hasPolledOnce)) {
            this.readyEmitted = true;
            this.emit(ERLCEvents.ready);
        }
    }

    /**
     * Starts polling the ER:LC API for all servers, restarting any existing polls.
     * @param pollRateMs - The new poll rate, minimum 500.
     */
    public startPolling(pollRateMs?: number) {
        for (const server of this.servers.values()) {
            server.startPolling(pollRateMs);
        }
    }

    /**
     * Stops polling the ER:LC API for all servers.
     */
    public stopPolling() {
        for (const server of this.servers.values()) {
            server.stopPolling();
        }
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
        this.servers.clearServers();
        if (this.gateway) {
            this.gateway.close();
        }
        this.removeAllListeners();
    }

    /**
     * Registers an in-game custom command globally, available on all managed servers.
     * @param cmd - The command to register.
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
        this.inGameCommands.set(command.name, command);
    }

    /**
     * Unregisters a globally registered in-game custom command.
     * @param commandName - The command name to unregister.
     */
    public unregisterCommand(commandName: string) {
        this.inGameCommands.delete(commandName.toLowerCase());
    }

    private handleCustomCommands() {
        this.on(ERLCEvents.customCommand, (player, commandName, args) => {
            const name = commandName.toLowerCase();
            const command = player.server.inGameCommands.get(name) ?? this.inGameCommands.get(name);
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
