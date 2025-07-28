import { eq } from "drizzle-orm";
import Elysia from "elysia";
import ms from "ms";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { formatResponse } from "@/utils";
import { buildSkipMatcher, createSkipEntryMatcher } from "./buildSkipMatcher";
import type { RateLimitOptions, RateLimitStore } from "./types";

const DEFAULT_OPTIONS: RateLimitOptions = {
	windowMs: 60_000,
	max: 10,
	message: "Too many requests, please try again later.",
	statusCode: 429,
	skipPaths: [],
	verbose: true,
	headers: true,
	scope: "global",
	algorithm: "fixed-window",
	debug: false,
	apiKeyHeaderName: "x-api-key",
	skipIfAdmin: false,
};

type TokenBucketStore = Map<
	string,
	{ tokens: number; lastRefill: number; lastRequest: number }
>;

type SlidingWindowStore = Map<
	string,
	{ requests: number[]; lastRequest: number }
>;

const getClientIdentifier = (
	request: Request,
	server: Bun.Server | null,
	keyGenerator?: (req: Request, srv: Bun.Server) => string,
): string => {
	try {
		if (keyGenerator && server) {
			const key = keyGenerator(request, server);
			return typeof key === "string" ? key : "unknown";
		}

		let ip =
			request.headers.get("x-forwarded-for") ||
			request.headers.get("x-real-ip") ||
			server?.requestIP?.(request) ||
			"unknown";

		if (ip && typeof ip === "object" && "address" in ip) {
			ip = ip.address;
		}

		if (typeof ip === "string") {
			ip = ip.replace(/^::1$/, "localhost");
			if (ip.includes(",")) {
				ip = ip.split(",")[0].trim();
			}
			return ip;
		}

		return "unknown";
	} catch (err) {
		console.error(
			`Error extracting IP: ${err instanceof Error ? err.message : String(err)}`,
		);
		return "unknown";
	}
};

