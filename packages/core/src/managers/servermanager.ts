import { Client, ERLCEvents } from '../client/client.js';
import type { RawServerData } from '../types/index.js';
import { Server } from '../structures/server.js';

/**
 * Manager responsible for fetching and caching the ER:LC Server details.
 * @public
 */
export class ServerManager {
    /**
     * Cached Server structure instance, if fetched.
     */
    public cache?: Server;

    /**
     * Creates an instance of ServerManager.
     * @param client - The erlcjs client.
     */
    constructor(private readonly client: Client) {}

    /**
     * Fetches current server information from the API.
     * Patches the cache and emits event updates if there are changes.
     * @returns A promise resolving to the raw server data from the API.
     */
    public async fetch() {
        const rawServerData: RawServerData = await this.client.rest.request(
            'GET',
            '/v2/server?Players=true&Vehicles=true&Staff=true&JoinLogs=true&Queue=true&KillLogs=true&CommandLogs=true&ModCalls=true&EmergencyCalls=true',
        );

        if (this.cache?.compare(rawServerData)) return rawServerData;
        if (this.cache) {
            const oldCache = new Server(this.client, this.cache.toJSON());
            this.cache._patch(rawServerData);
            this.client.emit(ERLCEvents.serverUpdate, oldCache, this.cache);
        } else {
            this.cache = new Server(this.client, rawServerData);
            this.client.emit(ERLCEvents.serverCreate, this.cache);
        }

        return rawServerData;
    }

    /**
     * Returns a boolean whether the server is currently full.
     */
    public get isFull(): boolean {
        return this.cache?.currentPlayers === this.cache?.maxPlayers;
    }

    /**
     * Returns a boolean whether the server has a queue.
     */
    public get hasQueue(): boolean {
        return (this.cache?.queue.length && this.cache.queue.length > 0) as boolean;
    }
}
