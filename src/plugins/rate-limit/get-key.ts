import type { RateLimitKeyType } from "@/@types/plugins/rate-limit";
import type { Context } from "elysia";
import type { Server } from "elysia/dist/universal/server";

export interface GetKeyOptions {
	ctx: Context;
	keyType: RateLimitKeyType;
	getId?: (ctx: Context) => string | number | undefined;
	extractKey?: (ctx: Context) => string | number | undefined;
	server?: Server | null;
	debug?: boolean;
}

/**
 * Returns the rate limit key for the request.
 * For "ip", uses x-forwarded-for, x-real-ip, or falls back to server.requestIP(request)?.address.
 */
export function getKey({
	ctx,
	keyType,
	debug,
	extractKey,
	getId,
	server,
}: GetKeyOptions): string | number | undefined {
	if (extractKey) {
		const key = extractKey(ctx);
		if (debug) console.debug("[RateLimit] extractKey returned:", key);
		return key;
	}
	if (getId) {
		const key = getId(ctx);
		if (debug) console.debug("[RateLimit] getId returned:", key);
		return key;
	}

	switch (keyType) {
		case "ip": {
			const forwarded = ctx.request.headers.get("x-forwarded-for");
			if (forwarded) {
				if (debug)
					console.debug("[RateLimit] Using x-forwarded-for:", forwarded);
				return forwarded;
			}
			const realIp = ctx.request.headers.get("x-real-ip");
			if (realIp) {
				if (debug) console.debug("[RateLimit] Using x-real-ip:", realIp);
				return realIp;
			}
			const socketAddr = server?.requestIP(ctx.request);
			const ip = socketAddr?.address;
			if (debug)
				console.debug("[RateLimit] Using injected server.requestIP:", ip);
			return ip;
		}
		case "apiKey": {
			const apiKey = ctx.request.headers.get("x-api-key");
			if (debug) console.debug("[RateLimit] Using x-api-key:", apiKey);
			return apiKey ?? undefined;
		}
		default:
			if (debug)
				console.debug("[RateLimit] No keyType match, returning undefined");
			return undefined;
	}
}
