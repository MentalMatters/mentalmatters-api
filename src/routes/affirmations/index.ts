import { and, eq, inArray } from "drizzle-orm";
import Elysia from "elysia";
import { db } from "../../db";
import { affirmations, affirmationTags, tags } from "../../db/schema";
import { createAffirmationSchema } from "./schema";

export const affirmationsRoute = new Elysia({ prefix: "/affirmations" })
	// Create affirmation (POST)
	.post(
		"/",
		async ({ body }) => {
			try {
				const newAffirmationEntity = await db.transaction(async (tx) => {
					const [createdAffirmation] = await tx
						.insert(affirmations)
						.values({
							text: body.text,
							category: body.category,
							language: body.language,
						})
						.returning();

					if (!createdAffirmation) {
						throw new Error("Failed to create affirmation.");
					}

					if (body.tags && body.tags.length > 0) {
						const uniqueTagNames = [
							...new Set(
								body.tags
									.map((tag) => (typeof tag === "string" ? tag.trim() : ""))
									.filter((tagName) => tagName !== ""),
							),
						];

						if (uniqueTagNames.length > 0) {
							await tx
								.insert(tags)
								.values(uniqueTagNames.map((name) => ({ name })))
								.onConflictDoNothing({ target: tags.name });

							const tagRecords = await tx
								.select()
								.from(tags)
								.where(inArray(tags.name, uniqueTagNames));

							if (tagRecords.length > 0) {
								await tx.insert(affirmationTags).values(
									tagRecords.map((tag) => ({
										affirmationId: createdAffirmation.id,
										tagId: tag.id,
									})),
								);
							}
						}
					}

					return createdAffirmation;
				});

				return new Response(
					JSON.stringify({
						message: "Successfully created affirmation",
						affirmation: {
							id: newAffirmationEntity.id,
							text: newAffirmationEntity.text,
						},
					}),
					{
						status: 201,
						headers: { "Content-Type": "application/json" },
					},
				);
			} catch (error) {
				// It's good practice to log the actual error for debugging purposes
				console.error("Error creating affirmation:", error);

				const errorMessage =
					error instanceof Error ? error.message : String(error);

				// Check for unique constraint violation (SQLite specific messages)
				// Drizzle ORM might not provide a specific error code for this, so string matching is often necessary.
				// For PostgreSQL, you might check error.code === '23505'.
				if (
					errorMessage.includes(
						"UNIQUE constraint failed: affirmations.text",
					) || // SQLite
					errorMessage.toLowerCase().includes("unique constraint") || // More general unique constraint check
					errorMessage.includes(
						"duplicate key value violates unique constraint",
					) // PostgreSQL
				) {
					return new Response(
						JSON.stringify({
							message: "Affirmation with this text already exists.",
						}),
						{
							status: 409, // Conflict
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				// Generic server error
				return new Response(
					JSON.stringify({
						message: "Failed to create affirmation due to a server error.",
					}),
					{
						status: 500,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		},
		{
			body: createAffirmationSchema,
		},
	)

	// Get all approved affirmations (GET)
	.get("/", async () => {
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
	})

	// Get a specific approved affirmation by ID (GET)
	.get("/:id", async ({ params }) => {
		const id = Number(params.id);
		if (Number.isNaN(id)) {
			return new Response(
				JSON.stringify({ message: "Invalid affirmation ID" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const [affirmation] = await db
			.select()
			.from(affirmations)
			.where(and(eq(affirmations.id, id), eq(affirmations.approved, 1)));

		if (!affirmation) {
			return new Response(
				JSON.stringify({ message: "Affirmation not found" }),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				},
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
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	});
