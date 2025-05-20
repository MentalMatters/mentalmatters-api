import { t } from "elysia";
import { AffirmationCategory } from "../../db/schema";

// Affirmations
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

// Approve/Unapprove
export const approveAffirmationSchema = t.Object({
	approved: t.Boolean(),
});

// Moods
export const createMoodSchema = t.Object({
	name: t.String(),
	description: t.Optional(t.String()),
	emoji: t.Optional(t.String()),
	language: t.String(),
});

export const updateMoodSchema = t.Object({
	id: t.Number(),
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

// Quotes
export const createQuoteSchema = t.Object({
	quoteText: t.String(),
	author: t.Optional(t.String()),
	category: t.Optional(t.String()),
	language: t.String(),
});

export const updateQuoteSchema = t.Object({
	id: t.Number(),
	quoteText: t.Optional(t.String()),
	author: t.Optional(t.String()),
	category: t.Optional(t.String()),
	language: t.Optional(t.String()),
});

export const getQuotesSchema = t.Object({
	category: t.Optional(t.String()),
	language: t.Optional(t.String()),
	author: t.Optional(t.String()),
	page: t.Optional(t.Number()),
	limit: t.Optional(t.Number()),
});
