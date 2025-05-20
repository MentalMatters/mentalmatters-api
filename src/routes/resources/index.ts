import { and, eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { db } from "../../db";
import { ApiKeyRole, resources } from "../../db/schema";
import { resourcesAdminRoute } from "./admin";
import { getResourcesSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const resourcesRoute = new Elysia({ prefix: "/resources" })
	// Allow any valid USER key for public GET requests
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	// Get all resources (with optional filtering)
	.get(
		"/",
		async ({ query }) => {
			const filters = [
				query.language ? eq(resources.language, query.language) : undefined,
				query.category ? eq(resources.category, query.category) : undefined,
			].filter(Boolean);

			const allResources = await db
				.select()
				.from(resources)
				.where(filters.length ? and(...filters) : undefined);

			return new Response(JSON.stringify({ resources: allResources }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ query: getResourcesSchema },
	)

	// Get resource by ID
	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(
					JSON.stringify({ message: "Invalid resource ID" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const [resource] = await db
				.select()
				.from(resources)
				.where(eq(resources.id, id));

			if (!resource) {
				return new Response(JSON.stringify({ message: "Resource not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ resource }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: idParamSchema },
	)
	.use(resourcesAdminRoute);
