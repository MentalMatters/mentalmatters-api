import { and, desc, eq, inArray, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, resources } from "../../db/schema";
import { resourcesAdminRoute } from "./admin";
import { getResourcesSchema } from "./schema";
import type { PaginatedResponse } from "./types";
import {
	formatPaginationParams,
	getResourceIdsByTags,
	getResourceTags,
	validateResourceId,
} from "./utils";

const idParamSchema = t.Object({ id: t.String() });

export const resourcesRoute = new Elysia({ prefix: "/resources" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	.get(
		"/",
		async ({ query }) => {
			try {
				// Build where conditions
				const conditions = [];

				if (query.language) {
					conditions.push(eq(resources.language, query.language));
				}

				if (query.category) {
					conditions.push(eq(resources.category, query.category));
				}

				// Handle tag filtering
				let tagFilteredResourceIds: number[] | undefined;
				if (query.tags && query.tags.length > 0) {
					tagFilteredResourceIds = await getResourceIdsByTags(query.tags);
					if (tagFilteredResourceIds.length === 0) {
						return formatResponse({
							body: {
								data: [],
								pagination: {
									page: query.page || 1,
									limit: query.limit || 10,
									total: 0,
									totalPages: 0,
								},
							},
							status: 200,
						});
					}
				}

				if (tagFilteredResourceIds) {
					conditions.push(inArray(resources.id, tagFilteredResourceIds));
				}

				// Get total count for pagination
				const totalCountQuery = await db
					.select({ count: sql<number>`count(*)` })
					.from(resources)
					.where(conditions.length ? and(...conditions) : undefined);

				const total = totalCountQuery[0]?.count || 0;
				const { page, limit, offset } = formatPaginationParams(
					query.page,
					query.limit,
				);
				const totalPages = Math.ceil(total / limit);

				// Get paginated results
				const allResources = await db
					.select()
					.from(resources)
					.where(conditions.length ? and(...conditions) : undefined)
					.orderBy(desc(resources.createdAt))
					.limit(limit)
					.offset(offset);

				// Add tags to each resource
				const resourcesWithTags = await Promise.all(
					allResources.map(async (resource) => {
						const resourceTags = await getResourceTags(resource.id);
						return {
							...resource,
							tags: resourceTags,
						};
					}),
				);

				const response: PaginatedResponse<(typeof resourcesWithTags)[0]> = {
					data: resourcesWithTags,
					pagination: {
						page,
						limit,
						total,
						totalPages,
					},
				};

				return formatResponse({
					body: response,
					status: 200,
				});
			} catch (error) {
				console.error("Error fetching resources:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			query: getResourcesSchema,
			detail: {
				tags: ["Resources"],
				summary: "Get all resources",
				description: "Get all resources with optional filtering and pagination",
			},
		},
	)

	.get(
		"/:id",
		async ({ params }) => {
			try {
				const { isValid, numericId } = validateResourceId(params.id);
				if (!isValid || !numericId) {
					return formatResponse({
						body: { message: "Invalid resource ID" },
						status: 400,
					});
				}

				const [resource] = await db
					.select()
					.from(resources)
					.where(eq(resources.id, numericId));

				if (!resource) {
					return formatResponse({
						body: { message: "Resource not found" },
						status: 404,
					});
				}

				// Add tags to the resource
				const resourceTags = await getResourceTags(resource.id);
				const resourceWithTags = {
					...resource,
					tags: resourceTags,
				};

				return formatResponse({
					body: { resource: resourceWithTags },
					status: 200,
				});
			} catch (error) {
				console.error("Error fetching resource:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Resources"],
				summary: "Get resource by ID",
				description:
					"Retrieve a specific mental health resource by its unique identifier",
			},
		},
	)
	.use(resourcesAdminRoute);
