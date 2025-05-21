import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, languages } from "../../db/schema";
import { createLanguageSchema, updateLanguageSchema } from "./schema";

const codeParamSchema = t.Object({ code: t.String() });

export const languagesAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

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

	.put(
		"/:code",
		async ({ params, body }) => {
			const code = params.code;
			if (!code) {
				return formatResponse({
					body: { message: "Invalid language code" },
					status: 400,
				});
			}

			const [existing] = await db
				.select()
				.from(languages)
				.where(eq(languages.code, code));

			if (!existing) {
				return formatResponse({
					body: { message: "Language not found" },
					status: 404,
				});
			}

			const [updated] = await db
				.update(languages)
				.set({
					name: body.name ?? existing.name,
				})
				.where(eq(languages.code, code))
				.returning();

			return formatResponse({
				body: {
					message: "Language updated",
					language: updated,
				},
				status: 200,
			});
		},
		{ body: updateLanguageSchema, params: codeParamSchema },
	)

	.delete(
		"/:code",
		async ({ params }) => {
			const code = params.code;
			if (!code) {
				return formatResponse({
					body: { message: "Invalid language code" },
					status: 400,
				});
			}

			const [deleted] = await db
				.delete(languages)
				.where(eq(languages.code, code))
				.returning();

			if (!deleted) {
				return formatResponse({
					body: { message: "Language not found" },
					status: 404,
				});
			}

			return formatResponse({
				body: { message: "Language deleted" },
				status: 200,
			});
		},
		{ params: codeParamSchema },
	);
