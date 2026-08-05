import type { Server } from '../client/server.js';
import { Base } from './base.js';
import type { RawVehicle } from '../types/index.js';
import { Player } from './player.js';

/**
 * Represents a spawned vehicle in the ER:LC server.
 * @public
 */
export class Vehicle extends Base {
    /**
     * The name/model of the vehicle.
     */
    name!: string;
    /**
     * The UserId of the vehicle owner.
     */
    ownerId!: number;
    /**
     * The username of the vehicle owner.
     */
    ownerUsername!: string;
    /**
     * The Player instance representing the owner, if they are currently online.
     */
    owner!: Player;
    /**
     * The license plate text of the vehicle.
     */
    plate!: string;
    /**
     * The custom texture identifier, if any.
     */
    texture?: string;
    /**
     * The hexadecimal color code of the vehicle.
     */
    colorHex!: string;
    /**
     * The user-friendly color name of the vehicle.
     */
    colorName!: string;

    /**
     * Creates an instance of Vehicle.
     * @param server - The server the vehicle is in.
     * @param data - The raw vehicle data to initialize.
     */
    constructor(server: Server, data: RawVehicle) {
        super(server);
        this._patch(data);
    }

    /**
     * Patches the Vehicle structure with new raw data.
     * @param data - The new raw vehicle data.
     * @returns This vehicle instance.
     */
    public _patch(data: RawVehicle): this {
        this.name = data.Name;
        this.ownerUsername = data.Owner;
        this.ownerId = this.server.players.getIdFromName(this.ownerUsername) ?? 0;
        this.owner = this.server.players.cache.get(this.ownerId)!;
        this.plate = data.Plate;
        this.texture = data.Texture;
        this.colorHex = data.ColorHex;
        this.colorName = data.ColorName;
        return this;
    }

    /**
     * Converts this Vehicle instance to raw JSON representation.
     * @returns The raw vehicle data.
     */
    public toJSON(): RawVehicle {
        return {
            Name: this.name,
            Owner: this.ownerUsername,
            Plate: this.plate,
            ColorHex: this.colorHex,
            Texture: this.texture,
            ColorName: this.colorName,
        };
    }
}
