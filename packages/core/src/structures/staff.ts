import type { Server } from '../client/server.js';
import { Base } from './base.js';
import { Player } from './player.js';

/**
 * Represents a staff member.
 * @public
 */
export class Staff extends Base {
    /**
     * The staff members user id.
     */
    id!: number;
    /**
     * The staff members username.
     */
    username!: string;
    /**
     * Whether or not the staff member is online.
     */
    online!: boolean;
    /**
     * The player instance of the staff member if they are online.
     */
    player?: Player;

    /**
     * Creates an instance of Staff.
     * @param server - The server the staff member belongs to.
     * @param userId - The user id.
     * @param username - The username.
     */
    constructor(server: Server, userId: string, username: string) {
        super(server);
        this._patch(userId, username);
    }

    /**
     * Patches the Staff structure with new raw data.
     * @param userId - The user id.
     * @param username - The username.
     * @returns This staff instance.
     */
    public _patch(userId: string, username: string): this {
        this.id = Number(userId);
        this.username = username;
        this.online = this.server.players.cache.has(this.id);
        this.player = undefined;
        if (this.online === true) this.player = this.server.players.cache.get(this.id);
        return this;
    }
}
