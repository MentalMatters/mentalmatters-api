import { eq, sql } from "drizzle-orm";
import type { Elysia } from "elysia";
import { formatResponse } from "@/utils";
import { db } from "../db";
import { type ApiKeyRole, apiKeys } from "../db/schema";

export interface ApiKeyPluginOptions {
	headerName?: string;
	requiredRole?: ApiKeyRole;
}

export interface ApiKeyRecord {
	id: number;
	key: string;
	label: string | null;
	role: ApiKeyRole;
	createdAt: Date | null;
	lastUsed: Date | null;
	revoked: number;
}

export const apiKeyPlugin = (options: ApiKeyPluginOptions = {}) => {
	const headerName = (options.headerName || "x-api-key").toLowerCase();

	return (app: Elysia) =>
		app.derive(async ({ request }) => {
			const apiKeyValue = request.headers.get(headerName);

			if (!apiKeyValue) {
				throw formatResponse({
					body: {
						message: "Unauthorized: Missing API key",
						error: "MISSING_API_KEY",
					},
					status: 401,
				});
			}

			try {
				const [keyRecord] = await db
					.select()
					.from(apiKeys)
					.where(eq(apiKeys.key, apiKeyValue));

				if (!keyRecord) {
					throw formatResponse({
						body: {
							message: "Unauthorized: Invalid API key",
							error: "INVALID_API_KEY",
						},
						status: 401,
					});
				}

				if (keyRecord.revoked) {
					throw formatResponse({
						body: {
							message: "Unauthorized: Your API key has been revoked",
							error: "REVOKED_API_KEY",
						},
						status: 401,
					});
				}

				// Role-based access control
				if (options.requiredRole) {
					const hasAccess =
						options.requiredRole === "ADMIN"
							? keyRecord.role === "ADMIN"
							: keyRecord.role === "USER" || keyRecord.role === "ADMIN";

					if (!hasAccess) {
						throw formatResponse({
							body: {
								message: `Forbidden: This endpoint requires ${options.requiredRole} role`,
								error: "INSUFFICIENT_PERMISSIONS",
							},
							status: 403,
						});
					}
				}

				// Update lastUsed timestamp asynchronously (don't await to avoid blocking)
				db.update(apiKeys)
					.set({ lastUsed: sql`(strftime('%s', 'now'))` })
					.where(eq(apiKeys.id, keyRecord.id))
					.catch((error) => {
						console.error(
							"Failed to update API key lastUsed timestamp:",
							error,
						);
					});

				return { apiKey: keyRecord };
			} catch (error) {
				// Re-throw formatResponse errors as-is
				if (error && typeof error === "object" && "body" in error) {
					throw error;
				}

				// Handle unexpected database errors
				console.error("API key validation error:", error);
				throw formatResponse({
					body: {
						message: "Internal server error during API key validation",
						error: "VALIDATION_ERROR",
					},
					status: 500,
				});
			}
		});
};
