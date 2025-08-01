import type { LifeCycleType } from "elysia";

export type RateLimitStore = Map<
	string,
	{ count: number; lastRequest: number }
>;

export type RateLimitAlgorithm =
	| "sliding-window"
	| "fixed-window"
	| "token-bucket";

export interface RateLimitTier {
	path: string;
	windowMs?: number;
	max?: number;
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "ALL";
}

export interface RateLimitOptions {
	/** Scope */
	scope?: LifeCycleType;
	/** Time window in milliseconds */
	windowMs?: number;
	/** Maximum number of requests allowed in the time window */
	max?: number;
	/** Custom message to return when rate limit is exceeded */
	message?: string;
	/** HTTP status code to return when rate limit is exceeded */
	statusCode?: number;
	/** Skip rate limiting for certain paths */
	skipPaths?: string[];
	/** Enable detailed logging */
	verbose?: boolean;
	/** Custom key generator function */
	keyGenerator?: (request: Request, server: Bun.Server) => string;
	/** Custom store implementation */
	store?: RateLimitStore;
	/** Headers to include in the response */
	headers?: boolean;
	/** Tiered rate limits for different paths */
	tiers?: Array<RateLimitTier>;
	/** Which algorithm to use for rate limiting */
	algorithm?: RateLimitAlgorithm;
	/** Debug mode: disables/ enables the rate limit for testing */
	debug?: boolean;
	/** API key header name */
	apiKeyHeaderName?: string;
	/** Skip if user is admin */
	skipIfAdmin?: boolean;
}
