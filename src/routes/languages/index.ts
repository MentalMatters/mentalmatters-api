import { and, eq, like, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, languages } from "../../db/schema";
import { languagesAdminRoute } from "./admin";
import { getLanguagesSchema } from "./schema";
import type {
	GetLanguagesQuery,
	LanguageResponse,
	LanguagesResponse,
} from "./types";

const codeParamSchema = t.Object({
	code: t.String({
		pattern: "^[a-z]{2,3}$",
		error:
			"Language code must be a valid ISO 639-1 code (2-3 lowercase letters)",
	}),
});

export const languagesRoute = new Elysia({ prefix: "/languages" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	.get(
		"/",
		async ({ query }: { query: GetLanguagesQuery }) => {
			try {
				// Build where conditions
				const conditions = [];

				if (query.code) {
					conditions.push(eq(languages.code, query.code));
				}

				if (query.name) {
					conditions.push(like(languages.name, `%${query.name}%`));
				}

				// Get total count for pagination
				const totalCountQuery = await db
					.select({ count: sql<number>`count(*)` })
					.from(languages)
					.where(conditions.length > 0 ? and(...conditions) : undefined);

				const total = totalCountQuery[0]?.count || 0;
				const page = Math.max(1, query.page || 1);
				const limit = Math.min(100, Math.max(1, query.limit || 10));
				const offset = (page - 1) * limit;
				const totalPages = Math.ceil(total / limit);

				const allLanguages = await db
					.select()
					.from(languages)
					.where(conditions.length > 0 ? and(...conditions) : undefined)
					.limit(limit)
					.offset(offset);

				return formatResponse({
					body: {
						languages: allLanguages,
						pagination: {
							page,
							limit,
							total,
							totalPages,
						},
					} as LanguagesResponse,
					status: 200,
				});
			} catch (_error) {
				return formatResponse({
					body: { message: "Failed to fetch languages" },
					status: 500,
				});
			}
		},
		{
			query: getLanguagesSchema,
			detail: {
				tags: ["Languages"],
				summary: "Get all languages",
				description:
					"Retrieve a list of all supported languages with optional filtering by code or name and pagination support",
			},
		},
	)

	.get(
		"/:code",
		async ({ params }) => {
			try {
				const code = params.code;
				if (!code) {
					return formatResponse({
						body: { message: "Invalid language code" },
						status: 400,
					});
				}

				const [language] = await db
					.select()
					.from(languages)
					.where(eq(languages.code, code));

				if (!language) {
					return formatResponse({
						body: { message: "Language not found" },
						status: 404,
					});
				}

				return formatResponse({
					body: { language } as LanguageResponse,
					status: 200,
				});
			} catch (_error) {
				return formatResponse({
					body: { message: "Failed to fetch language" },
					status: 500,
				});
			}
		},
		{
			params: codeParamSchema,
			detail: {
				tags: ["Languages"],
				summary: "Get language by code",
				description: "Retrieve a specific language by its ISO code",
			},
		},
	)
	.use(languagesAdminRoute);
