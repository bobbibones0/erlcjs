import { Server, createServer } from 'node:http';
import { Client, ERLCEvents } from '../client/client.js';

/**
 * Webhook Server for handling real-time gateway events pushed by ER:LC.
 * @public
 */
export class WebhookServer {
    private readonly server: Server;

    /**
     * Creates an instance of WebhookServer.
     * @param client - The ERLCApi client.
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
                        this.handleGatewayEvent(payload).catch((err) => this.client.emit('error', err));

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ received: true }));
                    } catch (err) {
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
        const events = payload.events;
        for (const event of events) {
            if (event.event === 'WebhookProbe') {
                this.client.emit(ERLCEvents.webhookProbe);
            } else if (event.event === 'EmergencyCallStarted') {
                this.client.emergencyCalls.addCall(event.data);
            } else if (event.event === 'EmergencyCallEnded') {
                this.client.emergencyCalls.removeCall(event.data);
            } else if (event.event === 'CustomCommand') {
                let command = event.data?.command?.trim();
                if (!command) continue;
                if (command.startsWith(';')) command = command.slice(1);
                const args = event.data?.argument ? event.data.argument.trim().split(' ') : [];
                let player = this.client.players.cache.get(Number(event.origin));
                if (!player) {
                    await this.client.waitFor(ERLCEvents.poll, 5000);
                    player = this.client.players.cache.get(Number(event.origin));
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

    /** Closes the webhook server. */
    public close() {
        this.server.close();
    }
}
