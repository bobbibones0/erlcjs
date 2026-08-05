import type { Server } from "@erlcjs/core";

/**
 * Sends a hint in-game every interval,
 * @param server - The server to send to.
 * @param message - The message to send every interval.
 * @param interval - The interval to send the message at. Default is every 2 minutes.
 * @returns The setInterval used to it can be stopped with clearInterval.
 */
export function autoHint(server: Server, message: string, interval: number = 120000) {
    return setInterval(() => {
        server.commands.execute(`:h ${message}`)
    }, interval)
}

/**
 * Sends an announcement in-game every interval,
 * @param server - The server to send to.
 * @param message - The message to send every interval.
 * @param interval - The interval to send the message at. Default is every 2 minutes.
 * @returns The setInterval used to it can be stopped with clearInterval.
 */
export function autoAnnouncement(server: Server, message: string, interval: number = 120000) {
    return setInterval(() => {
        server.commands.execute(`:m ${message}`)
    }, interval)
}

/**
 * Sends a command in-game every interval,
 * @param server - The server to send to.
 * @param command - The command to send every interval.
 * @param interval - The interval to send the command at. Default is every 2 minutes.
 * @returns The setInterval used to it can be stopped with clearInterval.
 */
export function autoCommand(server: Server, command: string, interval: number = 120000) {
    return setInterval(() => {
        server.commands.execute(command)
    }, interval)
}
