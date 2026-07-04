import type { Client } from "@erlcjs/core";

export function autoHint(client: Client, message: string, interval: number = 12000) {
    return setInterval(() => {
        client.commands.execute(`:hint ${message}`)
    }, interval)
}