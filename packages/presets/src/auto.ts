import type { Client } from "@erlcjs/core";

export function autoHint(client: Client, message: string, interval: number = 12000) {
    return setInterval(() => {
        client.commands.execute(`:h ${message}`)
    }, interval)
}

export function autoAnnouncement(client: Client, message: string, interval: number = 12000) {
    return setInterval(() => {
        client.commands.execute(`:m ${message}`)
    }, interval)
}

export function autoCommand(client: Client, command: string, interval: number = 120000) {
    return setInterval(() => {
        client.commands.execute(command)
    }, interval)
}