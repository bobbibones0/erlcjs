import { Base } from './base.js';
import type { Server } from '../client/server.js';
import { type RawPlayerData } from '../types/index.js';

/**
 * Represents a player in the ER:LC server.
 * @public
 */
export class Player extends Base {
    /**
     * The unique UserId of the player.
     */
    public id!: number;
    /**
     * The Roblox username of the player.
     */
    public username!: string;
    /**
     * The in-game team name the player is currently on.
     */
    public team!: string;
    /**
     * The player's callsign, if assigned.
     */
    public callsign?: string;
    /**
     * The current location coordinates and address of the player.
     */
    public location!: {
        /** The X coordinate in-game. */
        x: number;
        /** The Z coordinate in-game. */
        z: number;
        /** The postal code of the street. */
        postalCode: string;
        /** The name of the street. */
        streetName: string;
        /** The building number. */
        buildingNumber: string;
    };
    /**
     * The player's server permission role.
     */
    public permission!: 'Normal' | 'Server Administrator' | 'Server Owner' | 'Server Moderator';
    /**
     * The player's current wanted star level.
     */
    public wantedLevel!: number;

    /**
     * Creates an instance of Player.
     * @param server - The server the player is in.
     * @param data - The raw player data to initialize.
     */
    constructor(server: Server, data: RawPlayerData) {
        super(server);
        this._patch(data);
    }

    /**
     * Patches/updates the player structure with new raw data.
     * @param data - The new raw player data.
     * @returns This player instance.
     */
    public _patch(data: RawPlayerData): this {
        const splitPlayer = data.Player.split(':');
        this.id = Number(splitPlayer[1]);
        this.username = splitPlayer[0]!;
        this.team = data.Team;
        this.callsign = data.Callsign;
        this.location = {
            x: data.Location.LocationX,
            z: data.Location.LocationZ,
            postalCode: data.Location.PostalCode,
            streetName: data.Location.StreetName,
            buildingNumber: data.Location.BuildingNumber,
        };
        this.permission = data.Permission ?? 'Normal';
        this.wantedLevel = data.WantedStars ?? 0;
        return this;
    }

    /**
     * Kicks the player from the game server.
     * @param reason - The reason for kicking the player. Defaults to "Kicked by API".
     * @returns A promise that resolves when the kick command is sent.
     */
    public async kick(reason: string = 'Kicked by API'): Promise<void> {
        await this.server.commands.execute(`:kick ${this.username} ${reason}`);
    }

    /**
     * Bans the player from the game server.
     * @param reason - The reason for banning the player. Defaults to "Banned by API".
     * @returns A promise that resolves when the ban command is sent.
     */
    public async ban(reason: string = 'Banned by API'): Promise<void> {
        await this.server.commands.execute(`:ban ${this.username} ${reason}`);
    }

    /**
     * Jails the player in the game server.
     * @returns A promise that resolves when the jail command is sent.
     */
    public async jail(): Promise<void> {
        await this.server.commands.execute(`:jail ${this.username}`);
    }

    /**
     * Heals the player in the game server.
     * @returns A promise that resolves when the heal command is sent.
     */
    public async heal(): Promise<void> {
        await this.server.commands.execute(`:heal ${this.username}`);
    }

    /**
     * Kills the player in-game.
     * @returns A promise that resolves when the kill command is sent.
     */
    public async kill(): Promise<void> {
        await this.server.commands.execute(`:kill ${this.username}`);
    }

    /**
     * Makes the player wanted in-game.
     * @returns A promise that resolves when the wanted command is sent.
     */
    public async wanted(): Promise<void> {
        await this.server.commands.execute(`:wanted ${this.username}`);
    }

    /**
     * Respawns the player in-game.
     * @returns A promise that resolves when the respawn command is sent.
     */
    public async respawn(): Promise<void> {
        await this.server.commands.execute(`:respawn ${this.username}`);
    }

    /**
     * Loads the player in-game.
     * @returns A promise that resolves when the load command is sent.
     */
    public async load(): Promise<void> {
        await this.server.commands.execute(`:load ${this.username}`);
    }

    /**
     * Refresh the player in-game.
     * @returns A promise that resolves when the refresh command is sent.
     */
    public async refresh(): Promise<void> {
        await this.server.commands.execute(`:refresh ${this.username}`);
    }

