import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils"; // <-- import
import { db } from "../../db";
import { ApiKeyRole, tags } from "../../db/schema";
import { updateTagSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const tagsAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	.put(
		"/:id",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid tag ID" },
					status: 400,
				});
			}

			const [existing] = await db.select().from(tags).where(eq(tags.id, id));

			if (!existing) {
				return formatResponse({
					body: { message: "Tag not found" },
					status: 404,
				});
			}

			const [updated] = await db
				.update(tags)
				.set({
					name: body.name ?? existing.name,
				})
				.where(eq(tags.id, id))
				.returning();

			return formatResponse({
				body: {
					message: "Tag updated",
					tag: updated,
				},
				status: 200,
			});
		},
		{ body: updateTagSchema, params: idParamSchema },
	)

	.delete(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid tag ID" },
					status: 400,
				});
			}

			const [deleted] = await db
				.delete(tags)
				.where(eq(tags.id, id))
				.returning();

			if (!deleted) {
				return formatResponse({
					body: { message: "Tag not found" },
					status: 404,
				});
			}

			return formatResponse({
				body: { message: "Tag deleted" },
				status: 200,
			});
		},
		{ params: idParamSchema },
	);
