import type { Server } from '../client/server.js';
import { Base } from './base.js';
import type { RawKillLog } from '../types/index.js';
import { Player } from './player.js';

/**
 * Represents a log of a player death event (kill).
 * @public
 */
export class KillLog extends Base {
    /**
     * The Player instance representing the player who was killed.
     */
    killed!: Player;
    /**
     * The UserId of the player who was killed.
     */
    killedId!: number;
    /**
     * The Roblox username of the player who was killed.
     */
    killedUsername!: string;
    /**
     * The Player instance representing the player who did the killing.
     */
    killer!: Player;
    /**
     * The UserId of the player who did the killing.
     */
    killerId!: number;
    /**
     * The Roblox username of the player who did the killing.
     */
    killerUsername!: string;
    /**
     * Unix timestamp of when the kill occurred.
     */
    timestamp!: number;

    /**
     * Creates an instance of KillLog.
     * @param server - The server the kill occurred in.
     * @param data - The raw kill log data.
     */
    constructor(server: Server, data: RawKillLog) {
        super(server);
        this._patch(data);
    }

    /**
     * Patches the KillLog structure with new raw data.
     * @param data - The new raw kill log data.
     * @returns This kill log instance.
     */
    public _patch(data: RawKillLog): this {
        const splitKilled = data.Killed.split(':');
        const splitKiller = data.Killer.split(':');
        this.killedId = Number(splitKilled[1]);
        this.killedUsername = splitKilled[0]!;
        this.killed = this.server.players.cache.get(this.killedId)!;
        this.killerId = Number(splitKiller[1]);
        this.killerUsername = splitKiller[0]!;
        this.killer = this.server.players.cache.get(this.killerId)!;
        this.timestamp = data.Timestamp;
        return this;
    }

    /**
     * Converts this KillLog instance to raw JSON representation.
     * @returns The raw kill log data.
     */
    public toJSON(): RawKillLog {
        return {
            Killed: `${this.killedUsername}:${this.killedId}`,
            Killer: `${this.killerUsername}:${this.killerId}`,
            Timestamp: this.timestamp,
        };
    }
}
