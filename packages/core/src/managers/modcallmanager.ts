import type { Server } from '../client/server.js';
import { ERLCEvents } from '../client/events.js';
import { Collection } from '../util/collection.js';
import { ModCall } from '../structures/modcall.js';
import { type RawModCall, type RawServerData } from '../types/index.js';

/**
 * Manager responsible for fetching, caching, and updating ModCall structures.
 * @public
 */
export class ModCallManager {
    /**
     * Collection cache of logged moderator calls, keyed by a composite `Caller:Timestamp` key.
     */
    public cache = new Collection<string, ModCall>();

    /**
     * Creates an instance of ModCallManager.
     * @param server - The server this manager belongs to.
     * @param maxCacheSize - The maximum number of kill logs to hold in cache.
     */
    constructor(private readonly server: Server, private readonly maxCacheSize?: number) {}

    /**
     * Fetches all moderator calls from the game server.
     * Updates the moderator call cache.
     * @returns A promise resolving to a Collection of ModCalls.
     */
    public async fetchAll(): Promise<Collection<string, ModCall>> {
        const rawServer: RawServerData = await this.server.rest.request(
            'GET',
            '/v2/server?ModCalls=true',
        );
        const rawModCalls: RawModCall[] = rawServer.ModCalls ?? [];

        return this.updateCache(rawModCalls);
    }

    /**
     * Re-synchronizes the cache with the raw moderator calls.
     * Emits a modCall event for new calls.
     * @param rawModCalls - Raw moderator calls payload.
     * @returns The updated ModCall cache Collection.
     */
    public updateCache(rawModCalls: RawModCall[]) {
        for (const rawData of rawModCalls) {
            const key = `${rawData.Caller}:${rawData.Timestamp}`;
            const cachedCall = this.cache.get(key);

            if (!cachedCall) {
                const newCall = new ModCall(this.server, rawData);
                this.cache.set(key, newCall);
                this.server.client.emit(ERLCEvents.modCall, newCall);
                if (newCall.moderator) {
                    this.server.client.emit(ERLCEvents.modCallAnswered, newCall);
                }
            } else {
                if (!cachedCall.moderator && rawData.Moderator) {
                    cachedCall._patch(rawData);
                    this.server.client.emit(ERLCEvents.modCallAnswered, cachedCall);
                }
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
