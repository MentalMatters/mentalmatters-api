import { t } from "elysia";

export const createQuoteSchema = t.Object({
	quoteText: t.String(),
	author: t.Optional(t.String()),
	category: t.Optional(t.String()),
	language: t.String(),
});

export const updateQuoteSchema = t.Object({
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
