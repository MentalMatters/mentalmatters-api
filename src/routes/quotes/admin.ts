import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, quotes } from "../../db/schema";
import { createQuoteSchema, updateQuoteSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const quotesAdminRoute = new Elysia({
	prefix: "/admin",
	detail: {
		security: [
			{
				"x-api-key": [],
			},
		],
	},
})
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

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

			return formatResponse({
				body: { message: "Quote created", quote: created },
				status: 201,
			});
		},
		{
			body: createQuoteSchema,
			detail: {
				tags: ["Admin", "Quotes"],
				summary: "Create a new quote",
				operationId: "createQuote",
				description:
					"Creates a new inspirational quote with author, category, and language information",
			},
		},
	)

	.put(
		"/:id",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid quote ID" },
					status: 400,
				});
			}

			const [existing] = await db
				.select()
				.from(quotes)
				.where(eq(quotes.id, id));

			if (!existing) {
				return formatResponse({
					body: { message: "Quote not found" },
					status: 404,
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

			return formatResponse({
				body: { message: "Quote updated", quote: updated },
				status: 200,
			});
		},
		{
			body: updateQuoteSchema,
			params: idParamSchema,
			detail: {
				tags: ["Admin", "Quotes"],
				summary: "Update a quote",
				operationId: "updateQuote",
				description:
					"Updates an existing quote's text, author, category, or language by its ID",
			},
		},
	)

	.delete(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid quote ID" },
					status: 400,
				});
			}

			const [deleted] = await db
				.delete(quotes)
				.where(eq(quotes.id, id))
				.returning();

			if (!deleted) {
				return formatResponse({
					body: { message: "Quote not found" },
					status: 404,
				});
			}

			return formatResponse({
				body: { message: "Quote deleted" },
				status: 200,
			});
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Admin", "Quotes"],
				summary: "Delete a quote",
				operationId: "deleteQuote",
				description: "Permanently removes a quote from the database by its ID",
			},
		},
	);
