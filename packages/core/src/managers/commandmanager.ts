import type { Server } from '../client/server.js';

/**
 * Manager responsible for executing custom console commands in the ER:LC server.
 * @public
 */
export class CommandManager {
    /**
     * Creates an instance of CommandManager.
     * @param server - The server this manager belongs to.
     */
    constructor(private readonly server: Server) {}

    /**
     * Executes a server command via the ER:LC API.
     * @param command - The full command string to execute (e.g. `:pm alex hello`).
     * @returns A promise resolving to the API response string status.
     */
    public async execute(command: string): Promise<string> {
        const res: string = await this.server.rest.request('POST', '/v2/server/command', {
            command,
        });

        return res;
    }
}
