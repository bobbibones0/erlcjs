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
                if (livery.vehicle === vehicle.texture || !livery.vehicle) {
                    action(vehicle);
                }
            }
        }
    }
}

export class VehiclePunishments {
    public static warnThenKick(delay: number = 10, warning: boolean = true, message?: string ): (vehicle: Vehicle) => void {
        return (vehicle: Vehicle) => {
            vehicle.owner.message(message ?? 'The vehicle you are using is restricted. Please change it.');
            setTimeout(async () => {
                await vehicle.client.waitFor(ERLCEvents.poll, 5000);
                if (
                    vehicle.client.vehicles.cache.get(vehicle.plate)?.ownerId !== vehicle.ownerId &&
                    vehicle.client.vehicles.cache.get(vehicle.plate)?.name !== vehicle.name
                )
                    return;
                if (warning) {
                    vehicle.owner.message(`Change the vehicle in ${delay} seconds or you will be kicked.`);
                    setTimeout(async () => {
                        await vehicle.client.waitFor(ERLCEvents.poll, 5000);
                        if (
                            vehicle.client.vehicles.cache.get(vehicle.plate)?.ownerId !== vehicle.ownerId &&
                            vehicle.client.vehicles.cache.get(vehicle.plate)?.name !== vehicle.name
                        )
                            return;
                        if (vehicle.owner.permission === 'Normal') vehicle.owner.kick('Failure to change from a banned vehicle.')
                    }, delay)
                } else if (vehicle.owner.permission === 'Normal') {
                    vehicle.owner.kick('Failure to change from a banned vehicle.')
                }
            }, delay)
        }
    }
}

export class LiveryPunishments {
    public static warnThenKick(delay: number = 10, warning: boolean = true, message?: string): (vehicle: Vehicle) => void {
        return (vehicle: Vehicle) => {
            vehicle.owner.message(message ?? 'The livery you are using is restricted. Please change it.');
            setTimeout(async () => {
                await vehicle.client.waitFor(ERLCEvents.poll, 5000);
                if (
                    vehicle.client.vehicles.cache.get(vehicle.plate)?.ownerId !== vehicle.ownerId &&
                    vehicle.client.vehicles.cache.get(vehicle.plate)?.name !== vehicle.name
                )
                    return;
                if (warning) {
                    vehicle.owner.message(`Change the livery in ${delay} seconds or you will be kicked.`);
                    setTimeout(async () => {
                        await vehicle.client.waitFor(ERLCEvents.poll, 5000);
                        if (
                            vehicle.client.vehicles.cache.get(vehicle.plate)?.ownerId !== vehicle.ownerId &&
                            vehicle.client.vehicles.cache.get(vehicle.plate)?.name !== vehicle.name
                        )
                            return;
                        if (vehicle.owner.permission === 'Normal') vehicle.owner.kick('Failure to change from a banned livery.')
                    }, delay)
                } else if (vehicle.owner.permission === 'Normal') {
                    vehicle.owner.kick('Failure to change from a banned livery.')
                }
            }, delay)
        }
    }
}