import { ERLCAPIError, InvalidCommandError, InvalidGlobalKeyError, InvalidServerKeyError, OutOfDateServerError, ProhibitedMessageError, RestrictedCommandError, RestrictedResourceError, ServerBannedError, ServerOfflineError, UnauthorizedError } from '../errors/index.js';

/** Extra time added to rate-limit window resets to avoid racing the server. */
const SAFETY_BUFFER_MS = 500;
/** The shared per-IP bucket every route falls back to until its bucket is learned. */
const GLOBAL_BUCKET = 'global';
/** Maximum in-flight requests before the first rate-limit headers have been received. */
const COLD_START_MAX_INFLIGHT = 1;

interface BucketInfo {
    /** Whether real rate-limit headers have been observed for this bucket. */
    known: boolean;
    /** The maximum requests allowed per window. */
    limit: number;
    /** Optimistically decremented remaining requests in the current window. */
    remaining: number;
    /** Epoch ms when the current window resets. */
    reset: number;
    /** Requests dispatched but whose responses have not been processed yet. */
    inflight: number;
    /** Epoch ms until which dispatching to this bucket is paused (retry-after). */
    frozenUntil: number;
}

interface QueueItem {
    /** Rate-limit route key, `${serverKey}|${endpoint}`. */
    route: string;
    /** The bucket this request was dispatched to, set on dispatch. */
    bucketId?: string;
    execute: () => Promise<void>;
}

/**
 * Handles communication with the ER:LC HTTP API for all servers managed by a Client,
 * managing rate limits and request queuing on a shared per-IP budget.
 *
 * Buckets are gated optimistically: each dispatched request immediately decrements the
 * bucket's remaining budget and is tracked as in-flight until its response arrives.
 * A bucket's queue is frozen while a `Retry-After` response is active, and window
 * resets include a small safety buffer to avoid racing the server.
 * @public
 */
export class RestManager {
    private queue: QueueItem[] = [];

    private processing = false;
    private readonly baseUrl = 'https://api.erlc.gg';

    private buckets = new Map<string, BucketInfo>();
    private routeToBucket = new Map<string, string>();

    /** Total requests dispatched whose responses have not been processed yet. */
    private inflightTotal = 0;
    /** Whether at least one response with rate-limit headers has been processed. */
    private headersSeen = false;
    private resumeTimer?: NodeJS.Timeout;

    /**
     * Creates an instance of RestManager.
     * @param globalKey - The global API key for the application, if any.
     */
    constructor(private readonly globalKey?: string) {}

