import { t } from "elysia";
import { ApiKeyRole } from "../../db/schema";

// Public
export const createApiKeySchema = t.Object({
	label: t.Optional(t.String()),
});

// Admin
export const adminCreateApiKeySchema = t.Intersect([
	createApiKeySchema,
	t.Object({
		role: t.Optional(t.Enum(ApiKeyRole)),
	}),
]);

export const adminRevokeApiKeyParamsSchema = t.Object({
	id: t.String(),
});

export const adminListApiKeysSchema = t.Intersect([
	t.Object({
		role: t.Optional(t.Enum(ApiKeyRole)),
		revoked: t.Optional(t.Boolean()),
		page: t.Optional(t.Number()),
		limit: t.Optional(t.Number()),
	}),
	createApiKeySchema, // adds optional label
]);
