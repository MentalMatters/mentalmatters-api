import { t } from "elysia";

// ISO 639-1 language code validation (2-3 character codes)
const languageCodePattern = "^[a-z]{2,3}$";

export const createLanguageSchema = t.Object({
	code: t.String({
		pattern: languageCodePattern,
		error:
			"Language code must be a valid ISO 639-1 code (2-3 lowercase letters)",
	}),
	name: t.String({
		minLength: 1,
		maxLength: 100,
		error: "Language name must be between 1 and 100 characters",
	}),
});

export const updateLanguageSchema = t.Object({
	name: t.Optional(
		t.String({
			minLength: 1,
			maxLength: 100,
			error: "Language name must be between 1 and 100 characters",
		}),
	),
});

export const getLanguagesSchema = t.Object({
	code: t.Optional(
		t.String({
			pattern: languageCodePattern,
			error:
				"Language code must be a valid ISO 639-1 code (2-3 lowercase letters)",
		}),
	),
	name: t.Optional(
		t.String({
			minLength: 1,
			maxLength: 100,
			error: "Language name must be between 1 and 100 characters",
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
