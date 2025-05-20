import { eq, like } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { db } from "../../db";
import { ApiKeyRole, languages } from "../../db/schema";
import { languagesAdminRoute } from "./admin";
import { createLanguageSchema, getLanguagesSchema } from "./schema";

const codeParamSchema = t.Object({ code: t.String() });

export const languagesRoute = new Elysia({ prefix: "/languages" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER })) // <-- API key required, any user role

	// Public: Create language
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
					return new Response(
						JSON.stringify({ message: "Language already exists." }),
						{ status: 409, headers: { "Content-Type": "application/json" } },
					);
				}

				return new Response(
					JSON.stringify({
						message: "Language created",
						language: createdLanguage,
					}),
					{ status: 201, headers: { "Content-Type": "application/json" } },
				);
			} catch {
				return new Response(
					JSON.stringify({ message: "Failed to create language." }),
					{ status: 500, headers: { "Content-Type": "application/json" } },
				);
			}
		},
		{ body: createLanguageSchema },
	)

	// Public: Get all languages (with optional filtering)
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

			return new Response(JSON.stringify({ languages: allLanguages }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ query: getLanguagesSchema },
	)

	// Public: Get language by code
	.get(
		"/:code",
		async ({ params }) => {
			const code = params.code;
			if (!code) {
				return new Response(
					JSON.stringify({ message: "Invalid language code" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const [language] = await db
				.select()
				.from(languages)
				.where(eq(languages.code, code));

			if (!language) {
				return new Response(JSON.stringify({ message: "Language not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ language }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: codeParamSchema },
	)
	.use(languagesAdminRoute);
