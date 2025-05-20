import { t } from "elysia";

export const createMoodSchema = t.Object({
	name: t.String(),
	description: t.Optional(t.String()),
	emoji: t.Optional(t.String()),
	language: t.String(),
});

export const updateMoodSchema = t.Object({
	name: t.Optional(t.String()),
	description: t.Optional(t.String()),
	emoji: t.Optional(t.String()),
	language: t.Optional(t.String()),
});

export const getMoodsSchema = t.Object({
	language: t.Optional(t.String()),
	page: t.Optional(t.Number()),
	limit: t.Optional(t.Number()),
});
