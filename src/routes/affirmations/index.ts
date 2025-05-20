import { eq, inArray } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { db } from "../../db";
import { affirmations, affirmationTags, tags } from "../../db/schema";
import { affirmationsAdminRoute } from "./admin";
import { createAffirmationSchema, getAffirmationsSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const affirmationsRoute = new Elysia({ prefix: "/affirmations" })
	.use(apiKeyPlugin())

	// Get all approved affirmations
	.get(
		"/",
		async () => {
			const allAffirmations = await db
				.select()
				.from(affirmations)
				.where(eq(affirmations.approved, 1));

			return new Response(
				JSON.stringify({
					affirmations: allAffirmations.map((a) => ({
						id: a.id,
						text: a.text,
						category: a.category,
						language: a.language,
					})),
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		},
		{ query: getAffirmationsSchema },
	)

	// Get a specific approved affirmation by ID
	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(
					JSON.stringify({ message: "Invalid affirmation ID" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const [affirmation] = await db
				.select()
				.from(affirmations)
				.where(eq(affirmations.id, id));

			if (!affirmation || !affirmation.approved) {
				return new Response(
					JSON.stringify({ message: "Affirmation not found" }),
					{ status: 404, headers: { "Content-Type": "application/json" } },
				);
			}

			return new Response(
				JSON.stringify({
					affirmation: {
						id: affirmation.id,
						text: affirmation.text,
						category: affirmation.category,
						language: affirmation.language,
					},
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		},
		{ params: idParamSchema },
	)

	// Create affirmation (public)
	.post(
		"/",
		async ({ body }) => {
			const newAffirmationEntity = await db.transaction(async (tx) => {
				const [created] = await tx
					.insert(affirmations)
					.values({
						text: body.text,
						category: body.category,
						language: body.language,
						approved: 0, // always unapproved by default
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

			return new Response(
				JSON.stringify({
					message: "Successfully created affirmation — pending approval.",
					affirmation: {
						id: newAffirmationEntity.id,
						text: newAffirmationEntity.text,
					},
				}),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			);
		},
		{ body: createAffirmationSchema },
	)
	.use(affirmationsAdminRoute);
