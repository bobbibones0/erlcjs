import type { KillLog, PlayerPermission } from "@erlcjs/core";
import type { Allowlist } from "./types";

/**
 * Fires an action if a player reaches a kill threshold in a specific timespan.
 * @param action - The callback to run if a match if found.
 * @param allowlist - Users/Permissions that can RDM.
 * @param minKills - The minimum number of kills in the threshold.
 * @param timespan - The timespan in which the number of kills must be reached in seconds.
 * @example
 * ```typescript
 * client.on(ERLCEvents.Kill, RDM((log) => log.killer.kick()));
 * ```
 * @example
 * ```typescript
 * client.on(ERLCEvents.Kill, RDM((log) => log.killer.kick(), [ PlayerPermission.Administrator, PlayerPermission.Owner ], 5, 30));
 * ```
 * @returns - Callback function to pass into client event.
 * @public
 */
export function RDM(action: (log: KillLog) => void, allowlist: Allowlist = [], minKills: number = 4, timespan: number = 30): (log: KillLog) => void {
    return (log: KillLog) => {
        let currentAllowlist = allowlist as (number | PlayerPermission)[];
        if (typeof allowlist === 'function') currentAllowlist = allowlist();
        if (currentAllowlist.includes(log.killerId) || currentAllowlist.includes(log.killer.permission as any)) return;
        const time = Date.now() / 1000 - timespan;
        const kills = log.killer.kills;
        const filterKills = kills.filter(k => k.timestamp >= time);
        if (filterKills.length >= minKills) action(log);
    }
}