    /**
     * Enqueues and sends an HTTP request to the ER:LC API.
     * @param method - The HTTP method to use ('GET' or 'POST').
     * @param endpoint - The API endpoint path.
     * @param body - The optional request body payload.
     * @param serverKey - The server API key to authenticate with.
     * @returns A promise resolving to the API response data.
     * @throws {@link InvalidServerKeyError} if the server API key is invalid (403).
     * @throws Error - for other HTTP error codes.
     */
    public request(method: 'GET' | 'POST', endpoint: string, body?: any, serverKey?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxRetries = 3;
            const route = this.getRouteKey(endpoint, serverKey!);

            const executeTask = async () => {
                let response: Response;

                try {
                    response = await fetch(`${this.baseUrl}${endpoint}`, {
                        method,
                        headers: {
                            'Server-Key': serverKey!,
                            'Content-Type': 'application/json',
                            ...(this.globalKey && {
                                Authorization: `${this.globalKey}`,
                            }),
                        },
                        body: body ? JSON.stringify(body) : undefined,
                    });
                } catch (networkError) {
                    if (attempts < maxRetries) {
                        attempts++;
                        const delay = Math.pow(2, attempts) * 1000;
                        await new Promise((res) => setTimeout(res, delay));
                        return executeTask();
                    }
                    return reject(new Error(`Network error: ${networkError}`));
                }

                try {
                    this.updateRateLimits(endpoint, serverKey!, response.headers);

                    let data;
                    try {
                        data = await response.json();
                    } catch {
                        data = {};
                    }

                    if (data.code) {
                        switch (data.code) {
                            case 2000:
                            case 2001:
                            case 2002:
                                return reject(new InvalidServerKeyError());
                            case 2003:
                                return reject(new InvalidGlobalKeyError());
                            case 2004:
                                return reject(new ServerBannedError());
                            case 3001:
                                return reject(new InvalidCommandError());
                            case 3002:
                                return reject(new ServerOfflineError());
                            case 4000:
                                return reject(new UnauthorizedError());
                            case 4002:
                                return reject(new RestrictedCommandError());
                            case 4003:
                                return reject(new ProhibitedMessageError());
                            case 9998:
                                return reject(new RestrictedResourceError());
                            case 9999:
                                return reject(new OutOfDateServerError());
                        }
                    }

                    if (response.status === 403) {
                        return reject(new InvalidServerKeyError());
                    }

                    if (response.status === 429 || data.code === 4001) {
                        const bucketId = this.routeToBucket.get(route) ?? GLOBAL_BUCKET;
                        const bucket = this.buckets.get(bucketId);
                        if (bucket) bucket.remaining++; // restore the optimistic decrement
                        this.freezeBucket(bucketId, this.getRetryAfter(response, data));
                        this.queue.unshift({ route, execute: executeTask });
                        return;
                    }

                    if (response.status >= 500 && response.status < 600 || data.code === 1001 || data.code === 1002 || data.code === 0) {
                        if (attempts < maxRetries) {
                            attempts++;
                            const delay = Math.pow(2, attempts) * 1000;
                            await new Promise((res) => setTimeout(res, delay));
                            return executeTask();
                        }
                        return reject(new ERLCAPIError(`${response.status}: ${response.statusText}\n${data.code}: ${data.message}`));
                    }

                    if (!response.ok) {
                        return reject(new ERLCAPIError(`${response.status}: ${response.statusText}\n${data.code}: ${data.message}`));
                    }

                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };

            this.queue.push({ route, execute: executeTask });
            this.processQueue();
        });
    }

    /**
     * Extracts headers and updates bucket-specific ratelimit.
     */
    private updateRateLimits(endpoint: string, serverKey: string, headers: Headers) {
        const bucketId = headers.get('x-ratelimit-bucket') || GLOBAL_BUCKET;
        const limit = parseInt(headers.get('x-ratelimit-limit') || '0', 10);
        const remaining = parseInt(headers.get('x-ratelimit-remaining') || '0', 10);
        const resetHeader = headers.get('x-ratelimit-reset');

        if (resetHeader) {
            const resetTime = parseInt(resetHeader, 10) * 1000;
            const routeKey = this.getRouteKey(endpoint, serverKey);

            this.routeToBucket.set(routeKey, bucketId);

            const bucket = this.buckets.get(bucketId) ?? this.createBucket(bucketId);
            bucket.known = true;
            bucket.limit = limit;
            bucket.remaining = remaining;
            bucket.reset = resetTime;

            this.headersSeen = true;
        }
    }

    /**
     * Pauses dispatching to a bucket until the retry-after duration has cleared.
     */
    private freezeBucket(bucketId: string, retryAfterMs: number) {
        const bucket = this.buckets.get(bucketId) ?? this.createBucket(bucketId);
        bucket.frozenUntil = Date.now() + retryAfterMs + SAFETY_BUFFER_MS;
    }

    private getRetryAfter(response: Response, data: any): number {
        const header = response.headers.get('retry-after');
        if (header) {
            const seconds = Number(header);
            if (!Number.isNaN(seconds)) return seconds * 1000;
            const parsedDate = Date.parse(header);
            if (!Number.isNaN(parsedDate)) {
                return Math.max(0, parsedDate - Date.now());
            }
        }
        if (typeof data?.retry_after === 'number') return data.retry_after * 1000;
        return 5000;
    }

    /**
     * Returns a snapshot of the current rate-limit state for all known buckets,
     * useful for monitoring and debugging.
     * @returns A record of bucket ID to rate-limit state.
     */
    public getRateLimits(): Record<string, { limit: number; remaining: number; reset: number; inflight: number; frozenUntil: number }> {
        const snapshot: Record<string, { limit: number; remaining: number; reset: number; inflight: number; frozenUntil: number }> = {};
        for (const [bucketId, bucket] of this.buckets.entries()) {
            snapshot[bucketId] = {
                limit: bucket.limit,
                remaining: bucket.remaining,
                reset: bucket.reset,
                inflight: bucket.inflight,
                frozenUntil: bucket.frozenUntil,
            };
        }
        return snapshot;
    }

    /**
     * The number of requests currently in flight awaiting a response.
     */
    public get inflight(): number {
        return this.inflightTotal;
    }

    private createBucket(bucketId: string): BucketInfo {
        const bucket: BucketInfo = {
            known: false,
            limit: 0,
            remaining: 0,
            reset: 0,
            inflight: 0,
            frozenUntil: 0,
        };
        this.buckets.set(bucketId, bucket);
        return bucket;
    }

    private getRouteKey(endpoint: string, serverKey: string): string {
        return `${serverKey}|${endpoint}`;
    }

    /**
     * The maximum number of in-flight requests allowed. On cold start only a single
     * request is in flight until the first rate-limit headers reveal the shared budget.
     */
    private get maxInflight(): number {
        return this.headersSeen ? Number.POSITIVE_INFINITY : COLD_START_MAX_INFLIGHT;
    }

    /**
     * Processes the request queue, dispatching as many requests as the optimistic
     * bucket budgets allow.
     */
    private async processQueue() {
        if (this.processing) return;
        this.processing = true;

        try {
            while (this.queue.length > 0) {
                const item = this.queue[0];
                if (!item) continue;

                const bucketId = this.routeToBucket.get(item.route) ?? GLOBAL_BUCKET;
                const bucket = this.buckets.get(bucketId);
                const now = Date.now();

                if (this.inflightTotal >= this.maxInflight) {
                    this.scheduleResume(50);
                    break;
                }

                if (bucket) {
                    if (bucket.frozenUntil > now) {
                        this.scheduleResume(Math.max(0, bucket.frozenUntil - now) + 50);
                        break;
                    }
                    if (bucket.known && now >= bucket.reset) {
                        bucket.remaining = bucket.limit;
                    }
                    if (bucket.known && now < bucket.reset + SAFETY_BUFFER_MS && bucket.remaining <= 0) {
                        this.scheduleResume(Math.max(0, bucket.reset + SAFETY_BUFFER_MS - now) + 50);
                        break;
                    }
                }

                this.queue.shift();
                const trackedBucket = bucket ?? this.createBucket(bucketId);
                trackedBucket.remaining--;
                trackedBucket.inflight++;
                this.inflightTotal++;
                item.bucketId = bucketId;
                item.execute()
                    .catch(() => {})
                    .finally(() => this.onRequestComplete(item));
            }
        } finally {
            this.processing = false;
        }
    }

    /**
     * Reclaims in-flight accounting once a dispatched request has settled.
     */
    private onRequestComplete(item: QueueItem) {
        const bucket = item.bucketId ? this.buckets.get(item.bucketId) : undefined;
        if (bucket) bucket.inflight = Math.max(0, bucket.inflight - 1);
        this.inflightTotal = Math.max(0, this.inflightTotal - 1);
        this.scheduleResume(0);
    }

    /**
     * Schedules the queue to be processed again after a delay, replacing any pending schedule.
     */
    private scheduleResume(delayMs: number) {
        if (this.resumeTimer) clearTimeout(this.resumeTimer);
        this.resumeTimer = setTimeout(() => {
            this.resumeTimer = undefined;
            this.processQueue();
        }, Math.max(0, delayMs));
    }
}
