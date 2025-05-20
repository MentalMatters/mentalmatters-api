import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { db } from "../../db";
import { ApiKeyRole, moods } from "../../db/schema";
import { updateMoodSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const moodsAdminRoute = new Elysia({ prefix: "/" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN })) // admin only

	// Update mood
	.put(
		"/:id",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(JSON.stringify({ message: "Invalid mood ID" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [existing] = await db.select().from(moods).where(eq(moods.id, id));

			if (!existing) {
				return new Response(JSON.stringify({ message: "Mood not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
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

			return new Response(
				JSON.stringify({
					message: "Mood updated",
					mood: updated,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		},
		{ body: updateMoodSchema, params: idParamSchema },
	)

	// Delete mood
	.delete(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(JSON.stringify({ message: "Invalid mood ID" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [deleted] = await db
				.delete(moods)
				.where(eq(moods.id, id))
				.returning();

			if (!deleted) {
				return new Response(JSON.stringify({ message: "Mood not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ message: "Mood deleted" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: idParamSchema },
	);
