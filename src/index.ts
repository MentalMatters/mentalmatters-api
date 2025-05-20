import { Elysia } from "elysia";
import type { Server } from "elysia/dist/universal/server";
import { rateLimitPlugin } from "./plugins/rate-limit";
import { affirmationsRoute } from "./routes/affirmations";

export let server: Server | null = null;

export const app = new Elysia()
	.use(
		rateLimitPlugin({
			algorithm: "fixed-window",
			getServer: () => server,
			routes: {
				"/affirmations/": {
					POST: {
						max: 1,
						windowMs: 30_0000, // 30 minutes
					},
				},
			},
		}),
	)
	.get("/", () => "Hello Elysia")
	.use(affirmationsRoute)
	.listen(3000, (server) => {
		console.log(
			`❤️‍🩹 MentalMatters api running on: ${server.hostname}:${server.port}`,
		);
	});

server = app.server;
