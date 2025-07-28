import { t } from "elysia";

const MAX_PAGINATION_LIMIT = 100;
const MIN_PAGINATION_LIMIT = 1;
const MAX_QUOTE_LENGTH = 1000;
const MAX_AUTHOR_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 50;

export const createQuoteSchema = t.Object({
	quoteText: t.String({
		minLength: 1,
		maxLength: MAX_QUOTE_LENGTH,
		error: `Quote text must be between 1 and ${MAX_QUOTE_LENGTH} characters`,
	}),
	author: t.Optional(
		t.String({
			maxLength: MAX_AUTHOR_LENGTH,
			error: `Author must be no more than ${MAX_AUTHOR_LENGTH} characters`,
		}),
	),
	category: t.Optional(
		t.String({
			maxLength: MAX_CATEGORY_LENGTH,
			error: `Category must be no more than ${MAX_CATEGORY_LENGTH} characters`,
		}),
	),
	language: t.String({
		minLength: 2,
		maxLength: 5,
		pattern: "^[a-z]{2}(-[A-Z]{2})?$",
		error: "Language must be a valid ISO language code (e.g., 'en', 'en-US')",
	}),
});

export const updateQuoteSchema = t.Object({
	quoteText: t.Optional(
		t.String({
			minLength: 1,
			maxLength: MAX_QUOTE_LENGTH,
			error: `Quote text must be between 1 and ${MAX_QUOTE_LENGTH} characters`,
		}),
	),
	author: t.Optional(
		t.String({
			maxLength: MAX_AUTHOR_LENGTH,
			error: `Author must be no more than ${MAX_AUTHOR_LENGTH} characters`,
		}),
	),
	category: t.Optional(
		t.String({
			maxLength: MAX_CATEGORY_LENGTH,
			error: `Category must be no more than ${MAX_CATEGORY_LENGTH} characters`,
		}),
	),
	language: t.Optional(
		t.String({
			minLength: 2,
			maxLength: 5,
			pattern: "^[a-z]{2}(-[A-Z]{2})?$",
			error: "Language must be a valid ISO language code (e.g., 'en', 'en-US')",
		}),
	),
});

export const getQuotesSchema = t.Object({
	category: t.Optional(
		t.String({
			maxLength: MAX_CATEGORY_LENGTH,
			error: `Category must be no more than ${MAX_CATEGORY_LENGTH} characters`,
		}),
	),
	language: t.Optional(
		t.String({
			minLength: 2,
			maxLength: 5,
			pattern: "^[a-z]{2}(-[A-Z]{2})?$",
			error: "Language must be a valid ISO language code (e.g., 'en', 'en-US')",
		}),
	),
	author: t.Optional(
		t.String({
			maxLength: MAX_AUTHOR_LENGTH,
			error: `Author must be no more than ${MAX_AUTHOR_LENGTH} characters`,
		}),
	),
	page: t.Optional(
		t.Number({
			minimum: 1,
			error: "Page must be a positive number",
		}),
	),
	limit: t.Optional(
		t.Number({
			minimum: MIN_PAGINATION_LIMIT,
			maximum: MAX_PAGINATION_LIMIT,
			error: `Limit must be between ${MIN_PAGINATION_LIMIT} and ${MAX_PAGINATION_LIMIT}`,
		}),
	),
});

// Export constants for use in other files
export const PAGINATION_CONSTANTS = {
	MAX_PAGINATION_LIMIT,
	MIN_PAGINATION_LIMIT,
	MAX_QUOTE_LENGTH,
	MAX_AUTHOR_LENGTH,
	MAX_CATEGORY_LENGTH,
} as const;
