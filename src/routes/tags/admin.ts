import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { db } from "../../db";
import { ApiKeyRole, tags } from "../../db/schema";
import { updateTagSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const tagsAdminRoute = new Elysia({ prefix: "/admin" })
	// Only ADMIN keys allowed for update & delete
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	// Update tag
	.put(
		"/:id",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(JSON.stringify({ message: "Invalid tag ID" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [existing] = await db.select().from(tags).where(eq(tags.id, id));

			if (!existing) {
				return new Response(JSON.stringify({ message: "Tag not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [updated] = await db
				.update(tags)
				.set({
					name: body.name ?? existing.name,
				})
				.where(eq(tags.id, id))
				.returning();

			return new Response(
				JSON.stringify({
					message: "Tag updated",
					tag: updated,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		},
		{ body: updateTagSchema, params: idParamSchema },
	)

	// Delete tag
	.delete(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(JSON.stringify({ message: "Invalid tag ID" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [deleted] = await db
				.delete(tags)
				.where(eq(tags.id, id))
				.returning();

			if (!deleted) {
				return new Response(JSON.stringify({ message: "Tag not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ message: "Tag deleted" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: idParamSchema },
	);
