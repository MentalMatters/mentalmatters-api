import { and, eq, like } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, quotes } from "../../db/schema";
import { quotesAdminRoute } from "./admin";
import { getQuotesSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const quotesRoute = new Elysia({ prefix: "/quotes" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	.get(
		"/",
		async ({ query }) => {
			const filters = [
				query.language ? eq(quotes.language, query.language) : undefined,
				query.category ? eq(quotes.category, query.category) : undefined,
				query.author ? like(quotes.author, `%${query.author}%`) : undefined,
			].filter(Boolean);

			const all = await db
				.select()
				.from(quotes)
				.where(filters.length ? and(...filters) : undefined);

			return formatResponse({
				body: { quotes: all },
				status: 200,
			});
		},
		{
			query: getQuotesSchema,
			detail: {
				tags: ["Quotes"],
				summary: "Get all quotes",
				operationId: "getAllQuotes",
				description:
					"Retrieve a list of all quotes with optional filtering by language, category, or author",
			},
		},
	)

	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid quote ID" },
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
