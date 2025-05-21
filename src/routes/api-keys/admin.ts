import { eq } from "drizzle-orm";
import Elysia from "elysia";
import { v4 as uuid } from "uuid";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { db } from "../../db";
import { ApiKeyRole, apiKeys } from "../../db/schema";
import {
	adminCreateApiKeySchema,
	adminListApiKeysSchema,
	adminRevokeApiKeyParamsSchema,
} from "./schema";

// No prefix here!
export const apiKeysAdminRoute = new Elysia({ prefix: "/admin" })
	// Require ADMIN API key for all routes in this group
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	// Create a new API key (any role, label optional)
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

			return new Response(
				JSON.stringify({
					message: "API key created (admin)",
					apiKey: {
						key: created.key,
						role: created.role,
						createdAt: created.createdAt,
					},
				}),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			);
		},
		{ body: adminCreateApiKeySchema },
	)

	// List all API keys
	.get(
		"/",
		async () => {
			const allKeys = await db.select().from(apiKeys);
			return new Response(JSON.stringify({ apiKeys: allKeys }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ query: adminListApiKeysSchema },
	)

	// Revoke an API key by id
	.patch(
		"/:id/revoke",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(JSON.stringify({ message: "Invalid API key ID" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [updated] = await db
				.update(apiKeys)
				.set({ revoked: 1 })
				.where(eq(apiKeys.id, id))
				.returning();

			if (!updated) {
				return new Response(JSON.stringify({ message: "API key not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ message: "API key revoked" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: adminRevokeApiKeyParamsSchema },
	);
