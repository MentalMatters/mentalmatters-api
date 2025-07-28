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
			try {
				// Check if quote already exists (case-insensitive)
				const existingQuote = await db
					.select()
					.from(quotes)
					.where(eq(quotes.quoteText, body.quoteText));

				if (existingQuote.length > 0) {
					return formatResponse({
						body: { message: "Quote already exists" },
						status: 409,
					});
				}

				const [created] = await db
					.insert(quotes)
					.values({
						quoteText: body.quoteText.trim(),
						author: body.author?.trim() || null,
						category: body.category?.trim() || null,
						language: body.language,
					})
					.returning();

				return formatResponse({
					body: { message: "Quote created successfully", quote: created },
					status: 201,
				});
			} catch (error) {
				console.error("Error creating quote:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
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
			try {
				const id = Number(params.id);
				if (Number.isNaN(id) || id <= 0) {
					return formatResponse({
						body: { message: "Invalid quote ID. Must be a positive number." },
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

				// Check if the new quote text already exists (if it's being changed)
				if (body.quoteText && body.quoteText !== existing.quoteText) {
					const duplicateQuote = await db
						.select()
						.from(quotes)
						.where(eq(quotes.quoteText, body.quoteText));

					if (duplicateQuote.length > 0) {
						return formatResponse({
							body: { message: "Quote text already exists" },
							status: 409,
						});
					}
				}

				const updateData: Partial<{
					quoteText: string;
					author: string | null;
					category: string | null;
					language: string;
					updatedAt: Date;
				}> = {
					updatedAt: new Date(),
				};

				// Only update fields that are provided
				if (body.quoteText !== undefined) {
					updateData.quoteText = body.quoteText.trim();
				}
				if (body.author !== undefined) {
					updateData.author = body.author?.trim() || null;
				}
				if (body.category !== undefined) {
					updateData.category = body.category?.trim() || null;
				}
				if (body.language !== undefined) {
					updateData.language = body.language;
				}

				const [updated] = await db
					.update(quotes)
					.set(updateData)
					.where(eq(quotes.id, id))
					.returning();

				return formatResponse({
					body: { message: "Quote updated successfully", quote: updated },
					status: 200,
				});
			} catch (error) {
				console.error("Error updating quote:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
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
			try {
				const id = Number(params.id);
				if (Number.isNaN(id) || id <= 0) {
					return formatResponse({
						body: { message: "Invalid quote ID. Must be a positive number." },
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
					body: { message: "Quote deleted successfully" },
					status: 200,
				});
			} catch (error) {
				console.error("Error deleting quote:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
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
