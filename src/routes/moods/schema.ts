import { t } from "elysia";

// ISO 639-1 language code validation (2-3 character codes)
const languageCodePattern = "^[a-z]{2,3}$";

export const createMoodSchema = t.Object({
	name: t.String({
		minLength: 1,
		maxLength: 100,
		error: "Mood name must be between 1 and 100 characters",
	}),
	description: t.Optional(
		t.String({
			maxLength: 500,
			error: "Description must be less than 500 characters",
		}),
	),
	emoji: t.Optional(
		t.String({
			maxLength: 10,
			error: "Emoji must be less than 10 characters",
		}),
	),
	language: t.String({
		pattern: languageCodePattern,
		error:
			"Language code must be a valid ISO 639-1 code (2-3 lowercase letters)",
	}),
});

export const updateMoodSchema = t.Object({
	name: t.Optional(
		t.String({
			minLength: 1,
			maxLength: 100,
			error: "Mood name must be between 1 and 100 characters",
		}),
	),
	description: t.Optional(
		t.String({
			maxLength: 500,
			error: "Description must be less than 500 characters",
		}),
	),
	emoji: t.Optional(
		t.String({
			maxLength: 10,
			error: "Emoji must be less than 10 characters",
		}),
	),
	language: t.Optional(
		t.String({
			pattern: languageCodePattern,
			error:
				"Language code must be a valid ISO 639-1 code (2-3 lowercase letters)",
		}),
	),
});

export const getMoodsSchema = t.Object({
	language: t.Optional(
		t.String({
			pattern: languageCodePattern,
			error:
				"Language code must be a valid ISO 639-1 code (2-3 lowercase letters)",
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
			minimum: 1,
			maximum: 100,
			error: "Limit must be between 1 and 100",
		}),
	),
});
