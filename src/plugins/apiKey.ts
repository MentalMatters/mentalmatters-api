import { eq, sql } from "drizzle-orm";
import type { Elysia } from "elysia";
import { formatResponse } from "@/utils";
import { db } from "../db";
import { type ApiKeyRole, apiKeys } from "../db/schema";

export const apiKeyPlugin = (options?: {
	headerName?: string;
	requiredRole?: ApiKeyRole;
}) => {
	const headerName = (options?.headerName || "x-api-key").toLowerCase();

	return (app: Elysia) =>
		app.derive(async ({ request }) => {
			const apiKeyValue = request.headers.get(headerName);

			if (!apiKeyValue) {
				throw formatResponse({
					body: { message: "Unauthorized: Missing API key" },
					status: 401,
				});
			}

			const [keyRecord] = await db
				.select()
				.from(apiKeys)
				.where(eq(apiKeys.key, apiKeyValue));

			if (!keyRecord) {
				throw formatResponse({
					body: { message: "Unauthorized: Invalid API key" },
					status: 401,
				});
			}

			if (keyRecord.revoked) {
				throw formatResponse({
					body: { message: "Unauthorized: Your API key has been revoked" },
					status: 401,
				});
			}

			// Role logic: ADMIN can access USER routes, but not vice versa
			if (options?.requiredRole) {
				if (options.requiredRole === "ADMIN" && keyRecord.role !== "ADMIN") {
					throw formatResponse({
						body: { message: "Forbidden: Insufficient API key role" },
						status: 403,
					});
				}
				// If requiredRole is USER, allow both USER and ADMIN
				if (
					options.requiredRole === "USER" &&
					keyRecord.role !== "USER" &&
					keyRecord.role !== "ADMIN"
				) {
					throw formatResponse({
						body: { message: "Forbidden: Insufficient API key role" },
						status: 403,
					});
				}
			}

			// Update lastUsed timestamp
			await db
				.update(apiKeys)
				.set({ lastUsed: sql`(strftime('%s', 'now'))` })
				.where(eq(apiKeys.id, keyRecord.id));

			return { apiKey: keyRecord };
		});
};