export const rateLimitPlugin = (userOptions: RateLimitOptions = {}) => {
	const options = { ...DEFAULT_OPTIONS, ...userOptions };

	let ipRequests: RateLimitStore | TokenBucketStore | SlidingWindowStore;
	if (options.store) {
		ipRequests = options.store;
	} else {
		switch (options.algorithm) {
			case "token-bucket":
				ipRequests = new Map() as TokenBucketStore;
				break;
			case "sliding-window":
				ipRequests = new Map() as SlidingWindowStore;
				break;
			default:
				ipRequests = new Map() as RateLimitStore;
				break;
		}
	}

	const apiKeyHeader = options.apiKeyHeaderName?.toLowerCase() ?? "x-api-key";

	return new Elysia().onBeforeHandle(
		{ as: options.scope },
		({ request, set, path, server }) => {
			const apiKeyValue = request.headers.get(apiKeyHeader);
			let isAdminRequest = false;

			if (options.skipIfAdmin) {
				try {
					if (!apiKeyValue) {
						options.verbose &&
							console.debug("Skipping rate-limit for non-admin request");
						return;
					}

					const keyRecord = db
						.select({ role: apiKeys.role, revoked: apiKeys.revoked })
						.from(apiKeys)
						.where(eq(apiKeys.key, apiKeyValue))
						.get();

					if (keyRecord && !keyRecord.revoked && keyRecord.role === "ADMIN") {
						isAdminRequest = true;
					}
				} catch (dbError) {
					console.error(
						"Rate limiter: Database error during admin key check:",
						dbError,
					);
				}
			}

			if (isAdminRequest) {
				if (options.verbose) {
					console.log(
						`Admin key detected. Bypassing rate limit for ${request.method} ${request.url}.`,
					);
				}
				return;
			}

			if (request.method === "OPTIONS") {
				options.verbose && console.debug("Skipping rate-limit for OPTIONS");
				return;
			}

			if (options.debug) {
				options.verbose && console.debug("Debug mode: skipping rate-limit");
				return;
			}

			const shouldSkip = buildSkipMatcher(options.skipPaths);

			if (shouldSkip(path)) {
				options.verbose &&
					console.debug(`Skipping rate-limit for path: ${path}`);
				return;
			}

			const method = request.method ?? "GET";
			let tierMax = options.max ?? 10;
			let tierWindow = options.windowMs ?? 60_000;

			if (options.tiers) {
				for (const tier of options.tiers) {
					const tierShouldApply = createSkipEntryMatcher(tier.path);
					if (
						tierShouldApply(path) &&
						(!tier.method || tier.method === "ALL" || tier.method === method)
					) {
						tierMax = tier.max ?? tierMax;
						tierWindow = tier.windowMs ?? tierWindow;
						options.verbose &&
							console.debug(
								`Applying tier for ${path}: max=${tierMax}, window=${ms(
									tierWindow,
								)}`,
							);
						break;
					}
				}
			}

			const clientId = getClientIdentifier(
				request,
				server,
				options.keyGenerator,
			);
			const now = Date.now();
			let isRateLimited = false;
			let remaining = 0;
			let resetTime = 0;

			switch (options.algorithm) {
				case "token-bucket": {
					const store = ipRequests as TokenBucketStore;
					if (!store.has(clientId)) {
						store.set(clientId, {
							tokens: tierMax,
							lastRefill: now,
							lastRequest: now,
						});
						remaining = tierMax - 1;
						resetTime = now + tierWindow;
						break;
					}
					// biome-ignore lint/style/noNonNullAssertion: we know this is not null
					const bucket = store.get(clientId)!;
					const elapsed = now - bucket.lastRefill;
					const rate = tierMax / tierWindow;
					const refill = Math.floor(elapsed * rate);
					if (refill > 0) {
						bucket.tokens = Math.min(tierMax, bucket.tokens + refill);
						bucket.lastRefill = now;
					}
					if (bucket.tokens > 0) {
						bucket.tokens--;
						remaining = bucket.tokens;
						resetTime = now + Math.ceil(1 / rate);
					} else {
						remaining = 0;
						resetTime = bucket.lastRefill + Math.ceil(1 / rate);
						isRateLimited = true;
					}
					bucket.lastRequest = now;
					break;
				}
				case "sliding-window": {
					const store = ipRequests as SlidingWindowStore;
					if (!store.has(clientId)) {
						store.set(clientId, { requests: [now], lastRequest: now });
						remaining = tierMax - 1;
						resetTime = now + tierWindow;
						break;
					}
					// biome-ignore lint/style/noNonNullAssertion: we know this is not null
					const info = store.get(clientId)!;
					const windowStart = now - tierWindow;
					info.requests = info.requests.filter((t) => t >= windowStart);
					if (info.requests.length < tierMax) {
						info.requests.push(now);
						remaining = tierMax - info.requests.length;
						resetTime = info.requests[0] + tierWindow;
						info.lastRequest = now;
					} else {
						remaining = 0;
						resetTime = info.requests[0] + tierWindow;
						isRateLimited = true;
					}
					break;
				}
				default: {
					const store = ipRequests as RateLimitStore;
					if (!store.has(clientId)) {
						store.set(clientId, { count: 1, lastRequest: now });
						remaining = tierMax - 1;
						resetTime = now + tierWindow;
						break;
					}
					// biome-ignore lint/style/noNonNullAssertion: we know this is not null
					const info = store.get(clientId)!;
					if (now - info.lastRequest > tierWindow) {
						info.count = 1;
						info.lastRequest = now;
						remaining = tierMax - 1;
						resetTime = now + tierWindow;
					} else {
						info.count++;
						if (info.count <= tierMax) {
							remaining = tierMax - info.count;
							resetTime = info.lastRequest + tierWindow;
						} else {
							remaining = 0;
							resetTime = info.lastRequest + tierWindow;
							isRateLimited = true;
						}
					}
					break;
				}
			}

			if (!isRateLimited) {
				if (options.headers) {
					set.headers["X-RateLimit-Limit"] = String(tierMax);
					set.headers["X-RateLimit-Remaining"] = String(remaining);
					set.headers["X-RateLimit-Reset"] = String(
						Math.ceil(resetTime / 1000),
					);
				}
				return;
			}

			options.verbose && console.debug(`Rate limit exceeded for ${clientId}`);

			if (options.headers) {
				set.headers["X-RateLimit-Limit"] = String(tierMax);
				set.headers["X-RateLimit-Remaining"] = "0";
				set.headers["X-RateLimit-Reset"] = String(Math.ceil(resetTime / 1000));
				set.headers["Retry-After"] = String(
					Math.ceil((resetTime - now) / 1000),
				);
			}

			return formatResponse({
				body: {
					message: options.message,
					retryAfter: Math.ceil((resetTime - now) / 1000),
					resetTime: ms(resetTime - now, {
						long: true,
					}),
				},
				status: options.statusCode,
			});
		},
	);
};
