import { t } from "elysia";

export const createLanguageSchema = t.Object({
	code: t.String(),
	name: t.String(),
});

export const updateLanguageSchema = t.Object({
	name: t.Optional(t.String()),
});

export const getLanguagesSchema = t.Object({
	code: t.Optional(t.String()),
	name: t.Optional(t.String()),
	page: t.Optional(t.Number()),
	limit: t.Optional(t.Number()),
});
