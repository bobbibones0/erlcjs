import type { KillLog, PlayerPermission } from "@erlcjs/core";

export function RDM(action: (log: KillLog) => void, allowlist: (number | PlayerPermission)[] = [], minKills: number = 4, timespan: number = 30) {
    return (log: KillLog) => {
        if (allowlist.includes(log.killerId) || allowlist.includes(log.killer.permission as any)) return;
        const time = Date.now() / 1000 - timespan;
        const kills = log.killer.kills;
        const filterKills = kills.filter(k => k.timestamp >= time);
        if (filterKills.length >= minKills) action(log);
    }
}