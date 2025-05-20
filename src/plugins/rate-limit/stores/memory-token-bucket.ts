import type { RateLimitStore } from "@/@types/plugins/rate-limit";

/**
 * Token Bucket algorithm:
 * - Each key has a "bucket" with a max number of tokens (max).
 * - Each request consumes a token.
 * - Tokens are refilled at a steady rate (max per windowMs).
 */
export class MemoryTokenBucketStore implements RateLimitStore {
	private buckets = new Map<string, { tokens: number; lastRefill: number }>();

	async incr(key: string, windowMs: number, max = 1) {
		const now = Date.now();
		const refillInterval = windowMs;
		let bucket = this.buckets.get(key);

		if (!bucket) {
			bucket = { tokens: max, lastRefill: now };
			this.buckets.set(key, bucket);
		}

		// Calculate how many tokens to add since last refill
		const elapsed = now - bucket.lastRefill;
		if (elapsed > 0) {
			const refillTokens = Math.floor(elapsed / refillInterval) * max;
			if (refillTokens > 0) {
				bucket.tokens = Math.min(bucket.tokens + refillTokens, max);
				bucket.lastRefill = now;
			}
		}

		// Consume a token if available
		if (bucket.tokens > 0) {
			bucket.tokens -= 1;
		}

		const current = max - bucket.tokens;
		const reset =
			bucket.tokens < max
				? bucket.lastRefill + refillInterval
				: now + refillInterval;

		return { current, reset };
	}

	async resetKey(key: string) {
		this.buckets.delete(key);
	}
}
