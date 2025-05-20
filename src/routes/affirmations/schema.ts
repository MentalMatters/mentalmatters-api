import { t } from "elysia";
import { AffirmationCategory } from "../../db/schema";

export const createAffirmationSchema = t.Object({
	text: t.String(),
	category: t.Enum(AffirmationCategory),
	language: t.String(),
	tags: t.Optional(t.Array(t.String())),
});

export const updateAffirmationSchema = t.Object({
	id: t.Number(),
	text: t.Optional(t.String()),
	category: t.Optional(t.Enum(AffirmationCategory)),
	language: t.Optional(t.String()),
	tags: t.Optional(t.Array(t.String())),
});

export const getAffirmationsSchema = t.Object({
	category: t.Optional(t.Enum(AffirmationCategory)),
	language: t.Optional(t.String()),
	tags: t.Optional(t.Array(t.String())),
	page: t.Optional(t.Number()),
	limit: t.Optional(t.Number()),
});
