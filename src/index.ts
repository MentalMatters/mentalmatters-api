import { Elysia } from "elysia";
import type { Server } from "elysia/dist/universal/server";
import { rateLimitPlugin } from "./plugins/rate-limit";
import { affirmationsRoute } from "./routes/affirmations";
import { apiKeysRoute } from "./routes/api-keys";
import { languagesRoute } from "./routes/languages";
import { moodsRoute } from "./routes/moods";
import { quotesRoute } from "./routes/quotes";
import { resourcesRoute } from "./routes/resources";
import { tagsRoute } from "./routes/tags";

export let server: Server | null = null;

export const app = new Elysia()
	.use(
		rateLimitPlugin({
			algorithm: "fixed-window",
			getServer: () => server,
			routes: {
				"/affirmations/": {
					POST: { max: 1, windowMs: 30_0000 }, // 30 minutes
				},
				"/languages/": {
					POST: { max: 1, windowMs: 30_0000 },
				},
				"/moods/": {
					POST: { max: 1, windowMs: 30_0000 },
				},
				"/quotes/": {
					POST: { max: 1, windowMs: 30_0000 },
				},
				"/resources/": {
					POST: { max: 1, windowMs: 30_0000 },
				},
				"/tags/": {
					POST: { max: 1, windowMs: 30_0000 },
				},
				"/api-key/": {
					POST: { max: 1, windowMs: 10_800_000 }, // every 3 hours
				},
			},
		}),
	)
	.get("/", () => "Hello Elysia")
	.use(affirmationsRoute)
	.use(languagesRoute)
	.use(moodsRoute)
	.use(quotesRoute)
	.use(resourcesRoute)
	.use(tagsRoute)
	.use(apiKeysRoute)
	.listen(3000, (server) => {
		console.log(
			`❤️‍🩹 MentalMatters api is now running on: ${server.hostname}:${server.port}`,
		);
	});

server = app.server;
