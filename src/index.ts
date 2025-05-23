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

const { RATE_LIMIT_HEADERS, RATE_LIMIT_VERBOSE } = Bun.env;

export const app = new Elysia()
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
	.get(
		"/",
		(ctx) =>
			formatResponse({
				body: {
					message:
						"Hello, friend! Remember, you matter and support is always here for you. Take care.",
					docs: `${ctx.request.url}docs`,
					github: "https://github.com/mentalmatters/mentalmatters-api",
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
