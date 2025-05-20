import { t } from "elysia";

export const createTagSchema = t.Object({
	name: t.String(),
});

export const updateTagSchema = t.Object({
	name: t.Optional(t.String()),
});

export const getTagsSchema = t.Object({
	name: t.Optional(t.String()),
	page: t.Optional(t.Number()),
	limit: t.Optional(t.Number()),
});
