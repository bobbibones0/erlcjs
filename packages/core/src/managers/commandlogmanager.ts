import type { Server } from '../client/server.js';
import { ERLCEvents } from '../client/events.js';
import { CommandLog } from '../structures/commandlog.js';
import { type RawCommandLog, type RawServerData } from '../types/index.js';
import { Collection } from '../util/collection.js';

/**
 * Manager responsible for fetching, caching, and updating CommandLog structures.
 * @public
 */
export class CommandLogManager {
    /**
     * Collection cache of logged commands, keyed by a composite `Player:Timestamp` key.
     */
    public cache = new Collection<string, CommandLog>();

    /**
     * Creates an instance of CommandLogManager.
     * @param server - The server this manager belongs to.
     * @param maxCacheSize - The maximum number of command logs to hold in cache.
     */
    constructor(private readonly server: Server, private readonly maxCacheSize?: number) {}

    /**
     * Fetches all command logs from the game server.
     * Updates the command log cache.
     * @returns A promise resolving to a Collection of CommandLogs.
     */
    public async fetchAll(): Promise<Collection<string, CommandLog>> {
        const rawServer: RawServerData = await this.server.rest.request(
            'GET',
            '/v2/server?CommandLogs=true',
        );
        const rawCommands: RawCommandLog[] = rawServer.CommandLogs ?? [];

        return this.updateCache(rawCommands);
    }

    /**
     * Re-synchronizes the cache with the raw command logs.
     * Emits command event for new logs.
     * @param rawCommands - Raw command logs payload.
     * @returns The updated CommandLog cache Collection.
     */
    public updateCache(rawCommands: RawCommandLog[]) {
        for (const rawData of rawCommands) {
            const key = `${rawData.Player}:${rawData.Timestamp}`;
            const cachedPlayer = this.cache.get(key);

            if (!cachedPlayer) {
                const newCommand = new CommandLog(this.server, rawData);
                this.cache.set(key, newCommand);
                this.server.client.emit(ERLCEvents.command, newCommand);
            }
        }

        if (this.maxCacheSize && this.maxCacheSize > 0) {
            while (this.cache.size > this.maxCacheSize) {
                const oldestKey = this.cache.keys().next().value;
                if (oldestKey === undefined) break;
                this.cache.delete(oldestKey);
            }
        }

        return this.cache;
    }
}
