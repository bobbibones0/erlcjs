import type { PlayerPermission } from "../enums/player";
import type { Player } from "../structures/player";

/**
 * Configuration options for the ERLCApi Client.
 * @public
 */
export interface ClientOptions {
    /**
     * The ER:LC Server API keys the client should manage.
     * The server ID of each server is parsed from its key.
     */
    servers: string[];
    /**
     * Optional global key for your application.
     */
    globalKey?: string;
    /**
     * Optional global app ID for your application.
     */
    globalAppId?: string | number;
    /**
     * Webhook configuration details.
     */
    webhook?: {
        /**
         * Whether to enable the webhook server.
         */
        enabled: boolean;
        /**
         * The port to run the webhook server on.
         */
        port: number;
        /**
         * The URL path for incoming webhooks.
         */
        path?: string;
    };
    /**
     * Configuration to poll the ER:LC API endpoints periodically.
     */
    polling?: {
        /**
         * Whether to poll the ER:LC API endpoints periodically.
         */
        enabled: boolean;
        /**
         * The rate to poll the ER:LC API endpoints. Minimum value of 500.
         */
        pollingRateMs?: number;
        /**
         * Automatically start polling after client creation. Defaults to true.
         */
        autoStartPolling?: boolean;
    } | true;
    maxCacheSize?: {
        killLog?: number;
        commandLog?: number;
        modCalls?: number;
    }
}

/**
 * The raw permission values returned by the ER:LC API.
 * @public
 */
export type RawPlayerPermission = 'Normal' | 'Server Administrator' | 'Server Owner' | 'Server Moderator';

/**
 * Raw data structure representing a player from the ERLC API.
 * @public
 */
export interface RawPlayerData {
    /**
     * The player identifier, in the format `Username:UserId`.
     */
    Player: string;
    /**
     * The permission level of the player in the server.
     */
    Permission: RawPlayerPermission;
    /**
     * The team the player is currently on.
     */
    Team: string;
    /**
     * The player's optional callsign.
     */
    Callsign: string;
    /**
     * The player's location coordinates and address details.
     */
    Location: {
        /**
         * The X coordinate of the player in the game.
         */
        LocationX: number;
        /**
         * The Y coordinate of the player in the game.
         */
        LocationZ: number;
        /**
         * The postal code of the player's location.
         */
        PostalCode: string;
        /**
         * The street name of the player's location.
         */
        StreetName: string;
        /**
         * The building number of the player's location.
         */
        BuildingNumber: string;
    };
    /**
     * The number of wanted stars the player currently has.
     */
    WantedStars: number;
}

/**
 * Raw data structure representing server staff records.
 * @public
 */
export interface RawStaffData {
    /**
     * Record of server administrators (UserId to Username).
     */
    Admins: Record<string, string>;
    /**
     * Record of server moderators (UserId to Username).
     */
    Mods: Record<string, string>;
    /**
     * Record of server helpers (UserId to Username).
     */
    Helpers: Record<string, string>;
}

/**
 * Raw data structure representing a server join/leave log entry.
 * @public
 */
export interface RawJoinLog {
    /**
     * True if the player joined, false if they left.
     */
    Join: boolean;
    /**
     * Unix timestamp of when the event occurred.
     */
    Timestamp: number;
    /**
     * The player identifier, in the format `Username:UserId`.
     */
    Player: string;
}

/**
 * Raw data structure representing a kill log entry.
 * @public
 */
export interface RawKillLog {
    /**
     * The identifier of the player who was killed (`Username:UserId`).
     */
    Killed: string;
    /**
     * Unix timestamp of when the kill occurred.
     */
    Timestamp: number;
    /**
     * The identifier of the player who did the killing (`Username:UserId`).
     */
    Killer: string;
}

/**
 * Raw data structure representing a executed command log entry.
 * @public
 */
export interface RawCommandLog {
    /**
     * The identifier of the player who ran the command (`Username:UserId`).
     */
    Player: string;
    /**
     * Unix timestamp of when the command was run.
     */
    Timestamp: number;
    /**
     * The command string that was executed.
     */
    Command: string;
}

/**
 * Raw data structure representing a moderator call log.
 * @public
 */
export interface RawModCall {
    /**
     * The identifier of the caller (`Username:UserId`).
     */
    Caller: string;
    /**
     * The identifier of the moderator who responded, if any (`Username:UserId`).
     */
    Moderator?: string;
    /**
     * Unix timestamp of the moderator call.
     */
    Timestamp: number;
}

