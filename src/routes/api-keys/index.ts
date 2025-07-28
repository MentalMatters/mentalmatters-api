import Elysia from "elysia";
import { v4 as uuid } from "uuid";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, apiKeys } from "../../db/schema";
import { apiKeysAdminRoute } from "./admin";
import { createApiKeySchema } from "./schema";
import { apiKeyMeRoute } from "./user";

export const apiKeysRoute = new Elysia({ prefix: "/api-key" })
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
						role: ApiKeyRole.USER,
						revoked: 0,
					})
					.returning();

				return formatResponse({
					body: {
						message: "API key created successfully",
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
			body: createApiKeySchema,
			detail: {
				tags: ["API Keys"],
				summary: "Create new API key",
				description:
					"Generate a new API key for accessing the Mental Matters API",
				responses: {
					201: {
						description: "API key created successfully",
					},
					400: {
						description: "Bad request - Invalid input data",
					},
					500: {
						description: "Internal server error",
					},
				},
			},
		},
	)
	.use(apiKeyMeRoute)
	.use(apiKeysAdminRoute);
