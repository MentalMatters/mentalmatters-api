import { t } from "elysia";
import { ResourceCategory } from "../../db/schema";

export const createResourceSchema = t.Object({
	title: t.String({ minLength: 1, maxLength: 255 }),
	url: t.String({ pattern: "^https?://.+" }),
	description: t.Optional(t.String({ maxLength: 1000 })),
	category: t.Enum(ResourceCategory),
	language: t.String({ minLength: 2, maxLength: 10 }),
	tags: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 50 }))),
});

export const updateResourceSchema = t.Object({
	title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	url: t.Optional(t.String({ pattern: "^https?://.+" })),
	description: t.Optional(t.String({ maxLength: 1000 })),
	category: t.Optional(t.Enum(ResourceCategory)),
	language: t.Optional(t.String({ minLength: 2, maxLength: 10 })),
	tags: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 50 }))),
});

export const getResourcesSchema = t.Object({
	category: t.Optional(t.Enum(ResourceCategory)),
	language: t.Optional(t.String({ minLength: 2, maxLength: 10 })),
	tags: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 50 }))),
	page: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
	limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
});

export const addTagsToResourceSchema = t.Object({
	tags: t.Array(t.String({ minLength: 1, maxLength: 50 })),
});

export const removeTagsFromResourceSchema = t.Object({
	tags: t.Array(t.String({ minLength: 1, maxLength: 50 })),
});
