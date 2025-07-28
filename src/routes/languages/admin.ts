import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, languages } from "../../db/schema";
import { createLanguageSchema, updateLanguageSchema } from "./schema";
import type { CreateLanguageRequest, UpdateLanguageRequest } from "./types";

const codeParamSchema = t.Object({
	code: t.String({
		pattern: "^[a-z]{2,3}$",
		error:
			"Language code must be a valid ISO 639-1 code (2-3 lowercase letters)",
	}),
});

export const languagesAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	.post(
		"/",
		async ({ body }: { body: CreateLanguageRequest }) => {
			try {
				// Check if language already exists
				const [existing] = await db
					.select()
					.from(languages)
					.where(eq(languages.code, body.code));

				if (existing) {
					return formatResponse({
						body: { message: "Language with this code already exists" },
						status: 409,
					});
				}

				const [createdLanguage] = await db
					.insert(languages)
					.values({ code: body.code, name: body.name })
					.returning();

				return formatResponse({
					body: {
						message: "Language created successfully",
						language: createdLanguage,
					},
					status: 201,
				});
			} catch (error) {
				console.error("Error creating language:", error);
				return formatResponse({
					body: { message: "Failed to create language" },
					status: 500,
				});
			}
		},
		{
			body: createLanguageSchema,
			detail: {
				tags: ["Admin", "Languages"],
				summary: "Create a language",
				operationId: "createLanguage",
				description: "Creates a new language entry with ISO code and name",
			},
		},
	)

	.put(
		"/:code",
		async ({
			params,
			body,
		}: {
			params: { code: string };
			body: UpdateLanguageRequest;
		}) => {
			try {
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

				// If no name provided, return current language
				if (!body.name) {
					return formatResponse({
						body: {
							message: "No changes provided",
							language: existing,
						},
						status: 200,
					});
				}

				const [updated] = await db
					.update(languages)
					.set({
						name: body.name,
					})
					.where(eq(languages.code, code))
					.returning();

				return formatResponse({
					body: {
						message: "Language updated successfully",
						language: updated,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error updating language:", error);
				return formatResponse({
					body: { message: "Failed to update language" },
					status: 500,
				});
			}
		},
		{
			body: updateLanguageSchema,
			params: codeParamSchema,
			detail: {
				tags: ["Admin", "Languages"],
				summary: "Update a language",
				operationId: "updateLanguage",
				description: "Updates an existing language's name by its ISO code",
			},
		},
	)

	.delete(
		"/:code",
		async ({ params }: { params: { code: string } }) => {
			try {
				const code = params.code;
				if (!code) {
					return formatResponse({
						body: { message: "Invalid language code" },
						status: 400,
					});
				}

				// Check if language exists before attempting to delete
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

				const [deleted] = await db
					.delete(languages)
					.where(eq(languages.code, code))
					.returning();

				return formatResponse({
					body: {
						message: "Language deleted successfully",
						language: deleted,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error deleting language:", error);
				return formatResponse({
					body: { message: "Failed to delete language" },
					status: 500,
				});
			}
		},
		{
			params: codeParamSchema,
			detail: {
				tags: ["Admin", "Languages"],
				summary: "Delete a language",
				operationId: "deleteLanguage",
				description:
					"Permanently removes a language from the database by its ISO code",
			},
		},
	);
