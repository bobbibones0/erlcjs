import { afterEach, describe, expect, it } from 'vitest';
import { RestManager } from './manager.js';

const originalFetch = globalThis.fetch;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
    globalThis.fetch = originalFetch;
});

function resp(status: number, headers: Record<string, string>, body: any = {}) {
    return {
        status,
        statusText: status === 429 ? 'Too Many Requests' : status >= 500 ? 'Error' : 'OK',
        ok: status >= 200 && status < 300,
        headers: new Headers(headers),
        json: async () => body,
    } as unknown as Response;
}

function rateHeaders(opts: { limit: number; remaining: number }) {
    return {
        'x-ratelimit-bucket': 'global',
        'x-ratelimit-limit': String(opts.limit),
        'x-ratelimit-remaining': String(opts.remaining),
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
    };
}

describe('RestManager', () => {
    it('caps at one in-flight request until the first rate-limit headers are received', async () => {
        let inflight = 0;
        let maxConcurrent = 0;
        let callCount = 0;

        globalThis.fetch = (async () => {
            inflight++;
            callCount++;
            maxConcurrent = Math.max(maxConcurrent, inflight);
            await sleep(30);
            inflight--;
            return resp(200, rateHeaders({ limit: 35, remaining: 34 }), { ok: true });
        }) as any;

        const rm = new RestManager();
        const promises = [0, 1, 2, 3, 4].map(() => rm.request('GET', '/v2/server?Players=true'));
        await sleep(5);
        expect(callCount).toBe(1);
        const results = await Promise.all(promises);
        expect(results.every((r) => r.ok === true)).toBe(true);
        expect(callCount).toBe(5);
        expect(maxConcurrent).toBeGreaterThanOrEqual(2);
    });

    it('never exceeds the optimistic bucket limit', async () => {
        let inflight = 0;
        let maxConcurrent = 0;
        let callCount = 0;

        globalThis.fetch = (async () => {
            inflight++;
            callCount++;
            maxConcurrent = Math.max(maxConcurrent, inflight);
            await sleep(20);
            inflight--;
            return resp(200, rateHeaders({ limit: 2, remaining: 2 }), { ok: true });
        }) as any;

        const rm = new RestManager();
        const results = await Promise.all([0, 1, 2, 3, 4, 5].map(() => rm.request('GET', '/x')));
        expect(results.every((r) => r.ok === true)).toBe(true);
        expect(maxConcurrent).toBeLessThanOrEqual(2);
        expect(callCount).toBe(6);
    });

    it('waits for the reset window plus a safety buffer before dispatching', async () => {
        let callCount = 0;
        const startTimes: number[] = [];
        let resetEpochMs = 0;

        globalThis.fetch = (async () => {
            const idx = callCount++;
            startTimes.push(Date.now());
            await sleep(5);
            if (idx === 0) {
                const resetSec = Math.ceil((Date.now() + 200) / 1000);
                resetEpochMs = resetSec * 1000;
                return resp(200, {
                    'x-ratelimit-bucket': 'global',
                    'x-ratelimit-limit': '1',
                    'x-ratelimit-remaining': '0',
                    'x-ratelimit-reset': String(resetSec),
                }, { ok: true });
            }
            return resp(200, rateHeaders({ limit: 1, remaining: 1 }), { ok: true });
        }) as any;

        const rm = new RestManager();
        const p1 = rm.request('GET', '/y');
        const p2 = rm.request('GET', '/y');
        const [r1, r2] = await Promise.all([p1, p2]);
        expect(r1.ok).toBe(true);
        expect(r2.ok).toBe(true);
        const resetRemaining = resetEpochMs - (startTimes[0]! + 5);
        const gap = startTimes[1]! - startTimes[0]!;
        expect(gap).toBeGreaterThanOrEqual(resetRemaining + 450);
    });

    it('freezes the bucket until retry-after clears, then retries', async () => {
        let callCount = 0;
        globalThis.fetch = (async () => {
            callCount++;
            if (callCount === 1) {
                return resp(429, { 'retry-after': '1' }, { code: 4001, message: 'rate limited' });
            }
            return resp(200, rateHeaders({ limit: 35, remaining: 34 }), { ok: true });
        }) as any;

        const rm = new RestManager();
        const t0 = Date.now();
        const result = await rm.request('GET', '/z');
        const elapsed = Date.now() - t0;
        expect(callCount).toBe(2);
        expect(result.ok).toBe(true);
        expect(elapsed).toBeGreaterThanOrEqual(1400);
    });

    it('parses an HTTP-date Retry-After header', () => {
        const rm = new RestManager();
        const response = resp(429, { 'retry-after': new Date(Date.now() + 2000).toUTCString() }, { code: 4001 });
        // @ts-expect-error private method access for testing
        const wait = rm.getRetryAfter(response, {});
        expect(wait).toBeGreaterThan(1000);
        expect(wait).toBeLessThanOrEqual(3000);
    });

    it('exposes rate limit introspection', () => {
        const rm = new RestManager();
        expect(rm.inflight).toBe(0);
        expect(rm.getRateLimits()).toEqual({});
    });
});
