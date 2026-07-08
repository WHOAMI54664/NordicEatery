/**
 * Simple in-memory sliding-window rate limiter.
 *
 * No external dependencies. On serverless (Vercel) each instance keeps its own
 * counters, so this is a best-effort protection against spam/abuse, not a hard
 * guarantee. For stricter limits use Vercel Firewall or @upstash/ratelimit.
 */

type Bucket = {
    count: number;
    resetAt: number;
};

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;

function getClientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");

    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }

    return (
        request.headers.get("x-real-ip") ||
        request.headers.get("cf-connecting-ip") ||
        "unknown"
    );
}

function cleanup(now: number) {
    if (buckets.size < MAX_BUCKETS) return;

    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
        }
    }
}

export type RateLimitResult = {
    ok: boolean;
    /** Seconds until the window resets (useful for Retry-After). */
    retryAfter: number;
};

/**
 * Checks and increments the counter for `name` + client IP.
 *
 * @param name      Unique name of the endpoint (e.g. "orders").
 * @param request   Incoming request (used to read the client IP).
 * @param limit     Max requests per window.
 * @param windowMs  Window length in milliseconds.
 */
export function rateLimit(
    name: string,
    request: Request,
    limit: number,
    windowMs: number
): RateLimitResult {
    const now = Date.now();

    cleanup(now);

    const key = `${name}:${getClientIp(request)}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });

        return { ok: true, retryAfter: 0 };
    }

    bucket.count += 1;

    if (bucket.count > limit) {
        return {
            ok: false,
            retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
        };
    }

    return { ok: true, retryAfter: 0 };
}

/** Standard 429 response helper. */
export function rateLimitResponse(retryAfter: number) {
    return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": String(Math.max(1, retryAfter)),
            },
        }
    );
}
