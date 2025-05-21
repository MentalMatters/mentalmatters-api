import type { Context, Elysia } from "elysia";
import type {
	HTTPMethod,
	PerMethodRateLimit,
	RateLimitKeyType,
	RateLimitPluginOptions,
	RateLimitStore,
	RouteRateLimitConfig,
} from "@/@types/plugins/rate-limit";
import { formatResponse } from "@/utils";
import { getKey } from "./get-key";
import { MemoryFixedWindowStore } from "./stores/memory-fixed";
import { MemorySlidingWindowStore } from "./stores/memory-sliding";
import { MemoryTokenBucketStore } from "./stores/memory-token-bucket";
import { RedisSlidingWindowStore } from "./stores/redis-sliding";

// --- Type guard for per-method config ---
function isPerMethodRateLimit(obj: unknown): obj is PerMethodRateLimit {
	if (!obj || typeof obj !== "object") return false;
	const methodKeys = [
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"PATCH",
		"OPTIONS",
		"HEAD",
	];
	return methodKeys.some((k) => k in obj);
}

// Helper: Get exactRouteMatch from config (per-route or per-method)
function getRouteExactMatch(
	routeConfig: RouteRateLimitConfig | PerMethodRateLimit,
	method: HTTPMethod,
): boolean {
	if (isPerMethodRateLimit(routeConfig) && method in routeConfig) {
		const methodConfig = (routeConfig as PerMethodRateLimit)[method];
		if (
			methodConfig &&
			typeof methodConfig === "object" &&
			"exactRouteMatch" in methodConfig
		) {
			return !!methodConfig.exactRouteMatch;
		}
	}
	if (
		routeConfig &&
		typeof routeConfig === "object" &&
		"exactRouteMatch" in routeConfig
	) {
		return !!routeConfig.exactRouteMatch;
	}
	return false; // default: prefix match
}

