import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";
import type { Server } from "elysia/dist/universal/server";
import { formatResponse } from "@/utils";
import { rateLimitPlugin } from "./plugins/rate-limit";
import { affirmationsRoute } from "./routes/affirmations";
import { apiKeysRoute } from "./routes/api-keys";
import { languagesRoute } from "./routes/languages";
import { moodsRoute } from "./routes/moods";
import { quotesRoute } from "./routes/quotes";
import { resourcesRoute } from "./routes/resources";
import { tagsRoute } from "./routes/tags";

// Use 5177 as default if process.env.PORT is not set or invalid
const PORT = Number(process.env.PORT) || 5177;

export let server: Server | null = null;

const { RATE_LIMIT_HEADERS, RATE_LIMIT_VERBOSE, NODE_ENV } = Bun.env;
const isProduction = NODE_ENV === "production";

export const app = new Elysia()
	// CORS configuration
	.use(
		cors({
			origin: isProduction
				? [
						"https://mentalmatters.tdanks.com",
						"https://api-mentalmatters.tdanks.com",
					]
				: true, // Allow all origins in development
			credentials: true,
			methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
		}),
	)
	// Security headers middleware
	.use((app) =>
		app.onRequest(({ set }) => {
			// Security headers
			set.headers["X-Content-Type-Options"] = "nosniff";
			set.headers["X-Frame-Options"] = "DENY";
			set.headers["X-XSS-Protection"] = "1; mode=block";
			set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
			set.headers["Permissions-Policy"] =
				"camera=(), microphone=(), geolocation=()";

			if (isProduction) {
				set.headers["Strict-Transport-Security"] =
					"max-age=31536000; includeSubDomains";
			}
		}),
	)
	.use(
		swagger({
			path: "/docs",

			documentation: {
				info: {
					title: "MentalMatters API",
					version: "1.0.0",
					description: "Making mental health accessible to everyone.",
				},
				tags: [
					{
						name: "Affirmations",
						description:
							"Affirmations are positive statements that can be used to boost mental well-being.",
					},
					{
						name: "Languages",
						description:
							"Supported languages for content localization, enabling mental health resources to be accessible across different cultures and regions.",
					},
					{
						name: "Moods",
						description:
							"Emotional states categorized to help users identify, track, and understand their feelings as part of mental wellness management.",
					},
					{
						name: "Quotes",
						description:
							"Inspirational and supportive statements from various sources that provide motivation, comfort, and perspective for mental health journeys.",
					},
					{
						name: "Resources",
						description:
							"Curated mental health support services, tools, and educational materials for crisis intervention and ongoing wellness.",
					},
					{
						name: "Tags",
						description:
							"Categorization labels that organize content by themes, making it easier to find relevant mental health resources and information.",
					},
					{
						name: "API Keys",
						description:
							"API keys for authentication and access control to the Mental Matters API.",
					},
				],
			},
		}),
	)
	// Enhanced rate limiting with tiers
	.use(
		rateLimitPlugin({
			windowMs: 60_000, // 1 minute default
			max: 100, // Increased default limit
			headers: RATE_LIMIT_HEADERS === "true",
			verbose: RATE_LIMIT_VERBOSE === "true",
			algorithm: "sliding-window", // Better algorithm for burst protection
			message: "Too many requests, please try again later.",
			skipIfAdmin: true,
			// Tiered rate limits for different endpoints
			tiers: [
				// Public read endpoints - more generous limits
				{
					path: "/affirmations",
					max: 200,
					windowMs: 60_000,
					method: "GET",
				},
				{
					path: "/quotes",
					max: 200,
					windowMs: 60_000,
					method: "GET",
				},
				{
					path: "/resources",
					max: 200,
					windowMs: 60_000,
					method: "GET",
				},
				{
					path: "/moods",
					max: 200,
					windowMs: 60_000,
					method: "GET",
				},
				{
					path: "/languages",
					max: 200,
					windowMs: 60_000,
					method: "GET",
				},
				{
					path: "/tags",
					max: 200,
					windowMs: 60_000,
					method: "GET",
				},
				// Admin endpoints - stricter limits
				{
					path: "/admin",
					max: 30,
					windowMs: 60_000,
				},
				// API key management - very strict
				{
					path: "/api-keys",
					max: 10,
					windowMs: 60_000,
				},
				// Documentation - generous
				{
					path: "/docs",
					max: 500,
					windowMs: 60_000,
				},
			],
			// Skip rate limiting for health checks and static assets
			skipPaths: ["/health", "/favicon.ico", "/robots.txt"],
		}),
	)

	// Health check endpoint
	.get(
		"/health",
		() =>
			formatResponse({
				body: {
					status: "healthy",
					timestamp: new Date().toISOString(),
					uptime: process.uptime(),
				},
				status: 200,
			}),
		{
			detail: {
				tags: ["Health"],
				summary: "Health Check",
				description: "Check if the API is running properly.",
			},
		},
	)

	// Root route
	.get(
		"/",
		(ctx) =>
			formatResponse({
				body: {
					message:
						"Hello, friend! Remember, you matter and support is always here for you. Take care.",
					docs: `${ctx.request.url}docs`,
					github: "https://github.com/mentalmatters/mentalmatters-api",
					health: `${ctx.request.url}health`,
				},
				status: 200,
			}),
		{
			detail: {
				tags: ["Root"],
				summary: "Welcome to MentalMatters API",
				description: "The root route of the API, providing a welcome message.",
			},
		},
	)

	// API routes
	.use(affirmationsRoute)
	.use(languagesRoute)
	.use(moodsRoute)
	.use(quotesRoute)
	.use(resourcesRoute)
	.use(tagsRoute)
	.use(apiKeysRoute)

	// Request size limit middleware
	.onRequest(({ request, set }) => {
		const contentLength = request.headers.get("content-length");
		if (contentLength && Number.parseInt(contentLength) > 1024 * 1024) {
			// 1MB limit
			set.status = 413;
			return formatResponse({
				body: {
					message: "Request entity too large. Maximum size is 1MB.",
				},
				status: 413,
			});
		}
	})

	// Global error handler (handles 404 and other errors)
	.onError(({ code, error, request }) => {
		// Generate request ID for tracking
		const requestId = crypto.randomUUID();

		// Log error with request ID
		console.error(`[${requestId}] Error:`, {
			code,
			error: error instanceof Error ? error.message : String(error),
			url: request.url,
			method: request.method,
			userAgent: request.headers.get("user-agent"),
			ip:
				request.headers.get("x-forwarded-for") ||
				request.headers.get("x-real-ip"),
		});

		if (code === "NOT_FOUND") {
			return formatResponse({
				body: {
					message:
						"Welcome, friend! The resource you're looking for was not found, but support is always here for you.",
					path: request.url,
					requestId,
				},
				status: 404,
			});
		}

		if (code === "VALIDATION") {
			return formatResponse({
				body: {
					message:
						"Invalid request data. Please check your input and try again.",
					requestId,
				},
				status: 400,
			});
		}

		// Don't expose internal errors in production
		const errorMessage = isProduction
			? "Oops! Something went wrong, and we're on it. Please try again later."
			: error instanceof Error
				? error.message
				: String(error);

		return formatResponse({
			body: {
				message: errorMessage,
				requestId,
				...(isProduction
					? {}
					: { stack: error instanceof Error ? error.stack : undefined }),
			},
			status: 500,
		});
	})

	// Start the server
	.listen(PORT, async (server) => {
		console.log(
			`❤️‍🩹 MentalMatters API is now running on: ${server.hostname}:${server.port}`,
		);
		console.log(
			`📚 API Documentation: http://${server.hostname}:${server.port}/docs`,
		);
		console.log(
			`🏥 Health Check: http://${server.hostname}:${server.port}/health`,
		);
		console.log(`🌍 Environment: ${NODE_ENV || "development"}`);
		await import("./cron");
	});

server = app.server;
