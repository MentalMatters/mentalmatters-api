import { t } from "elysia";
import { AffirmationCategory } from "../../db/schema";

// Validation constants
const MAX_TEXT_LENGTH = 500;
const MIN_TEXT_LENGTH = 1;
const MAX_TAGS_COUNT = 10;
const MAX_PAGINATION_LIMIT = 100;
const MIN_PAGINATION_LIMIT = 1;

// Affirmations
export const createAffirmationSchema = t.Object({
	text: t.String({
		minLength: MIN_TEXT_LENGTH,
		maxLength: MAX_TEXT_LENGTH,
		error: `Text must be between ${MIN_TEXT_LENGTH} and ${MAX_TEXT_LENGTH} characters`,
	}),
	category: t.Enum(AffirmationCategory),
	language: t.String({
		minLength: 2,
		maxLength: 5,
		pattern: "^[a-z]{2}(-[A-Z]{2})?$",
		error: "Language must be a valid ISO language code (e.g., 'en', 'en-US')",
	}),
	tags: t.Optional(
		t.Array(
			t.String({
				minLength: 1,
				maxLength: 50,
				pattern: "^[a-zA-Z0-9\\s-_]+$",
				error:
					"Tag must be 1-50 characters and contain only letters, numbers, spaces, hyphens, and underscores",
			}),
			{
				maxItems: MAX_TAGS_COUNT,
				error: `Maximum ${MAX_TAGS_COUNT} tags allowed`,
			},
		),
	),
});

export const updateAffirmationSchema = t.Object({
	id: t.Number(),
	text: t.Optional(
		t.String({
			minLength: MIN_TEXT_LENGTH,
			maxLength: MAX_TEXT_LENGTH,
			error: `Text must be between ${MIN_TEXT_LENGTH} and ${MAX_TEXT_LENGTH} characters`,
		}),
	),
	category: t.Optional(t.Enum(AffirmationCategory)),
	language: t.Optional(
		t.String({
			minLength: 2,
			maxLength: 5,
			pattern: "^[a-z]{2}(-[A-Z]{2})?$",
			error: "Language must be a valid ISO language code (e.g., 'en', 'en-US')",
		}),
	),
	tags: t.Optional(
		t.Array(
			t.String({
				minLength: 1,
				maxLength: 50,
				pattern: "^[a-zA-Z0-9\\s-_]+$",
				error:
					"Tag must be 1-50 characters and contain only letters, numbers, spaces, hyphens, and underscores",
			}),
			{
				maxItems: MAX_TAGS_COUNT,
				error: `Maximum ${MAX_TAGS_COUNT} tags allowed`,
			},
		),
	),
});

export const getAffirmationsSchema = t.Object({
	category: t.Optional(t.Enum(AffirmationCategory)),
	language: t.Optional(
		t.String({
			minLength: 2,
			maxLength: 5,
			pattern: "^[a-z]{2}(-[A-Z]{2})?$",
			error: "Language must be a valid ISO language code (e.g., 'en', 'en-US')",
		}),
	),
	tags: t.Optional(
		t.Array(
			t.String({
				minLength: 1,
				maxLength: 50,
				pattern: "^[a-zA-Z0-9\\s-_]+$",
				error:
					"Tag must be 1-50 characters and contain only letters, numbers, spaces, hyphens, and underscores",
			}),
			{
				maxItems: MAX_TAGS_COUNT,
				error: `Maximum ${MAX_TAGS_COUNT} tags allowed`,
			},
		),
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
