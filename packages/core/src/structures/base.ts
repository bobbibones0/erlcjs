import type { Server } from '../client/server.js';
import type { Client } from '../client/client.js';

/**
 * Represents the base class for all ER:LC structures.
 * @public
 */
export class Base {
    /**
     * Creates an instance of the Base class.
     * @param server - The server this structure belongs to.
     */
    constructor(public readonly server: Server) {}

    /**
     * The client that owns the server this structure belongs to.
     */
    public get client(): Client {
        return this.server.client;
    }
}
