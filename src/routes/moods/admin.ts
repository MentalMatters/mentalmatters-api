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

	.post(
		"/",
		async ({ body }) => {
			const [created] = await db
				.insert(moods)
				.values({
					name: body.name,
					description: body.description,
					language: body.language,
					emoji: body.emoji,
				})
				.returning();

			return formatResponse({
				body: {
					message: "Mood created successfully",
					mood: created,
				},
				status: 201,
			});
		},
		{
			body: createMoodSchema,
			detail: {
				tags: ["Moods"],
				summary: "Create a new mood (Admin)",
				description: "Create a new mood entry (requires admin privileges)",
			},
		},
	)

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

			const [updated] = await db
				.update(moods)
				.set({
					name: body.name,
					description: body.description,
					language: body.language,
					emoji: body.emoji,
				})
				.where(eq(moods.id, id))
				.returning();

			if (!updated) {
				return formatResponse({
					body: { message: "Mood not found" },
					status: 404,
				});
			}

			return formatResponse({
				body: {
					message: "Mood updated successfully",
					mood: updated,
				},
				status: 200,
			});
		},
		{
			params: idParamSchema,
			body: updateMoodSchema,
			detail: {
				tags: ["Moods"],
				summary: "Update a mood (Admin)",
				description:
					"Update an existing mood entry (requires admin privileges)",
			},
		},
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
				body: {
					message: "Mood deleted successfully",
				},
				status: 200,
			});
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Moods"],
				summary: "Delete a mood (Admin)",
				description:
					"Delete an existing mood entry (requires admin privileges)",
			},
		},
	);
