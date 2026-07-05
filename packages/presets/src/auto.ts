import type { Client } from "@erlcjs/core";

/**
 * Sends a hint in-game every interval,
 * @param client - The client of the server to send to.
 * @param message - The message to send every interval.
 * @param interval - The interval to send the message at. Default is every 2 minutes.
 * @returns The setInterval used to it can be stopped with clearInterval.
 */
export function autoHint(client: Client, message: string, interval: number = 120000) {
    return setInterval(() => {
        client.commands.execute(`:h ${message}`)
    }, interval)
}

/**
 * Sends an announcement in-game every interval,
 * @param client - The client of the server to send to.
 * @param message - The message to send every interval.
 * @param interval - The interval to send the message at. Default is every 2 minutes.
 * @returns The setInterval used to it can be stopped with clearInterval.
 */
export function autoAnnouncement(client: Client, message: string, interval: number = 120000) {
    return setInterval(() => {
        client.commands.execute(`:m ${message}`)
    }, interval)
}

/**
 * Sends a command in-game every interval,
 * @param client - The client of the server to send to.
 * @param message - The command to send every interval.
 * @param interval - The interval to send the command at. Default is every 2 minutes.
 * @returns The setInterval used to it can be stopped with clearInterval.
 */
export function autoCommand(client: Client, command: string, interval: number = 120000) {
    return setInterval(() => {
        client.commands.execute(command)
    }, interval)
}