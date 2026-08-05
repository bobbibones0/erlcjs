import type { Server } from './server.js';
import type { ServerInfo } from '../structures/serverinfo.js';
import type { Player } from '../structures/player.js';
import type { Vehicle } from '../structures/vehicle.js';
import type { CommandLog } from '../structures/commandlog.js';
import type { ModCall } from '../structures/modcall.js';
import type { KillLog } from '../structures/killlog.js';
import type { EmergencyCall } from '../structures/emergencycall.js';
import type { Staff } from '../structures/staff.js';

/**
 * Event names emitted by the erlcjs Client.
 * @public
 */
export enum ERLCEvents {
    /** Emitted when every configured server has completed its first poll and the client is ready. */
    ready = 'READY',
    /** Emitted when a server completes its first successful poll. */
    serverReady = 'SERVER_READY',
    /** Emitted when an offline server recovers and becomes reachable again. */
    serverOnline = 'SERVER_ONLINE',
    /** Emitted when a server goes offline and its caches are cleared. */
    serverOffline = 'SERVER_OFFLINE',
    /** Emitted when a periodic server poll finishes. */
    poll = 'POLL',
    /** Emitted when server details are updated. */
    serverUpdate = 'SERVER_UPDATE',
    /** Emitted when server details are first loaded. */
    serverCreate = 'SERVER_CREATE',
    /** Emitted when a player joins a server. */
    playerJoin = 'PLAYER_JOIN',
    /** Emitted when a player's data (e.g. location, team) updates. */
    playerUpdate = 'PLAYER_UPDATE',
    /** Emitted when a player leaves a server. */
    playerLeave = 'PLAYER_LEAVE',
    /** Emitted when a vehicle is spawned. */
    vehicleAdd = 'VEHICLE_ADD',
    /** Emitted when a vehicle is despawned. */
    vehicleRemove = 'VEHICLE_REMOVE',
    /** Emitted when a vehicle's data updates. */
    vehicleUpdate = 'VEHICLE_UPDATE',
    /** Emitted when a server command is run. */
    command = 'COMMAND',
    /** Emitted when a player requests moderator assistance. */
    modCall = 'MOD_CALL',
    /** Emitted when a mod call is answered by a moderator. */
    modCallAnswered = 'MOD_CALL_ANSWERED',
    /** Emitted when a player is killed. */
    kill = 'KILL',
    /** Emitted when an emergency call is created. */
    emergencyCallAdd = 'EMERGENCY_CALL_ADD',
    /** Emitted when an emergency call is cleared. */
    emergencyCallRemove = 'EMERGENCY_CALL_REMOVE',
    /** Emitted when an emergency call is updated. */
    emergencyCallUpdate = 'EMERGENCY_CALL_UPDATE',
    /** Emitted when a staff member is added */
    staffAdd = 'STAFF_ADD',
    /** Emitted when a staff member is removed */
    staffRemove = 'STAFF_REMOVE',
    /** Emitted when a custom command is executed in-game */
    customCommand = 'CUSTOM_COMMAND',
    /** Emitted when a user enters the webhook in-game */
    webhookProbe = 'WEBHOOK_PROBE',
}

/**
 * Interface mapping client event names to their callback parameters.
 * @public
 */
export interface ClientEvents {
    /** Emitted when every configured server has completed its first poll and the client is ready. */
    [ERLCEvents.ready]: [];
    /** Emitted when a server completes its first successful poll. */
    [ERLCEvents.serverReady]: [server: Server];
    /** Emitted when an offline server recovers and becomes reachable again. */
    [ERLCEvents.serverOnline]: [server: Server];
    /** Emitted when a server goes offline and its caches are cleared. */
    [ERLCEvents.serverOffline]: [server: Server];
    /** Emitted when a periodic server poll finishes. */
    [ERLCEvents.poll]: [server: Server];
    /** Emitted when server details are updated. */
    [ERLCEvents.serverUpdate]: [oldServer: ServerInfo | null, newServer: ServerInfo];
    /** Emitted when server details are first loaded. */
    [ERLCEvents.serverCreate]: [server: ServerInfo];

    /** Emitted when a player joins a server. */
    [ERLCEvents.playerJoin]: [player: Player];
    /** Emitted when a player's data updates. */
    [ERLCEvents.playerUpdate]: [oldPlayer: Player | null, newPlayer: Player];
    /** Emitted when a player leaves a server. */
    [ERLCEvents.playerLeave]: [player: Player];

    /** Emitted when a vehicle is spawned. */
    [ERLCEvents.vehicleAdd]: [vehicle: Vehicle];
    /** Emitted when a vehicle is despawned. */
    [ERLCEvents.vehicleRemove]: [vehicle: Vehicle];
    /** Emitted when a vehicle's data updates. */
    [ERLCEvents.vehicleUpdate]: [oldVehicle: Vehicle | null, newVehicle: Vehicle];

    /** Emitted when a server command is run. */
    [ERLCEvents.command]: [log: CommandLog];
    /** Emitted when a player requests moderator assistance. */
    [ERLCEvents.modCall]: [call: ModCall];
    /** Emitted when a mod call is answered by a moderator. */
    [ERLCEvents.modCallAnswered]: [call: ModCall];
    /** Emitted when a player is killed. */
    [ERLCEvents.kill]: [kill: KillLog];

    /** Emitted when an emergency call is created. */
    [ERLCEvents.emergencyCallAdd]: [call: EmergencyCall];
    /** Emitted when an emergency call is cleared. */
    [ERLCEvents.emergencyCallRemove]: [call: EmergencyCall];
    /** Emitted when an emergency call is updated. */
    [ERLCEvents.emergencyCallUpdate]: [oldCall: EmergencyCall | null, newCall: EmergencyCall];

    /** Emitted when a player is given a staff role. */
    [ERLCEvents.staffAdd]: [staff: Staff, type: 'Admin' | 'Mod' | 'Helper'];
    /** Emitted when a player is removed from a staff role. */
    [ERLCEvents.staffRemove]: [staff: Staff, type: 'Admin' | 'Mod' | 'Helper'];

    /** Emitted when a custom command is executed in-game. */
    [ERLCEvents.customCommand]: [player: Player, command: string, args: string[]];

    /** Emitted when a player enters the webhook in-game. */
    [ERLCEvents.webhookProbe]: [server: Server];

    /** Emitted when an error is caught during polling or gateway operations. */
    error: [error: unknown];
}
