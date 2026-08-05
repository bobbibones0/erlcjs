import { Base } from './base.js';
import type { Server } from '../client/server.js';
import type { RawServerData } from '../types/index.js';

/**
 * Represents the current configuration/state snapshot of an ER:LC game server.
 * @public
 */
export class ServerInfo extends Base {
    /**
     * The name of the server.
     */
    name!: string;
    /**
     * The UserId of the server owner.
     */
    ownerId!: number;
    /**
     * Array of UserIds of server co-owners.
     */
    coOwnerIds!: number[];
    /**
     * The current number of players connected to the server.
     */
    currentPlayers!: number;
    /**
     * The maximum number of players allowed in the server.
     */
    maxPlayers!: number;
    /**
     * The join key of the server.
     */
    joinKey!: string;
    /**
     * Account verification requirements for joining.
     */
    accVerifiedReq!: 'Disabled' | 'Email' | 'Phone/ID';
    /**
     * Whether team balance enforcement is enabled.
     */
    teamBalance!: boolean;
    /**
     * The queue of players waiting to join the server.
     */
    queue!: number[];

    /**
     * Creates an instance of ServerInfo.
     * @param server - The server this information belongs to.
     * @param data - The raw server data to initialize.
     */
    constructor(server: Server, data: RawServerData) {
        super(server);
        this._patch(data);
    }

    /**
     * Patches the ServerInfo instance with new raw data.
     * @param data - The new raw server data.
     * @returns This ServerInfo instance.
     */
    public _patch(data: RawServerData): this {
        this.name = data.Name;
        this.ownerId = data.OwnerId;
        this.coOwnerIds = data.CoOwnerIds;
        this.currentPlayers = data.CurrentPlayers;
        this.maxPlayers = data.MaxPlayers;
        this.joinKey = data.JoinKey;
        this.accVerifiedReq = data.AccVerifiedReq;
        this.teamBalance = data.TeamBalance;
        this.queue = data.Queue ?? [];
        return this;
    }

    /**
     * Compares the current server data with another raw data payload to check if it's identical.
     * @param data - The raw server data to compare against.
     * @returns True if the properties are identical, false otherwise.
     */
    public compare(data: RawServerData): boolean {
        return (
            this.name === data.Name &&
            this.ownerId === data.OwnerId &&
            JSON.stringify(this.coOwnerIds) === JSON.stringify(data.CoOwnerIds) &&
            this.currentPlayers === data.CurrentPlayers &&
            this.maxPlayers === data.MaxPlayers &&
            this.joinKey === data.JoinKey &&
            this.accVerifiedReq === data.AccVerifiedReq &&
            this.teamBalance === data.TeamBalance &&
            JSON.stringify(this.queue) === JSON.stringify(data.Queue)
        );
    }

    /**
     * Converts this ServerInfo instance back to its raw JSON structure.
     * @returns The raw server data.
     */
    public toJSON(): RawServerData {
        return {
            Name: this.name,
            OwnerId: this.ownerId,
            CoOwnerIds: this.coOwnerIds,
            CurrentPlayers: this.currentPlayers,
            MaxPlayers: this.maxPlayers,
            JoinKey: this.joinKey,
            AccVerifiedReq: this.accVerifiedReq,
            TeamBalance: this.teamBalance,
            Queue: this.queue,
        };
    }
}
