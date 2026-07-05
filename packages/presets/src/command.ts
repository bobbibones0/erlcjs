import { CommandLog, PlayerPermission } from "@erlcjs/core";
import type { Allowlist } from "./types";

/**
 * Ban commands for specific users.
 * @param commands - The commands to ban.
 * @param action - The callback to run if a match if found.
 * @param startsWith - Exact match or starts with match.
 * @param allowlist - Users/Permissions that can run the command
 * @example
 * ```typescript
 * client.on(ERLCEvents.Command, banCommand([':bring all', ':load all'], CommandPunishments.removePermissions(), false, [ PlayerPermission.Owner ] ));
 * ```
 * @example
 * ```typescript
 * client.on(ERLCEvents.Command, banCommand([':admin', ':mod'], CommandPunishments.removePermissions(), true, [ PlayerPermission.Owner ] ));
 * ```
 * @returns - Callback function to pass into client event.
 * @public
 */
export function banCommand(commands: string | string[], action: (log: CommandLog) => void, startsWith: boolean = true, allowlist: Allowlist = []): (log: CommandLog) => void {
    if (typeof commands === 'string') commands = [commands];
    return (log: CommandLog) => {
        let currentAllowlist = allowlist as (number | PlayerPermission)[];
        if (typeof allowlist === 'function') currentAllowlist = allowlist();
        if (currentAllowlist && currentAllowlist.length > 0) {
            for (const allow of currentAllowlist) {
                if (typeof allow === 'string') {
                    if (log.player.permission === allow) return;
                } else {
                    if (log.playerId === allow) return;
                }
            }
        }

        for (const command of commands) {
            if (startsWith && log.command.startsWith(command.trim())) {
                action(log);
            } else if (!startsWith && log.command.trim() === command) {
                action(log);
            }
        }
    }
}

/**
 * Provides punishment actions for banned commands.
 * @public
 */
export class CommandPunishments {
    /**
     * Removes admin/mod permissions from the player.
     * @returns A callback that removes permissions from the command sender.
     */
    public static removePermissions(): (log: CommandLog) => void {
        return (log: CommandLog) => {
            if (log.player.permission === 'Server Administrator') log.player.unadmin();
            if (log.player.permission === 'Server Moderator') log.player.unmod();
        }
    }

    /**
     * Removes permissions and kicks the player.
     * @returns A callback that kicks the command sender.
     */
    public static kick(): (log: CommandLog) => void {
        return (log: CommandLog) => {
            this.removePermissions()(log);
            log.player.kick();
        }
    }

    /**
     * Removes permissions and bans the player.
     * @returns A callback that bans the command sender.
     */
    public static ban(): (log: CommandLog) => void {
        return (log: CommandLog) => {
            this.removePermissions()(log);
            log.player.ban();
        }
    }
}