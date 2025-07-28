import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { formatResponse } from "@/utils";

export interface ApiKeyContext {
	apiKey: string | null;
	userId: number | null;
	role: "USER" | "ADMIN" | null;
	isValid: boolean;
}

export interface ApiKeyOptions {
	/** Header name for API key */
	headerName?: string;
	/** Whether to require API key (default: true) */
	required?: boolean;
	/** Whether to allow admin bypass for certain operations */
	allowAdminBypass?: boolean;
	/** Custom error message */
	errorMessage?: string;
}

const DEFAULT_OPTIONS: Required<ApiKeyOptions> = {
	headerName: "x-api-key",
	required: true,
	allowAdminBypass: false,
	errorMessage: "Valid API key is required for this operation.",
};

export const apiKeyPlugin = (options: ApiKeyOptions = {}) => {
	const config = { ...DEFAULT_OPTIONS, ...options };

	return new Elysia().derive(async ({ request, set }) => {
		const apiKeyValue = request.headers.get(config.headerName);

		// If API key is not required, return early
		if (!config.required && !apiKeyValue) {
			return {
				apiKey: null,
				userId: null,
				role: null,
				isValid: false,
			};
		}

		// If API key is required but not provided
		if (config.required && !apiKeyValue) {
			set.status = 401;
			throw formatResponse({
				body: {
					message: config.errorMessage,
					error: "MISSING_API_KEY",
				},
				status: 401,
			});
		}

		// At this point, if required is true, apiKeyValue is guaranteed to be non-null
		if (!apiKeyValue) {
			return {
				apiKey: null,
				userId: null,
				role: null,
				isValid: false,
			};
		}

		try {
			// Validate API key in database
			const keyRecord = await db
				.select({
					id: apiKeys.id,
					key: apiKeys.key,
					role: apiKeys.role,
					revoked: apiKeys.revoked,
				})
				.from(apiKeys)
				.where(eq(apiKeys.key, apiKeyValue))
				.get();

			// Check if key exists and is not revoked
			if (!keyRecord || keyRecord.revoked) {
				set.status = 401;
				throw formatResponse({
					body: {
						message: "Invalid or revoked API key.",
						error: "INVALID_API_KEY",
					},
					status: 401,
				});
			}

			// Update last used timestamp
			await db
				.update(apiKeys)
				.set({ lastUsed: new Date() })
				.where(eq(apiKeys.id, keyRecord.id));

			return {
				apiKey: keyRecord.key,
				userId: keyRecord.id,
				role: keyRecord.role,
				isValid: true,
			};
		} catch (error) {
			console.error("API key validation error:", error);
			set.status = 500;
			throw formatResponse({
				body: {
					message: "Error validating API key. Please try again.",
					error: "VALIDATION_ERROR",
				},
				status: 500,
			});
		}
	});
};

// Helper function to check if user has admin role
export const requireAdmin = (context: ApiKeyContext): boolean => {
	return context.isValid && context.role === "ADMIN";
};

// Helper function to check if user has specific role
export const requireRole = (
	context: ApiKeyContext,
	role: "USER" | "ADMIN",
): boolean => {
	return context.isValid && context.role === role;
};
