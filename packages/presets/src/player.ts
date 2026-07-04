import { Player } from "@erlcjs/core";

/**
 * Welcomes the player on join.
 * @param message - Optional custom message to send to player.
 * @example
 * ```typescript
 * client.on(ERLCEvents.playerJoin, welcomePlayer())
 * ```
 * @returns Callback function to pass into client event.
 */
export function welcomePlayer(message?: string): (player: Player) => void {
    return (player: Player) => {
        player.message(message ?? `Welcome to ${player.client.server.cache?.name}!`);
    }
}

export function banKickRejoin(timespan: number = 30000): (player: Player) => void {
    return (player: Player) => {
        const timestamp = Date.now() / 1000 -timespan
        const kicks = player.client.commandLogs.cache.filter(v => v.timestamp > timestamp  && (v.command.startsWith(`:kick ${player.username}`) || v.command.startsWith(`:kick ${player.id}`)));
        if (kicks.size >= 1) player.ban(`Rejoin within ${timespan} seconds of a kick.`)
    }
}