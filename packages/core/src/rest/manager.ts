import { ERLCAPIError, InvalidCommandError, InvalidGlobalKeyError, InvalidServerKeyError, OutOfDateServerError, ProhibitedMessageError, RestrictedCommandError, RestrictedResourceError, ServerBannedError, ServerOfflineError, UnauthorizedError } from '../errors/index.js';

/** Extra time added to rate-limit window resets to avoid racing the server (covers second-truncated reset headers). */
const SAFETY_BUFFER_MS = 1000;
/** The shared per-IP bucket every route falls back to until its bucket is learned. */
const GLOBAL_BUCKET = 'global';
/** Maximum in-flight requests before the first rate-limit headers have been received. */
const COLD_START_MAX_INFLIGHT = 1;
/** Hard cap on concurrent in-flight requests once rate-limit headers have been received. */
const MAX_CONCURRENCY = 30;
/** Maximum random jitter (ms) added to retry-after backoff. */
const RETRY_JITTER_MS = 1000;

interface BucketInfo {
    /** Whether real rate-limit headers have been observed for this bucket. */
    known: boolean;
    /** The maximum requests allowed per window. */
    limit: number;
    /** Server-reported remaining requests in the current window. */
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
 * Buckets are gated conservatively: the server-reported remaining budget is reduced
 * by tracked in-flight requests, and no request is dispatched while that effective
 * budget is exhausted. A bucket's queue is frozen (with jittered backoff) while a
 * `Retry-After` response is active, and window resets include a small safety buffer
 * to avoid racing the server. In-flight concurrency is hard-capped to bound bursts.
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
        const jitter = Math.floor(Math.random() * RETRY_JITTER_MS);
        bucket.frozenUntil = Date.now() + retryAfterMs + SAFETY_BUFFER_MS + jitter;
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
     * useful for monitoring and debugging. `remaining` is the server-reported
     * budget; `effective` subtracts in-flight requests to show the usable budget.
     * @returns A record of bucket ID to rate-limit state.
     */
    public getRateLimits(): Record<string, { limit: number; remaining: number; effective: number; reset: number; inflight: number; frozenUntil: number }> {
        const snapshot: Record<string, { limit: number; remaining: number; effective: number; reset: number; inflight: number; frozenUntil: number }> = {};
        for (const [bucketId, bucket] of this.buckets.entries()) {
            snapshot[bucketId] = {
                limit: bucket.limit,
                remaining: bucket.remaining,
                effective: bucket.known ? bucket.remaining - bucket.inflight : Number.POSITIVE_INFINITY,
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
     * request is in flight until the first rate-limit headers reveal the shared budget,
     * after which a hard concurrency cap bounds the burst.
     */
    private get maxInflight(): number {
        return this.headersSeen ? MAX_CONCURRENCY : COLD_START_MAX_INFLIGHT;
    }

    /**
     * Processes the request queue, dispatching as many requests as the conservative
     * effective bucket budgets allow. Items whose bucket is currently blocked
     * (frozen or exhausted) are skipped so unrelated servers/buckets are not
     * stalled behind them (head-of-line blocking).
     */
    private async processQueue() {
        if (this.processing) return;
        this.processing = true;

        try {
            while (this.queue.length > 0) {
                const now = Date.now();

                if (this.inflightTotal >= this.maxInflight) {
                    this.scheduleResume(50);
                    break;
                }

                const dispatchIndex = this.findDispatchableIndex(now);
                if (dispatchIndex === -1) {
                    this.scheduleResume(this.getResumeDelay(now));
                    break;
                }

                const item = this.queue.splice(dispatchIndex, 1)[0]!;
                const bucketId = this.routeToBucket.get(item.route) ?? GLOBAL_BUCKET;
                const bucket = this.buckets.get(bucketId);
                const trackedBucket = bucket ?? this.createBucket(bucketId);
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
     * Returns the index of the first queued item whose bucket currently has
     * budget available, or -1 if every item is blocked.
     */
    private findDispatchableIndex(now: number): number {
        for (let i = 0; i < this.queue.length; i++) {
            if (this.canDispatch(this.queue[i]!, now)) return i;
        }
        return -1;
    }

    /**
     * Whether the given queued item can be dispatched right now.
     */
    private canDispatch(item: QueueItem, now: number): boolean {
        const bucketId = this.routeToBucket.get(item.route) ?? GLOBAL_BUCKET;
        const bucket = this.buckets.get(bucketId);
        if (!bucket) return true;
        if (bucket.frozenUntil > now) return false;
        if (!bucket.known) return true;
        const windowEnd = bucket.reset + SAFETY_BUFFER_MS;
        if (now >= windowEnd) {
            bucket.remaining = bucket.limit;
        }
        return bucket.remaining - bucket.inflight > 0;
    }

    /**
     * Computes how long to wait before checking the queue again, based on the
     * earliest unblock (freeze expiry or window reset) among all blocked items.
     */
    private getResumeDelay(now: number): number {
        let earliestBlockedAt = Number.POSITIVE_INFINITY;
        for (const item of this.queue) {
            const bucketId = this.routeToBucket.get(item.route) ?? GLOBAL_BUCKET;
            const bucket = this.buckets.get(bucketId);
            if (!bucket) continue;
            if (bucket.frozenUntil > now) {
                earliestBlockedAt = Math.min(earliestBlockedAt, bucket.frozenUntil);
            } else if (bucket.known && bucket.remaining - bucket.inflight <= 0) {
                earliestBlockedAt = Math.min(earliestBlockedAt, bucket.reset + SAFETY_BUFFER_MS);
            }
        }
        if (earliestBlockedAt === Number.POSITIVE_INFINITY) return 50;
        return Math.max(50, earliestBlockedAt - now + 50);
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