    /**
     * Helpers the player in-game.
     * @returns A promise that resolves when the helper command is sent.
     */
    public async helper(): Promise<void> {
        await this.server.commands.execute(`:helper ${this.username}`);
    }

    /**
     * Unhelpers the player in-game.
     * @returns A promise that resolves when the unhelper command is sent.
     */
    public async unhelper(): Promise<void> {
        await this.server.commands.execute(`:unhelper ${this.username}`);
    }

    /**
     * Mods the player in-game.
     * @returns A promise that resolves when the mod command is sent.
     */
    public async mod(): Promise<void> {
        await this.server.commands.execute(`:mod ${this.username}`);
    }

    /**
     * Unmods the player in-game.
     * @returns A promise that resolves when the unmod command is sent.
     */
    public async unmod(): Promise<void> {
        await this.server.commands.execute(`:unmod ${this.username}`);
    }

    /**
     * Admins the player in-game.
     * @returns A promise that resolves when the admin command is sent.
     */
    public async admin(): Promise<void> {
        await this.server.commands.execute(`:admin ${this.username}`);
    }

    /**
     * Unadmins the player in-game.
     * @returns A promise that resolves when the unadmin command is sent.
     */
    public async unadmin(): Promise<void> {
        await this.server.commands.execute(`:unadmin ${this.username}`);
    }

    /**
     * Teleports the player to another player.
     * @param player - The player to teleport the player to.
     * @returns A promise that resolves when the teleport command is sent.
     */
    public async tp(player: Player | number): Promise<void> {
        const playerId = player instanceof Player ? player.id : player;
        await this.server.commands.execute(`:tp ${this.username} ${playerId}`);
    }

    /**
     * Sends a private message to the player.
     * @param text - The message body.
     * @returns A promise that resolves when the message command is sent.
     */
    public async message(text: string): Promise<void> {
        await this.server.commands.execute(`:pm ${this.username} ${text}`);
    }

    /**
     * Sends a private message to the player.
     * @param text - The message body.
     * @returns A promise that resolves when the message command is sent.
     */
    public async pm(text: string): Promise<void> {
        await this.server.commands.execute(`:pm ${this.username} ${text}`);
    }

    /**
     * Gets all vehicles owned by this player.
     * @returns A collection of vehicles owned by this player.
     * @remarks This is a convenience getter that filters the vehicle cache for vehicles owned by this player.
     * It does not fetch new data from the server, so it may not be up-to-date.
     */
    public get vehicles() {
        return Array.from(this.server.vehicles.cache.values()).filter(v => v.owner.id === this.id);
    }

    /**
     * Gets all command logs associated with this player.
     * @returns A collection of command logs associated with this player.
     * @remarks This is a convenience getter that filters the command log cache for logs associated with this player.
     * It does not fetch new data from the server, so it may not be up-to-date.
     */
    public get commandLogs() {
        return Array.from(this.server.commandLogs.cache.values()).filter(log => log.player.id === this.id);
    }

    /**
     * Gets all kill logs where this player is the killer.
     * @returns A collection of kill logs where this player is the killer.
     * @remarks This is a convenience getter that filters the kill log cache for logs where this player is the killer.
     * It does not fetch new data from the server, so it may not be up-to-date.
     */
    public get kills() {
        return Array.from(this.server.killLogs.cache.values()).filter(log => log.killer.id === this.id);
    }

    /**
     * Gets all kill logs where this player is the killed.
     * @returns A collection of kill logs where this player is the killed.
     * @remarks This is a convenience getter that filters the kill log cache for logs where this player is the killed.
     * It does not fetch new data from the server, so it may not be up-to-date.
     */
    public get deaths() {
        return Array.from(this.server.killLogs.cache.values()).filter(log => log.killed.id === this.id);
    }

    /**
     * Converts this Player instance back into raw data structure.
     * @returns The raw player data.
     */
    public toJSON(): RawPlayerData {
        return {
            Player: `${this.username}:${this.id}`,
            Permission: this.permission,
            Team: this.team,
            Callsign: this.callsign!,
            WantedStars: this.wantedLevel,
            Location: {
                LocationX: this.location.x,
                LocationZ: this.location.z,
                PostalCode: this.location.postalCode,
                StreetName: this.location.streetName,
                BuildingNumber: this.location.buildingNumber,
            },
        };
    }
}