function normalizePath(path: string): string {
	// Remove trailing slash unless it's the root "/"
	return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

// Helper: Find route config by exact or prefix match, per-route/per-method
function findRouteConfig(
	routes: Record<string, RouteRateLimitConfig | PerMethodRateLimit>,
	routeKey: string,
	method: HTTPMethod,
): {
	config: RouteRateLimitConfig | PerMethodRateLimit | undefined;
	matchedKey: string | null;
} {
	let matchedKey: string | null = null;
	let matchedConfig: RouteRateLimitConfig | PerMethodRateLimit | undefined;
	let longestPrefix = -1;

	const normalizedRouteKey = normalizePath(routeKey);

	for (const key in routes) {
		const config = routes[key];
		const exact = getRouteExactMatch(config, method);
		const normalizedKey = normalizePath(key);

		if (exact) {
			if (normalizedRouteKey === normalizedKey) {
				if (normalizedKey.length > longestPrefix) {
					matchedKey = key;
					matchedConfig = config;
					longestPrefix = normalizedKey.length;
				}
			}
		} else {
			if (
				normalizedRouteKey === normalizedKey ||
				normalizedRouteKey.startsWith(`${normalizedKey}/`)
			) {
				if (normalizedKey.length > longestPrefix) {
					matchedKey = key;
					matchedConfig = config;
					longestPrefix = normalizedKey.length;
				}
			}
		}
	}
	return { config: matchedConfig, matchedKey };
}

export function rateLimitPlugin<
	TErrorBody = { error: string; message: string },
>(options: RateLimitPluginOptions<TErrorBody> = {}) {
	let global = options.global ?? { windowMs: 60_000, max: 60 };
	let routes = options.routes ?? {};
	let whitelist = options.whitelist ?? [];
	let blacklist = options.blacklist ?? [];
	const getServer = options.getServer ?? (() => null);

	const debug = options.debug ?? false;
	const logDebug = (...args: unknown[]) => {
		if (debug) console.debug(...args);
	};

	const {
		keyType = "ip",
		getId,
		extractKey,
		store,
		algorithm = "sliding-window",
		headers = {
			enabled: true,
			names: {
				limit: "X-RateLimit-Limit",
				remaining: "X-RateLimit-Remaining",
				reset: "X-RateLimit-Reset",
				retryAfter: "Retry-After",
			},
		},
		onLimitExceeded,
		onWhitelist,
		onBlacklist,
		failOpen = true,
		messages,
	} = options;

	const limitExceeded =
		messages?.limitExceeded ??
		((_ctx: Context, retryAfter: number) =>
			`Rate limit exceeded. Try again in ${Math.ceil(
				retryAfter / 1000,
			)} seconds.`);

	const blacklisted =
		messages?.blacklisted ??
		(() => "You are not allowed to access this resource.");

	function setGlobal(newGlobal: typeof global) {
		global = newGlobal;
		logDebug("[RateLimit] Global config updated:", global);
	}
	function setRoutes(newRoutes: typeof routes) {
		routes = newRoutes;
		logDebug("[RateLimit] Routes config updated:", routes);
	}
	function setWhitelist(newWhitelist: typeof whitelist) {
		whitelist = newWhitelist;
		logDebug("[RateLimit] Whitelist updated:", whitelist);
	}
	function setBlacklist(newBlacklist: typeof blacklist) {
		blacklist = newBlacklist;
		logDebug("[RateLimit] Blacklist updated:", blacklist);
	}

	let selectedStore: RateLimitStore;
	if (store) {
		selectedStore = store;
		logDebug("[RateLimit] Using custom store");
	} else {
		switch (algorithm) {
			case "fixed-window":
				selectedStore = new MemoryFixedWindowStore();
				break;
			case "token-bucket":
				selectedStore = new MemoryTokenBucketStore();
				break;
			default:
				selectedStore = new MemorySlidingWindowStore();
				break;
		}
		logDebug(`[RateLimit] Using algorithm: ${algorithm}`);
	}

	const plugin = (app: Elysia) => {
		app.onBeforeHandle(async (ctx: Context) => {
			let routeKey: string;
			if (
				typeof ctx.route === "object" &&
				ctx.route &&
				"path" in ctx.route &&
				typeof (ctx.route as { path?: string }).path === "string"
			) {
				routeKey = (ctx.route as { path: string }).path;
			} else {
				routeKey = ctx.path;
			}

			const method = ctx.request.method as HTTPMethod;
			const { config: routeConfig, matchedKey } = findRouteConfig(
				routes,
				routeKey,
				method,
			);

			let windowMs = global.windowMs;
			let max = global.max;
			let routeKeyType = keyType;

			if (routeConfig) {
				if (isPerMethodRateLimit(routeConfig) && method in routeConfig) {
					const methodConfig = (routeConfig as PerMethodRateLimit)[method];
					if (methodConfig) {
						windowMs = methodConfig.windowMs ?? windowMs;
						max = methodConfig.max ?? max;
						routeKeyType = methodConfig.keyType ?? routeKeyType;
					}
				} else {
					windowMs =
						(routeConfig as { windowMs?: number }).windowMs ?? windowMs;
					max = (routeConfig as { max?: number }).max ?? max;
					routeKeyType =
						(routeConfig as { keyType?: RateLimitKeyType }).keyType ??
						routeKeyType;
				}
			}

			logDebug(
				"[RateLimit] Route:",
				routeKey,
				"Method:",
				method,
				"windowMs:",
				windowMs,
				"max:",
				max,
				"keyType:",
				routeKeyType,
			);

			const id = getKey({
				ctx,
				keyType: routeKeyType,
				getId,
				extractKey,
				server: getServer(),
				debug,
			});
			logDebug("[RateLimit] Extracted key:", id);

			if (!id) {
				logDebug("[RateLimit] No key extracted, skipping rate limit.");
				return;
			}

			if (whitelist.includes(id)) {
				logDebug("[RateLimit] Whitelisted:", id);
				if (onWhitelist) onWhitelist(ctx, id);
				return;
			}
			if (blacklist.includes(id)) {
				logDebug("[RateLimit] Blacklisted:", id);
				if (onBlacklist) onBlacklist(ctx, id);
				return formatResponse({
					body: {
						error: "Blacklisted",
						message: blacklisted(ctx),
					},
					status: 429,
				});
			}

			const key = `ratelimit:${routeKeyType}:${id}:${matchedKey ?? routeKey}:${method}`;
			logDebug("[RateLimit] Store key:", key);

			let current: number;
			let reset: number;
			try {
				if (
					algorithm === "token-bucket" &&
					selectedStore instanceof MemoryTokenBucketStore
				) {
					const result = await selectedStore.incr(key, windowMs, max);
					current = result.current;
					reset = result.reset;
				} else {
					const result = await selectedStore.incr(key, windowMs);
					current = result.current;
					reset = result.reset;
				}
				logDebug("[RateLimit] Store result:", { current, reset });
			} catch (err) {
				console.error("[RateLimit] Store error:", err);
				if (failOpen) {
					console.warn(
						"[RateLimit] Store failed, failOpen=true, allowing request.",
					);
					return;
				}
				return formatResponse({
					body: {
						error: "RateLimitStoreUnavailable",
						message: "Rate limit backend unavailable. Please try again later.",
					},
					status: 503,
				});
			}

			const remaining = Math.max(0, max - current);
			const retryAfter = reset - Date.now();

			if (headers.enabled && headers.names) {
				ctx.set.headers[headers.names.limit ?? "X-RateLimit-Limit"] =
					String(max);
				ctx.set.headers[headers.names.remaining ?? "X-RateLimit-Remaining"] =
					String(remaining);
				ctx.set.headers[headers.names.reset ?? "X-RateLimit-Reset"] = String(
					Math.floor(reset / 1000),
				);
				if (current > max) {
					ctx.set.headers[headers.names.retryAfter ?? "Retry-After"] = String(
						Math.ceil(retryAfter / 1000),
					);
				}
			}

			if (current > max) {
				logDebug("[RateLimit] Limit exceeded for key:", key, {
					current,
					max,
					reset,
				});
				if (onLimitExceeded) onLimitExceeded(ctx, key, { current, max, reset });
				return formatResponse({
					body: {
						error: "Too Many Requests",
						message: limitExceeded(ctx, retryAfter),
					},
					status: 429,
				});
			}

			logDebug("[RateLimit] Allowed:", {
				key,
				current,
				max,
				remaining,
				reset,
			});
		});

		app.decorate("rateLimitStore", selectedStore);
		app.decorate("setRateLimitGlobal", setGlobal);
		app.decorate("setRateLimitRoutes", setRoutes);
		app.decorate("setRateLimitWhitelist", setWhitelist);
		app.decorate("setRateLimitBlacklist", setBlacklist);

		return app;
	};

	Object.assign(plugin, {
		setGlobal,
		setRoutes,
		setWhitelist,
		setBlacklist,
	});

	return plugin;
}

export {
	MemorySlidingWindowStore,
	MemoryFixedWindowStore,
	MemoryTokenBucketStore,
	RedisSlidingWindowStore,
};
