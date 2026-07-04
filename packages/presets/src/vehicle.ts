import { Vehicle, ERLCEvents, Vehicles, PlayerPermission } from '@erlcjs/core';
import { type Livery } from './types/index.js';

/**
 * Bans vehicles for everyone except specific users.
 * @param vehicles - A list of vehicles to ban.
 * @param action - Callback function executed when a match is found.
 * @param allowlist - Users which can use the vehicle.
 * @example
 * ```typescript
 * client.on(ERLCEvents.vehicleAdd, banVehicles([ Vehicles.STRUGATTI_ETTORE_2020 ], VehiclePunishments.warnThenKick()))
 * ```
 * @returns Callback function to pass into client event.
 * @public
 */
export function banVehicles(vehicles: (Vehicles | string)[], action: (vehicle: Vehicle) => void, allowlist: (number | PlayerPermission)[] = []): (vehicle: Vehicle) => void {
    return (vehicle: Vehicle) => {
        if (allowlist.includes(vehicle.ownerId) || allowlist.includes(vehicle.owner.permission as any)) return;
        if (vehicles.includes(vehicle.name)) {
            action(vehicle)
        }
    }
}

/**
 * Bans liveries for everyone except specific users.
 * @param liveries - A list of liveries to ban.
 * @param action - Callback function executed when a match if found.
 * @param allowlist - Users which can use the livery.
 * @example
 * ```typescript
 * client.on(ERLCEvents.vehicleAdd, banLiveries([ 'Staff' ], LiveryPunishments.warnThenKick(), [ PlayerPermission.Mod, PlayerPermission.Administrator, PlayerPermission.Owner ]))
 * ```
 * @returns Callback function to pass into the client event.
 * @public
 */
export function banLiveries(liveries: (Livery | string)[], action: (vehicle: Vehicle) => void, allowlist: (number | PlayerPermission)[] = []) {
    return (vehicle: Vehicle) => {
        if (!vehicle.texture) return;
        if (allowlist.includes(vehicle.ownerId) || allowlist.includes(vehicle.owner.permission as any)) return;
        for (const livery of liveries) {
            if (typeof livery === 'string') {
                if (livery === vehicle.texture) {
                    action(vehicle);
                }
            } else if (livery.livery === vehicle.texture) {
                if (livery.vehicle === vehicle.name || !livery.vehicle) {
                    action(vehicle);
                }
            }
        }
    }
}

/**
 * Provides punishment actions for banned vehicles.
 * @class VehiclePunishments
 * @example
 * ```typescript
 * client.on(ERLCEvents.vehicleAdd, banVehicles(
 *   [Vehicles.BUGATTI_VEYRON],
 *   VehiclePunishments.warnThenKick(15, true, 'This vehicle is not allowed')
 * ))
 * ```
 * @public
 */
export class VehiclePunishments {
    /**
     * Warns a player and kicks them if they don't change vehicles within the specified delay.
     * @static
     * @param {number} [delay=10] - Time in seconds before kicking the player.
     * @param {boolean} [warning=true] - Whether to send a warning message before kicking.
     * @param {string} [message] - Custom message to send to the player. Defaults to a generic message.
     * @returns {(vehicle: Vehicle) => void} A callback function that handles the punishment logic.
     * @example
     * ```typescript
     * const punishment = VehiclePunishments.warnThenKick(15, true, 'Please change your vehicle');
     * client.on(ERLCEvents.vehicleAdd, banVehicles([Vehicles.BUGATTI_VEYRON], punishment))
     * ```
     */
    public static warnThenKick(delay: number = 10, warning: boolean = true, message?: string ): (vehicle: Vehicle) => void {
        return (vehicle: Vehicle) => {
            vehicle.owner.message(message ?? 'The vehicle you are using is restricted. Please change it.');
            setTimeout(async () => {
                await vehicle.client.waitFor(ERLCEvents.poll, 5000);
                if (
                    vehicle.client.vehicles.cache.get(vehicle.plate)?.ownerId !== vehicle.ownerId ||
                    vehicle.client.vehicles.cache.get(vehicle.plate)?.name !== vehicle.name
                )
                    return;
                if (warning) {
                    vehicle.owner.message(`Change the vehicle in ${delay} seconds or you will be kicked.`);
                    setTimeout(async () => {
                        await vehicle.client.waitFor(ERLCEvents.poll, 5000);
                        if (
                            vehicle.client.vehicles.cache.get(vehicle.plate)?.ownerId !== vehicle.ownerId ||
                            vehicle.client.vehicles.cache.get(vehicle.plate)?.name !== vehicle.name
                        )
                            return;
                        if (vehicle.owner.permission === 'Normal') vehicle.owner.kick('Failure to change from a banned vehicle.')
                    }, delay * 1000)
                } else if (vehicle.owner.permission === 'Normal') {
                    vehicle.owner.kick('Failure to change from a banned vehicle.')
                }
            }, delay * 1000)
        }
    }
}

/**
 * Provides punishment actions for banned liveries.
 * @class LiveryPunishments
 * @example
 * ```typescript
 * client.on(ERLCEvents.vehicleAdd, banLiveries(
 *   ['Staff'],
 *   LiveryPunishments.warnThenKick(10, true, 'This livery is restricted'),
 *   [PlayerPermission.Mod, PlayerPermission.Administrator]
 * ))
 * ```
 * @public
 */
export class LiveryPunishments {
    /**
     * Warns a player and kicks them if they don't change their livery within the specified delay.
     * @static
     * @param {number} [delay=10] - Time in seconds before kicking the player.
     * @param {boolean} [warning=true] - Whether to send a warning message before kicking.
     * @param {string} [message] - Custom message to send to the player. Defaults to a generic message.
     * @returns {(vehicle: Vehicle) => void} A callback function that handles the punishment logic.
     * @example
     * ```typescript
     * const punishment = LiveryPunishments.warnThenKick(15, true, 'Change your livery');
     * client.on(ERLCEvents.vehicleAdd, banLiveries(['Staff'], punishment, [PlayerPermission.Mod]))
     * ```
     */
    public static warnThenKick(delay: number = 10, warning: boolean = true, message?: string): (vehicle: Vehicle) => void {
        return (vehicle: Vehicle) => {
            vehicle.owner.message(message ?? 'The livery you are using is restricted. Please change it.');
            setTimeout(async () => {
                await vehicle.client.waitFor(ERLCEvents.poll, 5000);
                if (
                    vehicle.client.vehicles.cache.get(vehicle.plate)?.ownerId !== vehicle.ownerId ||
                    vehicle.client.vehicles.cache.get(vehicle.plate)?.name !== vehicle.name
                )
                    return;
                if (warning) {
                    vehicle.owner.message(`Change the livery in ${delay} seconds or you will be kicked.`);
                    setTimeout(async () => {
                        await vehicle.client.waitFor(ERLCEvents.poll, 5000);
                        if (
                            vehicle.client.vehicles.cache.get(vehicle.plate)?.ownerId !== vehicle.ownerId ||
                            vehicle.client.vehicles.cache.get(vehicle.plate)?.name !== vehicle.name
                        )
                            return;
                        if (vehicle.owner.permission === 'Normal') vehicle.owner.kick('Failure to change from a banned livery.')
                    }, delay * 1000)
                } else if (vehicle.owner.permission === 'Normal') {
                    vehicle.owner.kick('Failure to change from a banned livery.')
                }
            }, delay * 1000)
        }
    }
}