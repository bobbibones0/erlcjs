import type { KillLog, PlayerPermission } from "@erlcjs/core";

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
 */
export function RDM(action: (log: KillLog) => void, allowlist: (number | PlayerPermission)[] = [], minKills: number = 4, timespan: number = 30) {
    return (log: KillLog) => {
        if (allowlist.includes(log.killerId) || allowlist.includes(log.killer.permission as any)) return;
        const time = Date.now() / 1000 - timespan;
        const kills = log.killer.kills;
        const filterKills = kills.filter(k => k.timestamp >= time);
        if (filterKills.length >= minKills) action(log);
    }
}