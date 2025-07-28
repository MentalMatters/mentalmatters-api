import { and, eq, inArray } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, resources, resourceTags } from "../../db/schema";
import {
	addTagsToResourceSchema,
	createResourceSchema,
	removeTagsFromResourceSchema,
	updateResourceSchema,
} from "./schema";
import {
	checkResourceUrlExists,
	getOrCreateTags,
	getResourceTags,
	sanitizeString,
	validateResourceId,
} from "./utils";

const idParamSchema = t.Object({ id: t.String() });

export const resourcesAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	.post(
		"/",
		async ({ body }) => {
			try {
				// Check if resource with same URL already exists
				const urlExists = await checkResourceUrlExists(body.url);
				if (urlExists) {
					return formatResponse({
						body: { message: "Resource with this URL already exists" },
						status: 409,
					});
				}

				const sanitizedTitle = sanitizeString(body.title);
				const sanitizedUrl = sanitizeString(body.url);

				if (!sanitizedTitle || !sanitizedUrl) {
					return formatResponse({
						body: { message: "Title and URL are required" },
						status: 400,
					});
				}

				const [createdResource] = await db
					.insert(resources)
					.values({
						title: sanitizedTitle,
						url: sanitizedUrl,
						description: sanitizeString(body.description),
						category: body.category,
						language: body.language,
					})
					.returning();

				// Handle tags if provided
				if (body.tags && body.tags.length > 0) {
					const tagIds = await getOrCreateTags(body.tags);

					// Insert resource-tag relationships
					if (tagIds.length > 0) {
						await db.insert(resourceTags).values(
							tagIds.map((tagId) => ({
								resourceId: createdResource.id,
								tagId,
							})),
						);
					}
				}

				// Get the created resource with tags
				const resourceWithTags = {
					...createdResource,
					tags: body.tags || [],
				};

				return formatResponse({
					body: {
						message: "Resource created successfully",
						resource: resourceWithTags,
					},
					status: 201,
				});
			} catch (error) {
				console.error("Error creating resource:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			body: createResourceSchema,
			detail: {
				tags: ["Admin", "Resources"],
				summary: "Create a new resource",
				description: "Create a new mental health resource",
			},
		},
	)

	.put(
		"/:id",
		async ({ params, body }) => {
			try {
				const { isValid, numericId } = validateResourceId(params.id);
				if (!isValid || !numericId) {
					return formatResponse({
						body: { message: "Invalid resource ID" },
						status: 400,
					});
				}

				const [existing] = await db
					.select()
					.from(resources)
					.where(eq(resources.id, numericId));

				if (!existing) {
					return formatResponse({
						body: { message: "Resource not found" },
						status: 404,
					});
				}

				// Check if URL is being updated and if it conflicts with another resource
				if (body.url && body.url !== existing.url) {
					const urlExists = await checkResourceUrlExists(body.url, numericId);
					if (urlExists) {
						return formatResponse({
							body: { message: "Resource with this URL already exists" },
							status: 409,
						});
					}
				}

				const [updated] = await db
					.update(resources)
					.set({
						title: sanitizeString(body.title) ?? existing.title,
						url: sanitizeString(body.url) ?? existing.url,
						description:
							sanitizeString(body.description) ?? existing.description,
						category: body.category ?? existing.category,
						language: body.language ?? existing.language,
					})
					.where(eq(resources.id, numericId))
					.returning();

				// Handle tags if provided
				if (body.tags !== undefined) {
					// Remove existing tags
					await db
						.delete(resourceTags)
						.where(eq(resourceTags.resourceId, numericId));

					// Add new tags if any
					if (body.tags && body.tags.length > 0) {
						const tagIds = await getOrCreateTags(body.tags);

						if (tagIds.length > 0) {
							await db.insert(resourceTags).values(
								tagIds.map((tagId) => ({
									resourceId: numericId,
									tagId,
								})),
							);
						}
					}
				}

				// Get the updated resource with tags
				const resourceWithTags = {
					...updated,
					tags: body.tags || (await getResourceTags(numericId)),
				};

				return formatResponse({
					body: {
						message: "Resource updated successfully",
						resource: resourceWithTags,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error updating resource:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			body: updateResourceSchema,
			params: idParamSchema,
			detail: {
				tags: ["Admin", "Resources"],
				summary: "Update a resource",
				description: "Update an existing mental health resource",
			},
		},
	)

	.post(
		"/:id/tags",
		async ({ params, body }) => {
			try {
				const { isValid, numericId } = validateResourceId(params.id);
				if (!isValid || !numericId) {
					return formatResponse({
						body: { message: "Invalid resource ID" },
						status: 400,
					});
				}

				const [existing] = await db
					.select()
					.from(resources)
					.where(eq(resources.id, numericId));

				if (!existing) {
					return formatResponse({
						body: { message: "Resource not found" },
						status: 404,
					});
				}

				// Get or create tags
				const tagIds = await getOrCreateTags(body.tags);

				// Add tags to resource
				if (tagIds.length > 0) {
					await db.insert(resourceTags).values(
						tagIds.map((tagId) => ({
							resourceId: numericId,
							tagId,
						})),
					);
				}

				// Get updated tags
				const updatedTags = await getResourceTags(numericId);

				return formatResponse({
					body: {
						message: "Tags added successfully",
						tags: updatedTags,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error adding tags to resource:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			body: addTagsToResourceSchema,
			params: idParamSchema,
			detail: {
				tags: ["Admin", "Resources"],
				summary: "Add tags to a resource",
				description: "Add tags to an existing mental health resource",
			},
		},
	)

	.delete(
		"/:id/tags",
		async ({ params, body }) => {
			try {
				const { isValid, numericId } = validateResourceId(params.id);
				if (!isValid || !numericId) {
					return formatResponse({
						body: { message: "Invalid resource ID" },
						status: 400,
					});
				}

				const [existing] = await db
					.select()
					.from(resources)
					.where(eq(resources.id, numericId));

				if (!existing) {
					return formatResponse({
						body: { message: "Resource not found" },
						status: 404,
					});
				}

				// Remove specific tags from resource
				if (body.tags && body.tags.length > 0) {
					const tagIds = await getOrCreateTags(body.tags);
					if (tagIds.length > 0) {
						await db
							.delete(resourceTags)
							.where(
								and(
									eq(resourceTags.resourceId, numericId),
									inArray(resourceTags.tagId, tagIds),
								),
							);
					}
				}

				// Get updated tags
				const updatedTags = await getResourceTags(numericId);

				return formatResponse({
					body: {
						message: "Tags removed successfully",
						tags: updatedTags,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error removing tags from resource:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			body: removeTagsFromResourceSchema,
			params: idParamSchema,
			detail: {
				tags: ["Admin", "Resources"],
				summary: "Remove tags from a resource",
				description:
					"Remove specific tags from an existing mental health resource",
			},
		},
	)

	.delete(
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

				const [deleted] = await db
					.delete(resources)
					.where(eq(resources.id, numericId))
					.returning();

				if (!deleted) {
					return formatResponse({
						body: { message: "Resource not found" },
						status: 404,
					});
				}

				return formatResponse({
					body: {
						message: "Resource deleted successfully",
						deletedResource: deleted,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error deleting resource:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Admin", "Resources"],
				summary: "Delete a resource",
				description: "Delete an existing mental health resource",
			},
		},
	);
