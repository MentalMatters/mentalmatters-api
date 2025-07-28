import { and, count, desc, eq, like } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, quotes } from "../../db/schema";
import { quotesAdminRoute } from "./admin";
import { getQuotesSchema, PAGINATION_CONSTANTS } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const quotesRoute = new Elysia({ prefix: "/quotes" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	.get(
		"/",
		async ({ query }) => {
			try {
				const filters = [
					query.language ? eq(quotes.language, query.language) : undefined,
					query.category ? eq(quotes.category, query.category) : undefined,
					query.author ? like(quotes.author, `%${query.author}%`) : undefined,
				].filter(Boolean);

				// Pagination
				const page = query.page || 1;
				const limit = Math.min(
					query.limit || PAGINATION_CONSTANTS.MAX_PAGINATION_LIMIT,
					PAGINATION_CONSTANTS.MAX_PAGINATION_LIMIT,
				);
				const offset = (page - 1) * limit;

				// Get total count for pagination metadata
				const countResult = await db
					.select({ total: count() })
					.from(quotes)
					.where(filters.length ? and(...filters) : undefined);

				const totalCount = countResult[0]?.total || 0;
				const totalPages = Math.ceil(totalCount / limit);

				// Get paginated results
				const all = await db
					.select()
					.from(quotes)
					.where(filters.length ? and(...filters) : undefined)
					.orderBy(desc(quotes.createdAt))
					.limit(limit)
					.offset(offset);

				return formatResponse({
					body: {
						quotes: all,
						pagination: {
							page,
							limit,
							totalCount,
							totalPages,
							hasNext: page < totalPages,
							hasPrev: page > 1,
						},
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error fetching quotes:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			query: getQuotesSchema,
			detail: {
				tags: ["Quotes"],
				summary: "Get all quotes",
				operationId: "getAllQuotes",
				description:
					"Retrieve a paginated list of all quotes with optional filtering by language, category, or author",
			},
		},
	)

	.get(
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

				const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));

				if (!quote) {
					return formatResponse({
						body: { message: "Quote not found" },
						status: 404,
					});
				}

				return formatResponse({
					body: { quote },
					status: 200,
				});
			} catch (error) {
				console.error("Error fetching quote by ID:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Quotes"],
				summary: "Get quote by ID",
				operationId: "getQuoteById",
				description: "Retrieve a specific quote by its unique identifier",
			},
		},
	)
	.use(quotesAdminRoute);
