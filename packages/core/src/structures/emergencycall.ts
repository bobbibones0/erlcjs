import type { Server } from '../client/server.js';
import { Base } from './base.js';
import type { RawEmergencyCall } from '../types/index.js';
import { Player } from './player.js';

/**
 * Represents an active emergency call in the ER:LC server.
 * @public
 */
export class EmergencyCall extends Base {
    /**
     * The Player instance representing the caller.
     */
    caller!: Player;
    /**
     * The UserId of the player who made the emergency call.
     */
    callerId!: number;
    /**
     * The team associated with the emergency call (e.g., "Police", "Fire").
     */
    team!: string;
    /**
     * Array of UserIds of responders assigned to this call.
     */
    playerIds!: number[];
    /**
     * Array of Player instances of active responders assigned to this call.
     */
    players!: Player[];
    /**
     * The game position coordinates [x, y] of the call.
     */
    position!: number[];
    /**
     * Unix timestamp of when the call was started.
     */
    startedAt!: number;
    /**
     * The unique call number.
     */
    callNumber!: number;
    /**
     * The description text of the emergency call.
     */
    description!: string;
    /**
     * Positional description of where the call was made.
     */
    positionDescriptor!: string;

    /**
     * Creates an instance of EmergencyCall.
     * @param server - The server the call belongs to.
     * @param data - The raw emergency call data to initialize.
     */
    constructor(server: Server, data: RawEmergencyCall) {
        super(server);
        this._patch(data);
    }

    /**
     * Patches the EmergencyCall structure with new raw data.
     * @param data - The new raw emergency call data.
     * @returns This emergency call instance.
     */
    public _patch(data: RawEmergencyCall): this {
        this.callerId = data.Caller;
        this.caller = this.server.players.cache.get(this.callerId)!;
        this.team = data.Team;
        this.playerIds = data.Players;
        this.players = [];
        for (const playerId of data.Players) {
            const player = this.server.players.cache.get(playerId);
            if (player) this.players.push(player);
        }
        this.position = data.Position;
        this.startedAt = data.StartedAt;
        this.callNumber = data.CallNumber;
        this.description = data.Description;
        this.positionDescriptor = data.PositionDescriptor;
        return this;
    }

    /**
     * Converts this EmergencyCall instance to raw JSON representation.
     * @returns The raw emergency call data.
     */
    public toJSON(): RawEmergencyCall {
        return {
            Caller: this.callerId,
            Team: this.team,
            Players: this.playerIds,
            Position: this.position,
            StartedAt: this.startedAt,
            CallNumber: this.callNumber,
            Description: this.description,
            PositionDescriptor: this.positionDescriptor,
        };
    }
}
