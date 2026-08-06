import { createServer, type Server as HTTPServer } from 'node:http';
import type { Client } from '../client/client.js';
import { ERLCEvents } from '../client/events.js';
import type { Server } from '../client/server.js';
import { ServerNotConfiguredError } from '../errors/index.js';

/**
 * Splits an argument string into tokens, respecting single and double quoted segments.
 * @param input - The raw argument string from a webhook custom command event.
 * @returns The parsed arguments.
 */
function parseArgs(input: string): string[] {
    const trimmed = input.trim();
    if (!trimmed) return [];

    const args: string[] = [];
    let current = '';
    let quote: string | null = null;

    for (const char of trimmed) {
        if (quote) {
            if (char === quote) quote = null;
            else current += char;
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (char === ' ') {
            if (current) {
                args.push(current);
                current = '';
            }
        } else {
            current += char;
        }
    }

    if (current) args.push(current);
    return args;
}

/**
 * Webhook Server for handling real-time gateway events pushed by ER:LC for all managed servers.
 * Incoming events are routed to the matching server by the top-level `payload.server` field.
 * @public
 */
export class WebhookServer {
    private readonly server: HTTPServer;

    /**
     * Creates an instance of WebhookServer.
     * @param client - The erlcjs client.
     */
    constructor(private readonly client: Client) {
        this.server = createServer((req, res) => {
            const configPath = this.client.options.webhook?.path || '/';

            if (req.method === 'POST' && req.url === configPath) {
                let bodyChunks: Buffer[] = [];
                req.on('data', (chunk) => bodyChunks.push(chunk));

                req.on('end', async () => {
                    const rawBody = Buffer.concat(bodyChunks);

                    const signatureHex = req.headers['x-signature-ed25519'] as string;
                    const timestamp = req.headers['x-signature-timestamp'] as string;

                    const publicKeyBase64 =
                        'MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=';

                    if (!signatureHex || !timestamp || !publicKeyBase64) {
                        res.writeHead(401, { 'Content-Type': 'text/plain' });
                        return res.end('Missing verification headers or public key config');
                    }

                    const timestampSeconds = Number(timestamp);
                    const tolerance = this.client.options.webhook?.timestampTolerance ?? 5;
                    if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > tolerance) {
                        res.writeHead(401, { 'Content-Type': 'text/plain' });
                        return res.end('Invalid Signature');
                    }

                    try {
                        const timestampBuffer = Buffer.from(timestamp, 'utf-8');
                        const messageBuffer = Buffer.concat([timestampBuffer, rawBody]);

                        const signatureBuffer = Buffer.from(signatureHex, 'hex');
                        const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64');

                        const cryptoKey = await globalThis.crypto.subtle.importKey(
                            'spki',
                            publicKeyBuffer,
                            { name: 'Ed25519', namedCurve: 'Ed25519' },
                            false,
                            ['verify'],
                        );

                        const isValid = await globalThis.crypto.subtle.verify(
                            'Ed25519',
                            cryptoKey,
                            signatureBuffer,
                            messageBuffer,
                        );

                        if (!isValid) {
                            res.writeHead(401, { 'Content-Type': 'text/plain' });
                            return res.end('Invalid Signature');
                        }

                        const payload = JSON.parse(rawBody.toString('utf-8'));
                        this.handleGatewayEvent(payload).catch((err) => this.client._emitError(err));

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ received: true }));
                    } catch {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Malformed Payload or Verification Error');
                    }
                });
            } else {
                res.writeHead(404).end();
            }
        });
    }

    /**
     * Starts listening for incoming webhook events.
     */
    public listen() {
        const port = this.client.options.webhook?.port || 3000;
        this.server.listen(port, () => {});
    }

    /**
     * Internally processes gateway event payload.
     * @param payload - Raw JSON payload received.
     */
    private async handleGatewayEvent(payload: any) {
        const server = this.resolveServer(payload.server);
        if (!server) return;

        const events = payload.events;
        for (const event of events) {
            if (event.event === 'WebhookProbe') {
                this.client.emit(ERLCEvents.webhookProbe, server);
            } else if (event.event === 'EmergencyCallStarted') {
                server.emergencyCalls.addCall(event.data);
            } else if (event.event === 'EmergencyCallEnded') {
                server.emergencyCalls.removeCall(event.data);
            } else if (event.event === 'CustomCommand') {
                let command = event.data?.command?.trim();
                if (!command) continue;
                if (command.startsWith(';')) command = command.slice(1);
                const args = parseArgs(event.data?.argument ?? '');
                let player = server.players.cache.get(Number(event.origin));
                if (!player) {
                    await server.waitFor(ERLCEvents.poll, 5000);
                    player = server.players.cache.get(Number(event.origin));
                    if (!player) continue;
                }
                this.client.emit(
                    ERLCEvents.customCommand,
                    player,
                    command,
                    args,
                );
            }
        }
    }

    /**
     * Resolves a server by the webhook payload's server field.
     */
    private resolveServer(serverId: string): Server | undefined {
        const server = this.client.servers.resolve(serverId);
        if (!server) {
            this.client._emitError(new ServerNotConfiguredError(String(serverId)));
            return undefined;
        }
        return server;
    }

    /** Closes the webhook server. */
    public close() {
        this.server.close();
    }
}
