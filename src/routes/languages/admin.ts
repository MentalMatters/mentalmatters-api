import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { db } from "../../db";
import { ApiKeyRole, languages } from "../../db/schema";
import { updateLanguageSchema } from "./schema";

const codeParamSchema = t.Object({ code: t.String() });

export const languagesAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	// Admin: Update language
	.put(
		"/:code",
		async ({ params, body }) => {
			const code = params.code;
			if (!code) {
				return new Response(
					JSON.stringify({ message: "Invalid language code" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const [existing] = await db
				.select()
				.from(languages)
				.where(eq(languages.code, code));

			if (!existing) {
				return new Response(JSON.stringify({ message: "Language not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [updated] = await db
				.update(languages)
				.set({
					name: body.name ?? existing.name,
				})
				.where(eq(languages.code, code))
				.returning();

			return new Response(
				JSON.stringify({
					message: "Language updated",
					language: updated,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		},
		{ body: updateLanguageSchema, params: codeParamSchema },
	)

	// Admin: Delete language
	.delete(
		"/:code",
		async ({ params }) => {
			const code = params.code;
			if (!code) {
				return new Response(
					JSON.stringify({ message: "Invalid language code" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const [deleted] = await db
				.delete(languages)
				.where(eq(languages.code, code))
				.returning();

			if (!deleted) {
				return new Response(JSON.stringify({ message: "Language not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ message: "Language deleted" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: codeParamSchema },
	);
