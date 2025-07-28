import { and, desc, eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, moods } from "../../db/schema";
import { moodsAdminRoute } from "./admin";
import { getMoodsSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const moodsRoute = new Elysia({ prefix: "/moods" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	.get(
		"/",
		async ({ query }) => {
			// Build where conditions
			const conditions = [];

			if (query.language) {
				conditions.push(eq(moods.language, query.language));
			}

			// Get total count for pagination
			const totalCountQuery = await db
				.select({ count: sql<number>`count(*)` })
				.from(moods)
				.where(conditions.length ? and(...conditions) : undefined);

			const total = totalCountQuery[0]?.count || 0;
			const page = Math.max(1, query.page || 1);
			const limit = Math.min(100, Math.max(1, query.limit || 10));
			const offset = (page - 1) * limit;
			const totalPages = Math.ceil(total / limit);

			const allMoods = await db
				.select()
				.from(moods)
				.where(conditions.length ? and(...conditions) : undefined)
				.orderBy(desc(moods.createdAt))
				.limit(limit)
				.offset(offset);

			return formatResponse({
				body: {
					moods: allMoods,
					pagination: {
						page,
						limit,
						total,
						totalPages,
					},
				},
				status: 200,
			});
		},
		{
			query: getMoodsSchema,
			detail: {
				tags: ["Moods"],
				summary: "Get all moods",
				description:
					"Retrieve a list of all moods with optional language filtering and pagination",
			},
		},
	)

	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid mood ID" },
					status: 400,
				});
			}

			const [mood] = await db.select().from(moods).where(eq(moods.id, id));

			if (!mood) {
				return formatResponse({
					body: { message: "Mood not found" },
					status: 404,
				});
			}

			return formatResponse({
				body: { mood },
				status: 200,
			});
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Moods"],
				summary: "Get mood by ID",
				description: "Retrieve a specific mood by its unique identifier",
			},
		},
	)
	.use(moodsAdminRoute);
