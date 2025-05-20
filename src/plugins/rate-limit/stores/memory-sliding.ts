import type { RateLimitStore } from "@/@types/plugins/rate-limit";

export class MemorySlidingWindowStore implements RateLimitStore {
	private windows = new Map<string, number[]>();

	async incr(key: string, windowMs: number) {
		const now = Date.now();
		const windowStart = now - windowMs;
		let timestamps = this.windows.get(key) || [];
		timestamps = timestamps.filter((ts) => ts > windowStart);
		timestamps.push(now);
		this.windows.set(key, timestamps);
		const current = timestamps.length;
		const reset = timestamps[0] + windowMs;
		return { current, reset };
	}

	async resetKey(key: string) {
		this.windows.delete(key);
	}
}
