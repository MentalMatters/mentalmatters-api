import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, moods } from "../../db/schema";
import { createMoodSchema, updateMoodSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const moodsAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	.put(
		"/:id",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid mood ID" },
					status: 400,
				});
			}

			const [existing] = await db.select().from(moods).where(eq(moods.id, id));

			if (!existing) {
				return formatResponse({
					body: { message: "Mood not found" },
					status: 404,
				});
			}

			const [updated] = await db
				.update(moods)
				.set({
					name: body.name ?? existing.name,
					description: body.description ?? existing.description,
					emoji: body.emoji ?? existing.emoji,
					language: body.language ?? existing.language,
					updatedAt: new Date(),
				})
				.where(eq(moods.id, id))
				.returning();

			return formatResponse({
				body: {
					message: "Mood updated",
					mood: updated,
				},
				status: 200,
			});
		},
		{ body: updateMoodSchema, params: idParamSchema },
	)

	.delete(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid mood ID" },
					status: 400,
				});
			}

			const [deleted] = await db
				.delete(moods)
				.where(eq(moods.id, id))
				.returning();

			if (!deleted) {
				return formatResponse({
					body: { message: "Mood not found" },
					status: 404,
				});
			}

			return formatResponse({
				body: { message: "Mood deleted" },
				status: 200,
			});
		},
		{ params: idParamSchema },
	)

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
	);
