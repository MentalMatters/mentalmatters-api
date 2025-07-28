import { and, desc, eq, like, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { v4 as uuid } from "uuid";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, apiKeys } from "../../db/schema";
import {
	adminCreateApiKeySchema,
	adminListApiKeysSchema,
	adminRevokeApiKeyParamsSchema,
} from "./schema";

const adminUpdateApiKeySchema = t.Object({
	label: t.Optional(t.String()),
	role: t.Optional(t.Enum(ApiKeyRole)),
});

export const apiKeysAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	.post(
		"/",
		async ({ body }) => {
			try {
				const newKey = uuid();

				const [created] = await db
					.insert(apiKeys)
					.values({
						key: newKey,
						label: body?.label,
						role: body?.role || ApiKeyRole.USER,
						revoked: 0,
					})
					.returning();

				return formatResponse({
					body: {
						message: "API key created (admin)",
						apiKey: {
							key: created.key,
							role: created.role,
							createdAt: created.createdAt,
						},
					},
					status: 201,
				});
			} catch (error) {
				console.error("Error creating API key:", error);
				return formatResponse({
					body: { message: "Failed to create API key" },
					status: 500,
				});
			}
		},
		{
			body: adminCreateApiKeySchema,
			detail: {
				tags: ["Admin", "API Keys"],
				summary: "Create API key (admin)",
				operationId: "adminCreateApiKey",
				description: "Creates a new API key with specified role (admin only)",
				responses: {
					201: {
						description: "API key created successfully",
					},
					400: {
						description: "Bad request - Invalid input data",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
					},
					403: {
						description: "Forbidden - Insufficient API key role",
					},
					500: {
						description: "Internal server error",
					},
				},
			},
		},
	)

	.get(
		"/",
		async ({ query }) => {
			try {
				const { role, revoked, page = 1, limit = 20, label } = query;

				// Build where conditions
				const conditions = [];
				if (role) conditions.push(eq(apiKeys.role, role));
				if (revoked !== undefined)
					conditions.push(eq(apiKeys.revoked, revoked ? 1 : 0));
				if (label) conditions.push(like(apiKeys.label, `%${label}%`));

				const whereClause =
					conditions.length > 0 ? and(...conditions) : undefined;

				// Calculate offset
				const offset = (page - 1) * limit;

				// Get total count for pagination
				const countResult = await db
					.select({ count: sql<number>`count(*)` })
					.from(apiKeys)
					.where(whereClause);
				const total = countResult[0]?.count || 0;

				// Get paginated results
				const allKeys = await db
					.select()
					.from(apiKeys)
					.where(whereClause)
					.orderBy(desc(apiKeys.createdAt))
					.limit(limit)
					.offset(offset);

				return formatResponse({
					body: {
						apiKeys: allKeys,
						pagination: {
							page,
							limit,
							total,
							totalPages: Math.ceil(total / limit),
						},
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error fetching API keys:", error);
				return formatResponse({
					body: { message: "Failed to fetch API keys" },
					status: 500,
				});
			}
		},
		{
			query: adminListApiKeysSchema,
			detail: {
				tags: ["Admin", "API Keys"],
				summary: "List all API keys",
				operationId: "adminListApiKeys",
				description:
					"Retrieves a paginated list of all API keys in the system with optional filtering (admin only)",
				responses: {
					200: {
						description: "API keys retrieved successfully",
					},
					400: {
						description: "Bad request - Invalid query parameters",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
					},
					403: {
						description: "Forbidden - Insufficient API key role",
					},
					500: {
						description: "Internal server error",
					},
				},
			},
		},
	)

	.get(
		"/:id",
		async ({ params }) => {
			try {
				const id = Number(params.id);
				if (Number.isNaN(id) || id <= 0) {
					return formatResponse({
						body: { message: "Invalid API key ID" },
						status: 400,
					});
				}

				const [apiKey] = await db
					.select()
					.from(apiKeys)
					.where(eq(apiKeys.id, id));

				if (!apiKey) {
					return formatResponse({
						body: { message: "API key not found" },
						status: 404,
					});
				}

				return formatResponse({
					body: {
						message: "API key retrieved successfully",
						apiKey,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error fetching API key:", error);
				return formatResponse({
					body: { message: "Failed to fetch API key" },
					status: 500,
				});
			}
		},
		{
			params: adminRevokeApiKeyParamsSchema,
			detail: {
				tags: ["Admin", "API Keys"],
				summary: "Get API key by ID",
				operationId: "adminGetApiKey",
				description: "Retrieves a specific API key by its ID (admin only)",
				responses: {
					200: {
						description: "API key retrieved successfully",
					},
					400: {
						description: "Bad request - Invalid API key ID",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
					},
					403: {
						description: "Forbidden - Insufficient API key role",
					},
					404: {
						description: "API key not found",
					},
					500: {
						description: "Internal server error",
					},
				},
			},
		},
	)

	.patch(
		"/:id",
		async ({ params, body }) => {
			try {
				const id = Number(params.id);
				if (Number.isNaN(id) || id <= 0) {
					return formatResponse({
						body: { message: "Invalid API key ID" },
						status: 400,
					});
				}

				const updateData: { label?: string; role?: ApiKeyRole } = {};
				if (body.label !== undefined) updateData.label = body.label;
				if (body.role !== undefined) updateData.role = body.role;

				if (Object.keys(updateData).length === 0) {
					return formatResponse({
						body: { message: "No valid fields to update" },
						status: 400,
					});
				}

				const [updated] = await db
					.update(apiKeys)
					.set(updateData)
					.where(eq(apiKeys.id, id))
					.returning();

				if (!updated) {
					return formatResponse({
						body: { message: "API key not found" },
						status: 404,
					});
				}

				return formatResponse({
					body: {
						message: "API key updated successfully",
						apiKey: updated,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error updating API key:", error);
				return formatResponse({
					body: { message: "Failed to update API key" },
					status: 500,
				});
			}
		},
		{
			params: adminRevokeApiKeyParamsSchema,
			body: adminUpdateApiKeySchema,
			detail: {
				tags: ["Admin", "API Keys"],
				summary: "Update API key",
				operationId: "adminUpdateApiKey",
				description:
					"Updates an API key's label and/or role by its ID (admin only)",
				responses: {
					200: {
						description: "API key updated successfully",
					},
					400: {
						description: "Bad request - Invalid API key ID or input data",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
					},
					403: {
						description: "Forbidden - Insufficient API key role",
					},
					404: {
						description: "API key not found",
					},
					500: {
						description: "Internal server error",
					},
				},
			},
		},
	)

	.post(
		"/:id/regenerate",
		async ({ params }) => {
			try {
				const id = Number(params.id);
				if (Number.isNaN(id) || id <= 0) {
					return formatResponse({
						body: { message: "Invalid API key ID" },
						status: 400,
					});
				}

				const newKey = uuid();

				const [updated] = await db
					.update(apiKeys)
					.set({
						key: newKey,
						createdAt: new Date(),
						revoked: 0, // Ensure the key is active
					})
					.where(eq(apiKeys.id, id))
					.returning();

				if (!updated) {
					return formatResponse({
						body: { message: "API key not found" },
						status: 404,
					});
				}

				return formatResponse({
					body: {
						message: "API key regenerated successfully",
						apiKey: {
							key: updated.key,
							label: updated.label,
							role: updated.role,
							createdAt: updated.createdAt,
						},
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error regenerating API key:", error);
				return formatResponse({
					body: { message: "Failed to regenerate API key" },
					status: 500,
				});
			}
		},
		{
			params: adminRevokeApiKeyParamsSchema,
			detail: {
				tags: ["Admin", "API Keys"],
				summary: "Regenerate API key",
				operationId: "adminRegenerateApiKey",
				description:
					"Generates a new API key to replace the existing one, invalidating the old key (admin only)",
				responses: {
					200: {
						description: "API key regenerated successfully",
					},
					400: {
						description: "Bad request - Invalid API key ID",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
					},
					403: {
						description: "Forbidden - Insufficient API key role",
					},
					404: {
						description: "API key not found",
					},
					500: {
						description: "Internal server error",
					},
				},
			},
		},
	)

	.patch(
		"/:id/revoke",
		async ({ params }) => {
			try {
				const id = Number(params.id);
				if (Number.isNaN(id) || id <= 0) {
					return formatResponse({
						body: { message: "Invalid API key ID" },
						status: 400,
					});
				}

				const [updated] = await db
					.update(apiKeys)
					.set({ revoked: 1 })
					.where(eq(apiKeys.id, id))
					.returning();

				if (!updated) {
					return formatResponse({
						body: { message: "API key not found" },
						status: 404,
					});
				}

				return formatResponse({
					body: { message: "API key revoked successfully" },
					status: 200,
				});
			} catch (error) {
				console.error("Error revoking API key:", error);
				return formatResponse({
					body: { message: "Failed to revoke API key" },
					status: 500,
				});
			}
		},
		{
			params: adminRevokeApiKeyParamsSchema,
			detail: {
				tags: ["Admin", "API Keys"],
				summary: "Revoke API key",
				operationId: "adminRevokeApiKey",
				description:
					"Revokes an API key by its ID, preventing further use (admin only)",
				responses: {
					200: {
						description: "API key revoked successfully",
					},
					400: {
						description: "Bad request - Invalid API key ID",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
					},
					403: {
						description: "Forbidden - Insufficient API key role",
					},
					404: {
						description: "API key not found",
					},
					500: {
						description: "Internal server error",
					},
				},
			},
		},
	)

	.patch(
		"/:id/unrevoke",
		async ({ params }) => {
			try {
				const id = Number(params.id);
				if (Number.isNaN(id) || id <= 0) {
					return formatResponse({
						body: { message: "Invalid API key ID" },
						status: 400,
					});
				}

				const [updated] = await db
					.update(apiKeys)
					.set({ revoked: 0 })
					.where(eq(apiKeys.id, id))
					.returning();

				if (!updated) {
					return formatResponse({
						body: { message: "API key not found" },
						status: 404,
					});
				}

				return formatResponse({
					body: { message: "API key unrevoked successfully" },
					status: 200,
				});
			} catch (error) {
				console.error("Error unrevoking API key:", error);
				return formatResponse({
					body: { message: "Failed to unrevoke API key" },
					status: 500,
				});
			}
		},
		{
			params: adminRevokeApiKeyParamsSchema,
			detail: {
				tags: ["Admin", "API Keys"],
				summary: "Unrevoke API key",
				operationId: "adminUnrevokeApiKey",
				description:
					"Unrevokes an API key by its ID, allowing it to be used again (admin only)",
				responses: {
					200: {
						description: "API key unrevoked successfully",
					},
					400: {
						description: "Bad request - Invalid API key ID",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
					},
					403: {
						description: "Forbidden - Insufficient API key role",
					},
					404: {
						description: "API key not found",
					},
					500: {
						description: "Internal server error",
					},
				},
			},
		},
	)

	.delete(
		"/:id",
		async ({ params }) => {
			try {
				const id = Number(params.id);
				if (Number.isNaN(id) || id <= 0) {
					return formatResponse({
						body: { message: "Invalid API key ID" },
						status: 400,
					});
				}

				const [deleted] = await db
					.delete(apiKeys)
					.where(eq(apiKeys.id, id))
					.returning();

				if (!deleted) {
					return formatResponse({
						body: { message: "API key not found" },
						status: 404,
					});
				}

				return formatResponse({
					body: { message: "API key deleted successfully" },
					status: 200,
				});
			} catch (error) {
				console.error("Error deleting API key:", error);
				return formatResponse({
					body: { message: "Failed to delete API key" },
					status: 500,
				});
			}
		},
		{
			params: adminRevokeApiKeyParamsSchema,
			detail: {
				tags: ["Admin", "API Keys"],
				summary: "Delete API key",
				operationId: "adminDeleteApiKey",
				description:
					"Permanently deletes an API key by its ID (admin only). This action cannot be undone.",
				responses: {
					200: {
						description: "API key deleted successfully",
					},
					400: {
						description: "Bad request - Invalid API key ID",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
					},
					403: {
						description: "Forbidden - Insufficient API key role",
					},
					404: {
						description: "API key not found",
					},
					500: {
						description: "Internal server error",
					},
				},
			},
		},
	);
