import { t } from "elysia";

// Validation constants
const MAX_TAG_NAME_LENGTH = 50;
const MIN_TAG_NAME_LENGTH = 1;
const MAX_PAGINATION_LIMIT = 100;
const MIN_PAGINATION_LIMIT = 1;

export const createTagSchema = t.Object({
	name: t.String({
		minLength: MIN_TAG_NAME_LENGTH,
		maxLength: MAX_TAG_NAME_LENGTH,
		pattern: "^[a-zA-Z0-9\\s-_]+$",
		error: `Tag name must be between ${MIN_TAG_NAME_LENGTH} and ${MAX_TAG_NAME_LENGTH} characters and contain only letters, numbers, spaces, hyphens, and underscores`,
	}),
});

export const updateTagSchema = t.Object({
	name: t.Optional(
		t.String({
			minLength: MIN_TAG_NAME_LENGTH,
			maxLength: MAX_TAG_NAME_LENGTH,
			pattern: "^[a-zA-Z0-9\\s-_]+$",
			error: `Tag name must be between ${MIN_TAG_NAME_LENGTH} and ${MAX_TAG_NAME_LENGTH} characters and contain only letters, numbers, spaces, hyphens, and underscores`,
		}),
	),
});

export const getTagsSchema = t.Object({
	name: t.Optional(
		t.String({
			maxLength: MAX_TAG_NAME_LENGTH,
			error: `Search term must be no more than ${MAX_TAG_NAME_LENGTH} characters`,
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
