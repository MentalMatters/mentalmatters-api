import { and, eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, resources } from "../../db/schema";
import { resourcesAdminRoute } from "./admin";
import { getResourcesSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const resourcesRoute = new Elysia({ prefix: "/resources" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

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

			return formatResponse({
				body: { resources: allResources },
				status: 200,
			});
		},
		{ query: getResourcesSchema },
	)

	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid resource ID" },
					status: 400,
				});
			}

			const [resource] = await db
				.select()
				.from(resources)
				.where(eq(resources.id, id));

			if (!resource) {
				return formatResponse({
					body: { message: "Resource not found" },
					status: 404,
				});
			}

			return formatResponse({
				body: { resource },
				status: 200,
			});
		},
		{ params: idParamSchema },
	)
	.use(resourcesAdminRoute);
