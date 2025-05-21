import { and, eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils"; // <-- import
import { db } from "../../db";
import { ApiKeyRole, moods } from "../../db/schema";
import { moodsAdminRoute } from "./admin";
import { createMoodSchema, getMoodsSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const moodsRoute = new Elysia({ prefix: "/moods" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

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

			return formatResponse({
				body: {
					message: "Mood created",
					mood: createdMood,
				},
				status: 201,
			});
		},
		{ body: createMoodSchema },
	)

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

			return formatResponse({
				body: { moods: allMoods },
				status: 200,
			});
		},
		{ query: getMoodsSchema },
	)

	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid mood ID" },
					status: 400,
				});
			}

			const [mood] = await db.select().from(moods).where(eq(moods.id, id));

			if (!mood) {
				return formatResponse({
					body: { message: "Mood not found" },
					status: 404,
				});
			}

			return formatResponse({
				body: { mood },
				status: 200,
			});
		},
		{ params: idParamSchema },
	)
	.use(moodsAdminRoute);
