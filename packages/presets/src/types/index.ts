import { PlayerPermission, Vehicles } from "@erlcjs/core"

/**
 * Represents a vehicle livery to ban, optionally scoped to a specific vehicle model.
 * @public
 */
export interface Livery {
    /** The livery/texture name to ban. */
    livery: string,
    /** The vehicle model this livery restriction applies to. */
    vehicle: Vehicles,
}

/**
 * Type which represents allowlists, a set array can be used for a set allowlist or a callback function for a dynamic one.
 * @public
 */
export type Allowlist = (number | PlayerPermission)[] | (() => (number | PlayerPermission)[]);