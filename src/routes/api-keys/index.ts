import Elysia from "elysia";
import { v4 as uuid } from "uuid";
import { formatResponse } from "@/utils"; // <-- import
import { db } from "../../db";
import { ApiKeyRole, apiKeys } from "../../db/schema";
import { apiKeysAdminRoute } from "./admin";
import { createApiKeySchema } from "./schema";
import { apiKeyMeRoute } from "./user";

export const apiKeysRoute = new Elysia({ prefix: "/api-key" })
	.post(
		"/",
		async ({ body }) => {
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
					message: "API key created",
					apiKey: {
						key: created.key,
						role: created.role,
						createdAt: created.createdAt,
					},
				},
				status: 201,
			});
		},
		{
			body: createApiKeySchema,
		},
	)
	.use(apiKeyMeRoute)
	.use(apiKeysAdminRoute);
