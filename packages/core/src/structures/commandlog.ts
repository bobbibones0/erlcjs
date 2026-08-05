import type { Server } from '../client/server.js';
import { Base } from './base.js';
import type { RawCommandLog } from '../types/index.js';
import { Player } from './player.js';

/**
 * Represents a logged command execution event.
 * @public
 */
export class CommandLog extends Base {
    /**
     * The player instance representing who ran the command.
     */
    player!: Player;
    /**
     * The UserId of the player who ran the command.
     */
    playerId!: number;
    /**
     * The username of the player who ran the command.
     */
    playerUsername!: string;
    /**
     * Unix timestamp of when the command was run.
     */
    timestamp!: number;
    /**
     * The full command string executed.
     */
    command!: string;

    /**
     * Creates an instance of CommandLog.
     * @param server - The server the command was run in.
     * @param data - The raw command log data to initialize.
     */
    constructor(server: Server, data: RawCommandLog) {
        super(server);
        this._patch(data);
    }

    /**
     * Patches the CommandLog structure with new raw data.
     * @param data - The new raw command log data.
     * @returns This command log instance.
     */
    public _patch(data: RawCommandLog): this {
        const splitPlayer = data.Player.split(':');
        this.playerId = Number(splitPlayer[1]);
        this.playerUsername = splitPlayer[0]!;
        this.player = this.server.players.cache.get(this.playerId)!;
        this.command = data.Command;
        this.timestamp = data.Timestamp;
        return this;
    }

    /**
     * Converts this CommandLog instance to raw JSON representation.
     * @returns The raw command log data.
     */
    public toJSON(): RawCommandLog {
        return {
            Player: `${this.playerUsername}:${this.playerId}`,
            Timestamp: this.timestamp,
            Command: this.command,
        };
    }
}
