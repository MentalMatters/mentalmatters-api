import { and, eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { db } from "../../db";
import { ApiKeyRole, moods } from "../../db/schema";
import { moodsAdminRoute } from "./admin";
import { createMoodSchema, getMoodsSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const moodsRoute = new Elysia({ prefix: "/moods" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER })) // API key required, no admin

	// Create mood
	.post(
		"/",
		async ({ body }) => {
			const [createdMood] = await db
				.insert(moods)
				.values({
					name: body.name,
					description: body.description,
					emoji: body.emoji,
					language: body.language,
				})
				.returning();

			return new Response(
				JSON.stringify({
					message: "Mood created",
					mood: createdMood,
				}),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			);
		},
		{ body: createMoodSchema },
	)

	// Get all moods (with optional filtering)
	.get(
		"/",
		async ({ query }) => {
			const filters = [
				query.language ? eq(moods.language, query.language) : undefined,
			].filter(Boolean);

			const allMoods = await db
				.select()
				.from(moods)
				.where(filters.length ? and(...filters) : undefined);

			return new Response(JSON.stringify({ moods: allMoods }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ query: getMoodsSchema },
	)

	// Get mood by ID
	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(JSON.stringify({ message: "Invalid mood ID" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [mood] = await db.select().from(moods).where(eq(moods.id, id));

			if (!mood) {
				return new Response(JSON.stringify({ message: "Mood not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ mood }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: idParamSchema },
	)
	.use(moodsAdminRoute);
