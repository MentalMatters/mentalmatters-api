import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey"; // your plugin
import { db } from "../../db";
import { ApiKeyRole, quotes } from "../../db/schema";
import { createQuoteSchema, updateQuoteSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const quotesAdminRoute = new Elysia({ prefix: "/admin" })
	// only ADMIN keys
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	// Create quote
	.post(
		"/",
		async ({ body }) => {
			const [created] = await db
				.insert(quotes)
				.values({
					quoteText: body.quoteText,
					author: body.author,
					category: body.category,
					language: body.language,
				})
				.returning();

			return new Response(
				JSON.stringify({ message: "Quote created", quote: created }),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			);
		},
		{ body: createQuoteSchema },
	)

	// Update quote
	.put(
		"/:id",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(JSON.stringify({ message: "Invalid quote ID" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [existing] = await db
				.select()
				.from(quotes)
				.where(eq(quotes.id, id));

			if (!existing) {
				return new Response(JSON.stringify({ message: "Quote not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [updated] = await db
				.update(quotes)
				.set({
					quoteText: body.quoteText ?? existing.quoteText,
					author: body.author ?? existing.author,
					category: body.category ?? existing.category,
					language: body.language ?? existing.language,
					updatedAt: new Date(),
				})
				.where(eq(quotes.id, id))
				.returning();

			return new Response(
				JSON.stringify({ message: "Quote updated", quote: updated }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		},
		{ body: updateQuoteSchema, params: idParamSchema },
	)

	// Delete quote
	.delete(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(JSON.stringify({ message: "Invalid quote ID" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [deleted] = await db
				.delete(quotes)
				.where(eq(quotes.id, id))
				.returning();

			if (!deleted) {
				return new Response(JSON.stringify({ message: "Quote not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ message: "Quote deleted" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: idParamSchema },
	);
