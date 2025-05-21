import { eq, like } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, tags } from "../../db/schema";
import { tagsAdminRoute } from "./admin";
import { createTagSchema, getTagsSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const tagsRoute = new Elysia({ prefix: "/tags" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	.post(
		"/",
		async ({ body }) => {
			try {
				const [createdTag] = await db
					.insert(tags)
					.values({ name: body.name })
					.onConflictDoNothing({ target: tags.name })
					.returning();

				if (!createdTag) {
					return formatResponse({
						body: { message: "Tag already exists." },
						status: 409,
					});
				}

				return formatResponse({
					body: {
						message: "Tag created",
						tag: createdTag,
					},
					status: 201,
				});
			} catch {
				return formatResponse({
					body: { message: "Failed to create tag." },
					status: 500,
				});
			}
		},
		{ body: createTagSchema },
	)

	.get(
		"/",
		async ({ query }) => {
			const filter = query.name
				? like(tags.name, `%${query.name}%`)
				: undefined;

			const allTags = await db.select().from(tags).where(filter);

			return formatResponse({
				body: { tags: allTags },
				status: 200,
			});
		},
		{ query: getTagsSchema },
	)

	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return formatResponse({
					body: { message: "Invalid tag ID" },
					status: 400,
				});
			}

			const [tag] = await db.select().from(tags).where(eq(tags.id, id));

			if (!tag) {
				return formatResponse({
					body: { message: "Tag not found" },
					status: 404,
				});
			}

			return formatResponse({
				body: { tag },
				status: 200,
			});
		},
		{ params: idParamSchema },
	)
	.use(tagsAdminRoute);
