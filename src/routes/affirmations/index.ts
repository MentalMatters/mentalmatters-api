import { and, desc, eq, inArray, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { affirmations, affirmationTags, tags } from "../../db/schema";
import { affirmationsAdminRoute } from "./admin";
import { createAffirmationSchema, getAffirmationsSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const affirmationsRoute = new Elysia({ prefix: "/affirmations" })
	.use(apiKeyPlugin())

	.get(
		"/",
		async ({ query }) => {
			// Build where conditions
			const conditions = [eq(affirmations.approved, 1)];

			if (query.category) {
				conditions.push(eq(affirmations.category, query.category));
			}

			if (query.language) {
				conditions.push(eq(affirmations.language, query.language));
			}

			// Handle tag filtering
			let tagFilteredAffirmationIds: number[] | undefined;
			if (query.tags && query.tags.length > 0) {
				const tagFilterQuery = await db
					.select({ affirmationId: affirmationTags.affirmationId })
					.from(affirmationTags)
					.innerJoin(tags, eq(affirmationTags.tagId, tags.id))
					.where(inArray(tags.name, query.tags))
					.groupBy(affirmationTags.affirmationId)
					.having(sql`COUNT(DISTINCT ${tags.name}) = ${query.tags.length}`);

				tagFilteredAffirmationIds = tagFilterQuery.map(
					(row) => row.affirmationId,
				);
				if (tagFilteredAffirmationIds.length === 0) {
					return formatResponse({
						body: {
							affirmations: [],
							pagination: {
								page: query.page || 1,
								limit: query.limit || 10,
								total: 0,
								totalPages: 0,
							},
						},
						status: 200,
					});
				}
			}

			if (tagFilteredAffirmationIds) {
				conditions.push(inArray(affirmations.id, tagFilteredAffirmationIds));
			}

			// Get total count for pagination
			const totalCountQuery = await db
				.select({ count: sql<number>`count(*)` })
				.from(affirmations)
				.where(and(...conditions));

			const total = totalCountQuery[0]?.count || 0;
			const page = Math.max(1, query.page || 1);
			const limit = Math.min(100, Math.max(1, query.limit || 10));
			const offset = (page - 1) * limit;
			const totalPages = Math.ceil(total / limit);

			const rows = await db
				.select({
					id: affirmations.id,
					text: affirmations.text,
					category: affirmations.category,
					language: affirmations.language,
					tag: tags.name,
				})
				.from(affirmations)
				.leftJoin(
					affirmationTags,
					eq(affirmations.id, affirmationTags.affirmationId),
				)
				.leftJoin(tags, eq(affirmationTags.tagId, tags.id))
				.where(and(...conditions))
				.orderBy(desc(affirmations.createdAt))
				.limit(limit)
				.offset(offset);

			const affirmationsMap = new Map<
				number,
				{
					id: number;
					text: string;
					category: string;
					language: string;
					tags: string[];
				}
			>();

			for (const row of rows) {
				if (!affirmationsMap.has(row.id)) {
					affirmationsMap.set(row.id, {
						id: row.id,
						text: row.text,
						category: row.category,
						language: row.language,
						tags: [],
					});
				}
				if (row.tag) {
					affirmationsMap.get(row.id)?.tags.push(row.tag);
				}
			}

			return formatResponse({
				body: {
					affirmations: Array.from(affirmationsMap.values()),
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
			query: getAffirmationsSchema,
			detail: {
				tags: ["Affirmations"],
				summary: "Get all affirmations",
				description:
					"Retrieve a list of all approved affirmations with their associated tags. Supports filtering by category, language, and tags, as well as pagination.",
			},
		},
	)

	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id) || id <= 0) {
				return formatResponse({
					body: {
						message: "Invalid affirmation ID. Must be a positive number.",
						error: "VALIDATION_ERROR",
					},
					status: 400,
				});
			}

			const rows = await db
				.select({
					id: affirmations.id,
					text: affirmations.text,
					category: affirmations.category,
					language: affirmations.language,
					tag: tags.name,
					approved: affirmations.approved,
				})
				.from(affirmations)
				.leftJoin(
					affirmationTags,
					eq(affirmations.id, affirmationTags.affirmationId),
				)
				.leftJoin(tags, eq(affirmationTags.tagId, tags.id))
				.where(eq(affirmations.id, id));

			if (!rows.length) {
				return formatResponse({
					body: {
						message: "Affirmation not found",
						error: "NOT_FOUND",
					},
					status: 404,
				});
			}

			if (!rows[0].approved) {
				return formatResponse({
					body: {
						message:
							"Affirmation is not approved and not available for public access",
						error: "NOT_APPROVED",
					},
					status: 403,
				});
			}

			const affirmation = {
				id: rows[0].id,
				text: rows[0].text,
				category: rows[0].category,
				language: rows[0].language,
				tags: rows.map((r) => r.tag).filter((tag): tag is string => !!tag),
			};

			return formatResponse({
				body: { affirmation },
				status: 200,
			});
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Affirmations"],
				summary: "Get affirmation by ID",
				description:
					"Retrieve a specific approved affirmation by its unique identifier",
			},
		},
	)

	.post(
		"/",
		async ({ body, apiKey }) => {
			try {
				const newAffirmationEntity = await db.transaction(async (tx) => {
					const [created] = await tx
						.insert(affirmations)
						.values({
							text: body.text,
							category: body.category,
							language: body.language,
							approved: apiKey.role === "ADMIN" ? 1 : 0,
							approvedAt: apiKey.role === "ADMIN" ? new Date() : null,
						})
						.returning();

					if (!created) throw new Error("Failed to create affirmation.");

					if (body.tags?.length) {
						const uniqueTags = [
							...new Set(
								body.tags
									.map((tag) => (typeof tag === "string" ? tag.trim() : ""))
									.filter((tag) => tag !== ""),
							),
						];

						if (uniqueTags.length) {
							await tx
								.insert(tags)
								.values(uniqueTags.map((name) => ({ name })))
								.onConflictDoNothing({ target: tags.name });

							const tagRecords = await tx
								.select()
								.from(tags)
								.where(inArray(tags.name, uniqueTags));

							await tx.insert(affirmationTags).values(
								tagRecords.map((tag) => ({
									affirmationId: created.id,
									tagId: tag.id,
								})),
							);
						}
					}

					return created;
				});

				const message =
					apiKey.role === "ADMIN"
						? "Successfully created and approved affirmation."
						: "Successfully created affirmation — pending approval.";

				return formatResponse({
					body: {
						message,
						affirmation: {
							id: newAffirmationEntity.id,
							text: newAffirmationEntity.text,
							category: newAffirmationEntity.category,
							language: newAffirmationEntity.language,
							approved: apiKey.role === "ADMIN",
						},
					},
					status: 201,
				});
			} catch (error) {
				console.error("Error creating affirmation:", error);
				return formatResponse({
					body: {
						message: "Failed to create affirmation. Please try again.",
						error: "INTERNAL_ERROR",
					},
					status: 500,
				});
			}
		},
		{
			body: createAffirmationSchema,
			detail: {
				tags: ["Affirmations"],
				summary: "Create new affirmation",
				operationId: "createAffirmationRequest",
				description:
					"Submit a new affirmation for approval. When submitted by a regular user, the affirmation will require admin approval before becoming visible. Admin users can create approved affirmations directly.",
			},
		},
	)
	.use(affirmationsAdminRoute);
