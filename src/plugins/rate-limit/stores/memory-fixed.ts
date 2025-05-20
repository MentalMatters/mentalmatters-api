import type { RateLimitStore } from "@/@types/plugins/rate-limit";

export class MemoryFixedWindowStore implements RateLimitStore {
	private windows = new Map<string, { count: number; reset: number }>();

	async incr(key: string, windowMs: number) {
		const now = Date.now();
		const entry = this.windows.get(key);
		if (!entry || now > entry.reset) {
			const reset = now + windowMs;
			this.windows.set(key, { count: 1, reset });
			return { current: 1, reset };
		}
		entry.count += 1;
		return { current: entry.count, reset: entry.reset };
	}

	async resetKey(key: string) {
		this.windows.delete(key);
	}
}
