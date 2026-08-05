import type { Server } from '../client/server.js';
import { ERLCEvents } from '../client/events.js';
import { Collection } from '../util/collection.js';
import { Staff } from '../structures/staff.js';
import type { RawServerData, RawStaffData } from '../types/index.js';

/**
 * Manager responsible for fetching, caching, and updating Staff structures.
 * @public
 */
export class StaffManager {
    /**
     * Collection cache of admins, keyed by their userId.
     */
    public admins = new Collection<number, Staff>();

    /**
     * Collection cache of mods, keyed by their userId.
     */
    public mods = new Collection<number, Staff>();

    /**
     * Collection cache of helpers, keyed by their userId.
     */
    public helpers = new Collection<number, Staff>();

    /**
     * Creates an instance of StaffManager.
     * @param server - The server this manager belongs to.
     */
    constructor(private readonly server: Server) {}

    /**
     * Fetches all staff members.
     * Updates the staff cache.
     * @returns A promise resolving to a Collection of active Vehicles.
     */
    public async fetchAll(): Promise<Collection<string, Collection<number, Staff>>> {
        const rawServer: RawServerData = await this.server.rest.request(
            'GET',
            '/v2/server?Staff=true',
        );
        const rawVehicles: RawStaffData = rawServer.Staff!;

        return this.updateCache(rawVehicles);
    }

    /**
     * Re-synchronizes the cache with the raw staff list from the API.
     * Emits staffAdd and staffRemove events.
     * @param rawStaff - Raw staff list payload.
     * @returns The updated staff cache Collection.
     */
    public updateCache(rawStaff: RawStaffData) {
        this._updateCache(rawStaff.Admins, 'Admin');
        this._updateCache(rawStaff.Mods, 'Mod');
        this._updateCache(rawStaff.Helpers, 'Helper');

        return new Collection<string, Collection<number, Staff>>()
            .set('Admins', this.admins)
            .set('Mods', this.mods)
            .set('Helpers', this.helpers);
    }

    private _updateCache(data: Record<string, string>, type: 'Admin' | 'Mod' | 'Helper') {
        const activeUserIds = new Set<number>();
        let cache: Collection<number, Staff>;
        if (type === 'Admin') cache = this.admins;
        else if (type === 'Mod') cache = this.mods;
        else cache = this.helpers;

        for (const [userId, username] of Object.entries(data)) {
            activeUserIds.add(Number(userId));
            const cachedUser = cache.get(Number(userId));

            if (cachedUser) continue;
            const newStaff = new Staff(this.server, userId, username);
            cache.set(Number(userId), newStaff);
            this.server.client.emit(ERLCEvents.staffAdd, newStaff, type);
        }

        for (const cachedId of cache.keys()) {
            if (!activeUserIds.has(cachedId)) {
                this.server.client.emit(ERLCEvents.staffRemove, cache.get(cachedId)!, type);
                cache.delete(cachedId);
            }
        }
    }
}
