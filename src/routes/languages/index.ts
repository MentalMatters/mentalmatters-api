import { eq, like } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, languages } from "../../db/schema";
import { languagesAdminRoute } from "./admin";
import { createLanguageSchema, getLanguagesSchema } from "./schema";

const codeParamSchema = t.Object({ code: t.String() });

export const languagesRoute = new Elysia({ prefix: "/languages" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	.post(
		"/",
		async ({ body }) => {
			try {
				const [createdLanguage] = await db
					.insert(languages)
					.values({ code: body.code, name: body.name })
					.onConflictDoNothing({ target: languages.code })
					.returning();

				if (!createdLanguage) {
					return formatResponse({
						body: { message: "Language already exists." },
						status: 409,
					});
				}

				return formatResponse({
					body: {
						message: "Language created",
						language: createdLanguage,
					},
					status: 201,
				});
			} catch {
				return formatResponse({
					body: { message: "Failed to create language." },
					status: 500,
				});
			}
		},
		{ body: createLanguageSchema },
	)

	.get(
		"/",
		async ({ query }) => {
			const filters = [
				query.code ? eq(languages.code, query.code) : undefined,
				query.name ? like(languages.name, `%${query.name}%`) : undefined,
			].filter(Boolean);

			const allLanguages = await db
				.select()
				.from(languages)
				.where(
					filters.length
						? filters.length === 1
							? filters[0]
							: undefined
						: undefined,
				);

			return formatResponse({
				body: { languages: allLanguages },
				status: 200,
			});
		},
		{ query: getLanguagesSchema },
	)

	.get(
		"/:code",
		async ({ params }) => {
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
				body: { language },
				status: 200,
			});
		},
		{ params: codeParamSchema },
	)
	.use(languagesAdminRoute);
