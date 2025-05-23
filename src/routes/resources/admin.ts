import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, resources } from "../../db/schema";
import { createResourceSchema, updateResourceSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const resourcesAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	.post(
		"/",
		async ({ body }) => {
			const [createdResource] = await db
				.insert(resources)
				.values({
					title: body.title,
					url: body.url,
					description: body.description,
					category: body.category,
					language: body.language,
				})
				.returning();

			return formatResponse({
				body: {
					message: "Resource created",
					resource: createdResource,
				},
				status: 201,
			});
		},
		{
			body: createResourceSchema,
			detail: {
				tags: ["Admin", "Resources"],
				summary: "Create a new resource",
				description: "Create a new resource",
			},
		},
	)

	.put(
		"/:id",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid resource ID" },
					status: 400,
				});
			}

			const [existing] = await db
				.select()
				.from(resources)
				.where(eq(resources.id, id));

			if (!existing) {
				return formatResponse({
					body: { message: "Resource not found" },
					status: 404,
				});
			}

			const [updated] = await db
				.update(resources)
				.set({
					title: body.title ?? existing.title,
					url: body.url ?? existing.url,
					description: body.description ?? existing.description,
					category: body.category ?? existing.category,
					language: body.language ?? existing.language,
				})
				.where(eq(resources.id, id))
				.returning();

			return formatResponse({
				body: {
					message: "Resource updated",
					resource: updated,
				},
				status: 200,
			});
		},
		{
			body: updateResourceSchema,
			params: idParamSchema,
			detail: {
				tags: ["Admin", "Resources"],
				summary: "Update a resource",
				description: "Update a resource",
			},
		},
	)

	.delete(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid resource ID" },
					status: 400,
				});
			}

			const [deleted] = await db
				.delete(resources)
				.where(eq(resources.id, id))
				.returning();

			if (!deleted) {
				return formatResponse({
					body: { message: "Resource not found" },
					status: 404,
				});
			}

			return formatResponse({
				body: { message: "Resource deleted" },
				status: 200,
			});
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Admin", "Resources"],
				summary: "Delete a resource",
				description: "Delete a resource",
			},
		},
	);
