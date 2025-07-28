import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { v4 as uuid } from "uuid";
import { ApiKeyRole } from "@/db/schema";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { apiKeys } from "../../db/schema";

const updateApiKeySchema = t.Object({
	label: t.Optional(t.String()),
});

export const apiKeyMeRoute = new Elysia({ prefix: "/me" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	.get(
		"/",
		async ({ apiKey }) => {
			return formatResponse({
				body: {
					message: "API key retrieved",
					apiKey: {
						key: apiKey.key,
						label: apiKey.label,
						role: apiKey.role,
						createdAt: apiKey.createdAt,
					},
				},
				status: 200,
			});
		},
		{
			detail: {
				tags: ["API Keys"],
				summary: "Get current API key",
				operationId: "getCurrentApiKey",
				description:
					"Retrieves information about the API key used for the current request",
				responses: {
					200: {
						description: "API key information retrieved successfully",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
					},
				},
			},
		},
	)

	.patch(
		"/",
		async ({ apiKey, body }) => {
			try {
				const [updated] = await db
					.update(apiKeys)
					.set({ label: body.label })
					.where(eq(apiKeys.id, apiKey.id))
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
				console.error("Error updating API key:", error);
				return formatResponse({
					body: { message: "Failed to update API key" },
					status: 500,
				});
			}
		},
		{
			body: updateApiKeySchema,
			detail: {
				tags: ["API Keys"],
				summary: "Update current API key",
				operationId: "updateCurrentApiKey",
				description:
					"Updates the label of the API key used for the current request",
				responses: {
					200: {
						description: "API key updated successfully",
					},
					400: {
						description: "Bad request - Invalid input data",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
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
		"/regenerate",
		async ({ apiKey }) => {
			try {
				const newKey = uuid();

				const [updated] = await db
					.update(apiKeys)
					.set({
						key: newKey,
						createdAt: new Date(),
					})
					.where(eq(apiKeys.id, apiKey.id))
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
			detail: {
				tags: ["API Keys"],
				summary: "Regenerate current API key",
				operationId: "regenerateCurrentApiKey",
				description:
					"Generates a new API key to replace the current one, invalidating the old key",
				responses: {
					200: {
						description: "API key regenerated successfully",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
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
		"/",
		async ({ apiKey }) => {
			try {
				const [updated] = await db
					.update(apiKeys)
					.set({ revoked: 1 })
					.where(eq(apiKeys.id, apiKey.id))
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
			detail: {
				tags: ["API Keys"],
				summary: "Revoke current API key",
				operationId: "revokeCurrentApiKey",
				description:
					"Revokes the API key used for the current request, preventing further use",
				responses: {
					200: {
						description: "API key revoked successfully",
					},
					401: {
						description: "Unauthorized - Invalid or missing API key",
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
