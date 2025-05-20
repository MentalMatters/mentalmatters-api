import { and, eq, like } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey"; // your plugin
import { db } from "../../db";
import { ApiKeyRole, quotes } from "../../db/schema";
import { quotesAdminRoute } from "./admin";
import { getQuotesSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const quotesRoute = new Elysia({ prefix: "/quotes" })
	// any valid key (no admin required)
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	// Get all quotes (with optional filtering)
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

			return new Response(JSON.stringify({ quotes: all }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ query: getQuotesSchema },
	)

	// Get quote by ID
	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(JSON.stringify({ message: "Invalid quote ID" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));

			if (!quote) {
				return new Response(JSON.stringify({ message: "Quote not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ quote }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: idParamSchema },
	)
	.use(quotesAdminRoute);