/**
 * Raw data structure representing an emergency call.
 * @public
 */
export interface RawEmergencyCall {
    /**
     * The team name associated with the emergency call.
     */
    Team: string;
    /**
     * The UserId of the player who made the call.
     */
    Caller: number;
    /**
     * List of UserIds of responders currently assigned to this call.
     */
    Players: number[];
    /**
     * Position coordinates [x, y] of the emergency call.
     */
    Position: number[];
    /**
     * Unix timestamp of when the call was created.
     */
    StartedAt: number;
    /**
     * The unique call number.
     */
    CallNumber: number;
    /**
     * The description text of the call.
     */
    Description: string;
    /**
     * Descriptors of the position where the call was made.
     */
    PositionDescriptor: string;
}

/**
 * Raw data structure representing a webhook emergency call.
 * @public
 */
export interface RawWebhookEmergencyCall {
    /**
     * The team name associated with the emergency call.
     */
    team: string;
    /**
     * The UserId of the player who made the call.
     */
    caller: number;
    /**
     * List of UserIds of responders currently assigned to this call.
     */
    players: number[];
    /**
     * Position coordinates [x, y] of the emergency call.
     */
    position: number[];
    /**
     * Unix timestamp of when the call was created.
     */
    startedAt: number;
    /**
     * The unique call number.
     */
    callNumber: number;
    /**
     * The description text of the call.
     */
    description: string;
    /**
     * Descriptors of the position where the call was made.
     */
    positionDescriptor: string;
}

/**
 * Raw data structure representing a vehicle.
 * @public
 */
export interface RawVehicle {
    /**
     * The name/model of the vehicle.
     */
    Name: string;
    /**
     * The username of the vehicle owner.
     */
    Owner: string;
    /**
     * The license plate of the vehicle.
     */
    Plate: string;
    /**
     * The custom texture path or name of the vehicle.
     */
    Texture?: string;
    /**
     * Hexadecimal color code of the vehicle.
     */
    ColorHex: string;
    /**
     * The color name of the vehicle.
     */
    ColorName: string;
}

/**
 * Raw data structure representing the full server information payload from ER:LC.
 * @public
 */
export interface RawServerData {
    /**
     * The server name.
     */
    Name: string;
    /**
     * The UserId of the server owner.
     */
    OwnerId: number;
    /**
     * List of UserIds of server co-owners.
     */
    CoOwnerIds: number[];
    /**
     * Number of players currently in the server.
     */
    CurrentPlayers: number;
    /**
     * Maximum allowed players in the server.
     */
    MaxPlayers: number;
    /**
     * The join key of the server.
     */
    JoinKey: string;
    /**
     * Verification level requirement for joining.
     */
    AccVerifiedReq: 'Disabled' | 'Email' | 'Phone/ID';
    /**
     * Whether team balance is enabled.
     */
    TeamBalance: boolean;
    /**
     * List of active players.
     */
    Players?: RawPlayerData[];
    /**
     * Server staff lists.
     */
    Staff?: RawStaffData;
    /**
     * Server join/leave logs.
     */
    JoinLogs?: RawJoinLog[];
    /**
     * UserIds currently in the join queue.
     */
    Queue?: number[];
    /**
     * Server kill logs.
     */
    KillLogs?: RawKillLog[];
    /**
     * Server command logs.
     */
    CommandLogs?: RawCommandLog[];
    /**
     * Active moderator calls.
     */
    ModCalls?: RawModCall[];
    /**
     * Active emergency calls.
     */
    EmergencyCalls?: RawEmergencyCall[];
    /**
     * Active vehicles spawned.
     */
    Vehicles?: RawVehicle[];
}

/**
 * In-Game command structure.
 * @public
 */
export interface InGameCommand {
    /**
     * The name of the command.
     */
    name: string;
    /**
     * The description of the command.
     */
    description?: string;
    /**
     * The permissions the player needs to use the command.
     */
    permission?: (RawPlayerPermission | PlayerPermission)[];
    /**
     * Aliases of the command.
     */
    aliases?: string[];
    /**
     * The execution of the command.
     * @param context - An object of the player and args given to the execute function.
     */
    execute: (context: { player: Player; args: string[] }) => void;
}