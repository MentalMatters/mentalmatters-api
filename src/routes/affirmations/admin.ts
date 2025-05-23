import { eq, inArray } from "drizzle-orm";
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

const affirmationResponseSchema = t.Object({
	message: t.String(),
	affirmation: t.Optional(
		t.Object({
			id: t.Number(),
			text: t.String(),
			category: t.Optional(t.String()),
			language: t.Optional(t.String()),
		}),
	),
});

export const affirmationsAdminRoute = new Elysia({ prefix: "/admin" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.ADMIN }))

	// Create affirmation
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
					message: "Successfully created affirmation",
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
				summary: "Create a new affirmation",
				operationId: "createAffirmation",
				description: "Creates a new affirmation entry with optional tags.",
			},
		},
	)

	// Update affirmation
	.put(
		"/:id",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id))
				return formatResponse({
					body: { message: "Invalid affirmation ID" },
					status: 400,
				});

			const [existing] = await db
				.select()
				.from(affirmations)
				.where(eq(affirmations.id, id));

			if (!existing)
				return formatResponse({
					body: { message: "Affirmation not found" },
					status: 404,
				});

			const [updated] = await db
				.update(affirmations)
				.set({
					text: body.text ?? existing.text,
					category: body.category ?? existing.category,
					language: body.language ?? existing.language,
					updatedAt: new Date(),
				})
				.where(eq(affirmations.id, id))
				.returning();

			return formatResponse({
				body: {
					message: "Affirmation updated",
					affirmation: {
						id: updated.id,
						text: updated.text,
						category: updated.category,
						language: updated.language,
					},
				},
				status: 200,
			});
		},
		{
			body: updateAffirmationSchema,
			params: idParamSchema,
			detail: {
				tags: ["Affirmations"],
				summary: "Update an existing affirmation",
				operationId: "updateAffirmation",
				description:
					"Updates text, category, or language for an existing affirmation by ID.",
			},
		},
	)

	// Delete affirmation
	.delete(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id))
				return formatResponse({
					body: { message: "Invalid affirmation ID" },
					status: 400,
				});

			const [deleted] = await db
				.delete(affirmations)
				.where(eq(affirmations.id, id))
				.returning();

			if (!deleted)
				return formatResponse({
					body: { message: "Affirmation not found" },
					status: 404,
				});

			return formatResponse({
				body: { message: "Affirmation deleted" },
				status: 200,
			});
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Affirmations"],
				summary: "Delete an affirmation",
				operationId: "deleteAffirmation",
				description: "Deletes an affirmation by its ID.",
			},
		},
	)

	// Approve / unapprove
	.patch(
		"/:id/approve",
		async ({ params, body }) => {
			const id = Number(params.id);
			if (Number.isNaN(id))
				return formatResponse({
					body: { message: "Invalid affirmation ID" },
					status: 400,
				});

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
					body: { message: "Affirmation not found" },
					status: 404,
				});

			return formatResponse({
				body: { message: "Approval status updated" },
				status: 200,
			});
		},
		{
			body: approveAffirmationSchema,
			params: idParamSchema,
			detail: {
				tags: ["Affirmations"],
				summary: "Approve or unapprove an affirmation",
				operationId: "toggleAffirmationApproval",
				description:
					"Sets an affirmation's approval status and optionally updates its approval date.",
			},
		},
	);
