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

const { RATE_LIMIT_HEADERS, RATE_LIMIT_VERBOSE } = Bun.env;

export const app = new Elysia()
	// Rate limiting plugin
	.use(
		rateLimitPlugin({
			windowMs: 60_000, // 1 minute
			max: 60,
			headers: RATE_LIMIT_HEADERS === "true",
			verbose: RATE_LIMIT_VERBOSE === "true",
			algorithm: "fixed-window",
			message: "Too many requests, please try again later.",
			skipIfAdmin: true,
		}),
	)

	// Root route
	.get("/", () =>
		formatResponse({
			body: {
				message:
					"Hello, friend! Remember, you matter and support is always here for you. Take care.",
			},
			status: 200,
		}),
	)

	// API routes
	.use(affirmationsRoute)
	.use(languagesRoute)
	.use(moodsRoute)
	.use(quotesRoute)
	.use(resourcesRoute)
	.use(tagsRoute)
	.use(apiKeysRoute)

	// Global error handler (handles 404 and other errors)
	.onError(({ code, error, request }) => {
		if (code === "NOT_FOUND") {
			return formatResponse({
				body: {
					message:
						"Welcome, friend! The resource you’re looking for was not found, but support is always here for you.",
					path: request.url,
				},
				status: 404,
			});
		}

		// Log unexpected errors for debugging
		console.error(error);

		return formatResponse({
			body: {
				message:
					"Oops! Something went wrong, and we're on it. Please try again later.",
			},
			status: 500,
		});
	})

	// Start the server
	.listen(PORT, async (server) => {
		console.log(
			`❤️‍🩹 MentalMatters API is now running on: ${server.hostname}:${server.port}`,
		);
		await import("./cron");
	});

server = app.server;
