import type { Context } from "elysia";
import type { Server } from "elysia/dist/universal/server";

export interface RateLimitPluginMessages {
	limitExceeded?: (ctx: Context, retryAfter: number) => string;
	blacklisted?: (ctx: Context) => string;
	whitelisted?: (ctx: Context) => string;
}

export type RateLimitKeyType = "ip" | "apiKey";
export type RateLimitAlgorithm =
	| "sliding-window"
	| "fixed-window"
	| "token-bucket";
export type HTTPMethod =
	| "GET"
	| "POST"
	| "PUT"
	| "DELETE"
	| "PATCH"
	| "OPTIONS"
	| "HEAD";

export interface RateLimitWindow {
	windowMs: number;
	max: number;
}

export interface RateLimitHeaders {
	limit?: string;
	remaining?: string;
	reset?: string;
	retryAfter?: string;
}

export type PerMethodRateLimit = Partial<
	Record<HTTPMethod, Partial<RateLimitWindow> & { keyType?: RateLimitKeyType }>
>;

export interface RateLimitStore {
	incr(
		key: string,
		windowMs: number,
		max?: number,
	): Promise<{ current: number; reset: number }>;
	resetKey(key: string): Promise<void>;
}

export interface RateLimitPluginOptions<
	TErrorBody = { error: string; message: string },
> {
	messages?: RateLimitPluginMessages;
	debug?: boolean;
	algorithm?: RateLimitAlgorithm;
	keyType?: RateLimitKeyType;
	global?: RateLimitWindow;
	routes?: Record<
		string,
		| (Partial<RateLimitWindow> & { keyType?: RateLimitKeyType })
		| PerMethodRateLimit
	>;
	whitelist?: (string | number)[];
	blacklist?: (string | number)[];
	getId?: (ctx: Context) => string | number | undefined;
	store?: RateLimitStore;
	headers?: {
		enabled?: boolean;
		names?: RateLimitHeaders;
	};
	errorResponse?: (ctx: Context, retryAfter: number) => TErrorBody;
	extractKey?: (ctx: Context) => string | number | undefined;
	onLimitExceeded?: (
		ctx: Context,
		key: string,
		info: { current: number; max: number; reset: number },
	) => void;
	onWhitelist?: (ctx: Context, key: string | number) => void;
	onBlacklist?: (ctx: Context, key: string | number) => void;
	failOpen?: boolean;
	getServer?: () => Server | null;
}
