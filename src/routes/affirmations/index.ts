import { eq, inArray } from "drizzle-orm";
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
		async () => {
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
				.where(eq(affirmations.approved, 1));

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
					"Retrieve a list of all approved affirmations with their associated tags",
			},
		},
	)

	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid affirmation ID" },
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

			if (!rows.length || !rows[0].approved) {
				return formatResponse({
					body: { message: "Affirmation not found" },
					status: 404,
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
				description: "Retrieve a specific affirmation by its unique identifier",
			},
		},
	)

	.post(
		"/",
		async ({ body, apiKey }) => {
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

			return formatResponse({
				body: {
					message: "Successfully created affirmation — pending approval.",
					affirmation: {
						id: newAffirmationEntity.id,
						text: newAffirmationEntity.text,
					},
				},
				status: 201,
			});
		},
		{
			body: createAffirmationSchema,
			detail: {
				tags: ["Affirmations"],
				summary: "Create new affirmation",
				operationId: "createAffirmationRequest",
				description:
					"Submit a new affirmation for approval. When submitted by a regular user, the affirmation will require admin approval before becoming visible.",
			},
		},
	)
	.use(affirmationsAdminRoute);
