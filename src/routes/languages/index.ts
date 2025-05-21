import { eq, like } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, languages } from "../../db/schema";
import { languagesAdminRoute } from "./admin";
import { getLanguagesSchema } from "./schema";

const codeParamSchema = t.Object({ code: t.String() });

export const languagesRoute = new Elysia({ prefix: "/languages" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

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
