import { Collection } from '../util/collection.js';
import type { Server } from '../client/server.js';
import type { Client } from '../client/client.js';
import { DuplicateServerError } from '../errors/index.js';

/**
 * Collection of the ER:LC game servers managed by a Client, keyed by server ID.
 * @public
 */
export class ServerManager extends Collection<string, Server> {
    /**
     * Creates an instance of ServerManager.
     * @param client - The erlcjs client.
     */
    constructor(private readonly client: Client) {
        super();
    }

    /**
     * Adds a server to the manager, keyed by its server ID.
     * @param server - The server to add.
     * @returns This manager.
     */
    public add(server: Server): this {
        if (this.has(server.id)) {
            throw new DuplicateServerError(server.id);
        }
        this.set(server.id, server);
        return this;
    }

    /**
     * Resolves a server by its server ID, accepting a string or number.
     * @param id - The server ID.
     * @returns The server, if found.
     */
    public resolve(id: string | number): Server | undefined {
        return this.get(String(id));
    }

    /**
     * Destroys and removes all managed servers.
     */
    public clearServers() {
        for (const server of this.values()) {
            server.destroy();
        }
        this.clear();
    }
}
