import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { db } from "../../db";
import { ApiKeyRole, resources } from "../../db/schema";
import { createResourceSchema, updateResourceSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const resourcesAdminRoute = new Elysia({ prefix: "/admin" })
	// Only ADMIN keys allowed for mutating routes
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	// Create resource
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

			return new Response(
				JSON.stringify({
					message: "Resource created",
					resource: createdResource,
				}),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			);
		},
		{ body: createResourceSchema },
	)

	// Update resource
	.put(
		"/:id",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(
					JSON.stringify({ message: "Invalid resource ID" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const [existing] = await db
				.select()
				.from(resources)
				.where(eq(resources.id, id));

			if (!existing) {
				return new Response(JSON.stringify({ message: "Resource not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
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

			return new Response(
				JSON.stringify({
					message: "Resource updated",
					resource: updated,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		},
		{ body: updateResourceSchema, params: idParamSchema },
	)

	// Delete resource
	.delete(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(
					JSON.stringify({ message: "Invalid resource ID" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const [deleted] = await db
				.delete(resources)
				.where(eq(resources.id, id))
				.returning();

			if (!deleted) {
				return new Response(JSON.stringify({ message: "Resource not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ message: "Resource deleted" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: idParamSchema },
	);
