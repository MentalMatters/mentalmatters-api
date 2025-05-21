import type { Redis } from "ioredis";
import type { RateLimitStore } from "@/@types/plugins/rate-limit";

export class RedisSlidingWindowStore implements RateLimitStore {
	constructor(private redis: Redis) {}

	async incr(key: string, windowMs: number) {
		const now = Date.now();
		const windowStart = now - windowMs;
		const member = `${now}-${Math.random()}`;
		const pipeline = this.redis.pipeline();
		pipeline.zadd(key, now, member);
		pipeline.zremrangebyscore(key, 0, windowStart);
		pipeline.zcard(key);
		pipeline.zrange(key, 0, 0);
		pipeline.pexpire(key, windowMs);
		const results = await pipeline.exec();

		const current = Number(results?.[2]?.[1] ?? 0);
		const zrangeResult = results?.[3]?.[1];
		let oldest = now;
		if (Array.isArray(zrangeResult) && zrangeResult.length > 0) {
			const [oldestMember] = zrangeResult;
			const [timestampStr] = oldestMember.split("-");
			const parsed = Number(timestampStr);
			if (!Number.isNaN(parsed)) {
				oldest = parsed;
			}
		}
		const reset = oldest + windowMs;
		return { current, reset };
	}

	async resetKey(key: string) {
		await this.redis.del(key);
	}
}
