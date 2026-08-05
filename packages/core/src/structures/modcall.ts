import type { Server } from '../client/server.js';
import { Base } from './base.js';
import type { RawModCall } from '../types/index.js';
import { Player } from './player.js';

/**
 * Represents a request for moderation help (moderator call) in the ER:LC server.
 * @public
 */
export class ModCall extends Base {
    /**
     * The Player instance representing the caller.
     */
    caller!: Player;
    /**
     * The UserId of the player who made the moderator call.
     */
    callerId!: number;
    /**
     * The Roblox username of the caller.
     */
    callerUsername!: string;
    /**
     * Unix timestamp of the moderator call.
     */
    timestamp!: number;
    /**
     * The Player instance representing the moderator who responded, if any.
     */
    moderator?: Player;
    /**
     * The UserId of the moderator who responded, if any.
     */
    moderatorId?: number;
    /**
     * The Roblox username of the moderator who responded, if any.
     */
    moderatorUsername?: string;

    /**
     * Creates an instance of ModCall.
     * @param server - The server the mod call was made in.
     * @param data - The raw moderator call data.
     */
    constructor(server: Server, data: RawModCall) {
        super(server);
        this._patch(data);
    }

    /**
     * Patches the ModCall structure with new raw data.
     * @param data - The new raw moderator call data.
     * @returns This moderator call instance.
     */
    public _patch(data: RawModCall): this {
        const splitCaller = data.Caller.split(':');
        this.callerId = Number(splitCaller[1]);
        this.callerUsername = splitCaller[0]!;
        this.caller = this.server.players.cache.get(this.callerId)!;
        if (data.Moderator) {
            const splitModerator = data.Moderator.split(':');
            this.moderatorId = Number(splitModerator[1]);
            this.moderatorUsername = splitModerator[0]!;
            this.moderator = this.server.players.cache.get(this.moderatorId)!;
        }
        this.timestamp = data.Timestamp;
        return this;
    }

    /**
     * Converts this ModCall instance to raw JSON representation.
     * @returns The raw moderator call data.
     */
    public toJSON(): RawModCall {
        if (this.moderatorId)
            return {
                Caller: `${this.callerUsername}:${this.callerId}`,
                Timestamp: this.timestamp,
                Moderator: `${this.moderatorUsername}:${this.moderatorId}`,
            };
        return {
            Caller: `${this.callerUsername}:${this.callerId}`,
            Timestamp: this.timestamp,
        };
    }
}
