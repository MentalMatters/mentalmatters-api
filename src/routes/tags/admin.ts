import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, tags } from "../../db/schema";
import { createTagSchema, updateTagSchema } from "./schema";
import { checkTagNameExists, sanitizeString, validateTagId } from "./utils";

const idParamSchema = t.Object({ id: t.String() });

export const tagsAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	.post(
		"/",
		async ({ body }) => {
			try {
				const sanitizedName = sanitizeString(body.name);

				if (!sanitizedName) {
					return formatResponse({
						body: { message: "Tag name is required" },
						status: 400,
					});
				}

				// Check if tag already exists
				const nameExists = await checkTagNameExists(sanitizedName);
				if (nameExists) {
					return formatResponse({
						body: { message: "Tag with this name already exists" },
						status: 409,
					});
				}

				const [createdTag] = await db
					.insert(tags)
					.values({ name: sanitizedName })
					.returning();

				return formatResponse({
					body: {
						message: "Tag created successfully",
						tag: createdTag,
					},
					status: 201,
				});
			} catch (error) {
				console.error("Error creating tag:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			body: createTagSchema,
			detail: {
				tags: ["Admin", "Tags"],
				summary: "Create a tag",
				operationId: "createTag",
				description: "Creates a new tag for categorizing content",
			},
		},
	)

	.put(
		"/:id",
		async ({ params, body }) => {
			try {
				const { isValid, numericId } = validateTagId(params.id);
				if (!isValid || !numericId) {
					return formatResponse({
						body: { message: "Invalid tag ID" },
						status: 400,
					});
				}

				const [existing] = await db
					.select()
					.from(tags)
					.where(eq(tags.id, numericId));

				if (!existing) {
					return formatResponse({
						body: { message: "Tag not found" },
						status: 404,
					});
				}

				// If name is being updated, check for conflicts
				if (body.name && body.name !== existing.name) {
					const sanitizedName = sanitizeString(body.name);
					if (!sanitizedName) {
						return formatResponse({
							body: { message: "Tag name is required" },
							status: 400,
						});
					}

					const nameExists = await checkTagNameExists(sanitizedName, numericId);
					if (nameExists) {
						return formatResponse({
							body: { message: "Tag with this name already exists" },
							status: 409,
						});
					}
				}

				const sanitizedName = body.name ? sanitizeString(body.name) : null;
				if (body.name && !sanitizedName) {
					return formatResponse({
						body: { message: "Invalid tag name" },
						status: 400,
					});
				}

				const [updated] = await db
					.update(tags)
					.set({
						name: sanitizedName || existing.name,
					})
					.where(eq(tags.id, numericId))
					.returning();

				return formatResponse({
					body: {
						message: "Tag updated successfully",
						tag: updated,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error updating tag:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			body: updateTagSchema,
			params: idParamSchema,
			detail: {
				tags: ["Admin", "Tags"],
				summary: "Update a tag",
				operationId: "updateTag",
				description: "Updates an existing tag's name by its ID",
			},
		},
	)

	.delete(
		"/:id",
		async ({ params }) => {
			try {
				const { isValid, numericId } = validateTagId(params.id);
				if (!isValid || !numericId) {
					return formatResponse({
						body: { message: "Invalid tag ID" },
						status: 400,
					});
				}

				const [deleted] = await db
					.delete(tags)
					.where(eq(tags.id, numericId))
					.returning();

				if (!deleted) {
					return formatResponse({
						body: { message: "Tag not found" },
						status: 404,
					});
				}

				return formatResponse({
					body: {
						message: "Tag deleted successfully",
						deletedTag: deleted,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error deleting tag:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Admin", "Tags"],
				summary: "Delete a tag",
				operationId: "deleteTag",
				description: "Permanently removes a tag from the database by its ID",
			},
		},
	);
