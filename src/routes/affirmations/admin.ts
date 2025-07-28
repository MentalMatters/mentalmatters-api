import { asc, eq, inArray, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import {
	ApiKeyRole,
	affirmations,
	affirmationTags,
	tags,
} from "../../db/schema";
import {
	approveAffirmationSchema,
	createAffirmationSchema,
	updateAffirmationSchema,
} from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const affirmationsAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	// Get pending affirmations
	.get(
		"/pending",
		async ({ query }) => {
			try {
				const page = Math.max(1, query.page || 1);
				const limit = Math.min(100, Math.max(1, query.limit || 10));
				const offset = (page - 1) * limit;

				// Get total count of pending affirmations
				const totalCountQuery = await db
					.select({ count: sql<number>`count(*)` })
					.from(affirmations)
					.where(eq(affirmations.approved, 0));

				const total = totalCountQuery[0]?.count || 0;
				const totalPages = Math.ceil(total / limit);

				const rows = await db
					.select({
						id: affirmations.id,
						text: affirmations.text,
						category: affirmations.category,
						language: affirmations.language,
						createdAt: affirmations.createdAt,
						tag: tags.name,
					})
					.from(affirmations)
					.leftJoin(
						affirmationTags,
						eq(affirmations.id, affirmationTags.affirmationId),
					)
					.leftJoin(tags, eq(affirmationTags.tagId, tags.id))
					.where(eq(affirmations.approved, 0))
					.orderBy(asc(affirmations.createdAt))
					.limit(limit)
					.offset(offset);

				const affirmationsMap = new Map<
					number,
					{
						id: number;
						text: string;
						category: string;
						language: string;
						createdAt: Date | null;
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
							createdAt: row.createdAt,
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
			} catch (error) {
				console.error("Error fetching pending affirmations:", error);
				return formatResponse({
					body: {
						message: "Failed to fetch pending affirmations. Please try again.",
						error: "INTERNAL_ERROR",
					},
					status: 500,
				});
			}
		},
		{
			query: t.Object({
				page: t.Optional(
					t.Number({
						minimum: 1,
						error: "Page must be a positive number",
					}),
				),
				limit: t.Optional(
					t.Number({
						minimum: 1,
						maximum: 100,
						error: "Limit must be between 1 and 100",
					}),
				),
			}),
			detail: {
				tags: ["Affirmations"],
				summary: "Get pending affirmations",
				operationId: "getPendingAffirmations",
				description:
					"Retrieve a list of affirmations that are pending approval. Only accessible by admin users.",
			},
		},
	)

	// Create affirmation
	.post(
		"/",
		async ({ body }) => {
			try {
				const newAffirmationEntity = await db.transaction(async (tx) => {
					const [created] = await tx
						.insert(affirmations)
						.values({
							text: body.text,
							category: body.category,
							language: body.language,
							approved: 1, // Admin-created affirmations are auto-approved
							approvedAt: new Date(),
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
						message: "Successfully created and approved affirmation",
						affirmation: {
							id: newAffirmationEntity.id,
							text: newAffirmationEntity.text,
							category: newAffirmationEntity.category,
							language: newAffirmationEntity.language,
							approved: true,
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
				summary: "Create a new affirmation",
				operationId: "createAffirmation",
				description:
					"Creates a new affirmation entry with optional tags. Admin-created affirmations are automatically approved.",
			},
		},
	)

	// Update affirmation
	.put(
		"/:id",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id) || id <= 0)
				return formatResponse({
					body: {
						message: "Invalid affirmation ID. Must be a positive number.",
						error: "VALIDATION_ERROR",
					},
					status: 400,
				});

			try {
				const [existing] = await db
					.select()
					.from(affirmations)
					.where(eq(affirmations.id, id));

				if (!existing)
					return formatResponse({
						body: {
							message: "Affirmation not found",
							error: "NOT_FOUND",
						},
						status: 404,
					});

				const [updated] = await db.transaction(async (tx) => {
					const [updatedAffirmation] = await tx
						.update(affirmations)
						.set({
							text: body.text ?? existing.text,
							category: body.category ?? existing.category,
							language: body.language ?? existing.language,
							updatedAt: new Date(),
						})
						.where(eq(affirmations.id, id))
						.returning();

					// Handle tag updates if provided
					if (body.tags !== undefined) {
						// Remove existing tags
						await tx
							.delete(affirmationTags)
							.where(eq(affirmationTags.affirmationId, id));

						// Add new tags if provided
						if (body.tags.length > 0) {
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
										affirmationId: id,
										tagId: tag.id,
									})),
								);
							}
						}
					}

					return [updatedAffirmation];
				});

				return formatResponse({
					body: {
						message: "Affirmation updated successfully",
						affirmation: {
							id: updated.id,
							text: updated.text,
							category: updated.category,
							language: updated.language,
						},
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error updating affirmation:", error);
				return formatResponse({
					body: {
						message: "Failed to update affirmation. Please try again.",
						error: "INTERNAL_ERROR",
					},
					status: 500,
				});
			}
		},
		{
			body: updateAffirmationSchema,
			params: idParamSchema,
			detail: {
				tags: ["Affirmations"],
				summary: "Update an existing affirmation",
				operationId: "updateAffirmation",
				description:
					"Updates text, category, language, and tags for an existing affirmation by ID. If tags are provided, existing tags will be replaced with the new ones.",
			},
		},
	)

	// Delete affirmation
	.delete(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id) || id <= 0)
				return formatResponse({
					body: {
						message: "Invalid affirmation ID. Must be a positive number.",
						error: "VALIDATION_ERROR",
					},
					status: 400,
				});

			try {
				const [deleted] = await db
					.delete(affirmations)
					.where(eq(affirmations.id, id))
					.returning();

				if (!deleted)
					return formatResponse({
						body: {
							message: "Affirmation not found",
							error: "NOT_FOUND",
						},
						status: 404,
					});

				return formatResponse({
					body: {
						message: "Affirmation deleted successfully",
						affirmation: {
							id: deleted.id,
							text: deleted.text,
						},
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error deleting affirmation:", error);
				return formatResponse({
					body: {
						message: "Failed to delete affirmation. Please try again.",
						error: "INTERNAL_ERROR",
					},
					status: 500,
				});
			}
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Affirmations"],
				summary: "Delete an affirmation",
				operationId: "deleteAffirmation",
				description:
					"Deletes an affirmation by its ID. This action cannot be undone.",
			},
		},
	)

	// Approve / unapprove
	.patch(
		"/:id/approve",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id) || id <= 0)
				return formatResponse({
					body: {
						message: "Invalid affirmation ID. Must be a positive number.",
						error: "VALIDATION_ERROR",
					},
					status: 400,
				});

			try {
				const approved = body.approved === true ? 1 : 0;

				const [updated] = await db
					.update(affirmations)
					.set({
						approved,
						approvedAt: approved ? new Date() : null,
						updatedAt: new Date(),
					})
					.where(eq(affirmations.id, id))
					.returning();

				if (!updated)
					return formatResponse({
						body: {
							message: "Affirmation not found",
							error: "NOT_FOUND",
						},
						status: 404,
					});

				const message = approved
					? "Affirmation approved successfully"
					: "Affirmation unapproved successfully";

				return formatResponse({
					body: {
						message,
						affirmation: {
							id: updated.id,
							text: updated.text,
							approved: approved === 1,
						},
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error updating approval status:", error);
				return formatResponse({
					body: {
						message: "Failed to update approval status. Please try again.",
						error: "INTERNAL_ERROR",
					},
					status: 500,
				});
			}
		},
		{
			body: approveAffirmationSchema,
			params: idParamSchema,
			detail: {
				tags: ["Affirmations"],
				summary: "Approve or unapprove an affirmation",
				operationId: "toggleAffirmationApproval",
				description:
					"Sets an affirmation's approval status and updates its approval date. Only approved affirmations are visible to regular users.",
			},
		},
	);
