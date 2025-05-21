import { eq } from "drizzle-orm";
import Elysia from "elysia";
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

export const apiKeysAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	.post(
		"/",
		async ({ body }) => {
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
		},
		{ body: adminCreateApiKeySchema },
	)

	.get(
		"/",
		async () => {
			const allKeys = await db.select().from(apiKeys);
			return formatResponse({
				body: { apiKeys: allKeys },
				status: 200,
			});
		},
		{ query: adminListApiKeysSchema },
	)

	.patch(
		"/:id/revoke",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
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
				body: { message: "API key revoked" },
				status: 200,
			});
		},
		{ params: adminRevokeApiKeyParamsSchema },
	);
