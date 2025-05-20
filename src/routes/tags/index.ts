import { eq, like } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { db } from "../../db";
import { ApiKeyRole, tags } from "../../db/schema";
import { tagsAdminRoute } from "./admin";
import { createTagSchema, getTagsSchema } from "./schema";

const idParamSchema = t.Object({ id: t.String() });

export const tagsRoute = new Elysia({ prefix: "/tags" })
	// Anyone with a USER key can create & read
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	// Create tag
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
					return new Response(
						JSON.stringify({ message: "Tag already exists." }),
						{ status: 409, headers: { "Content-Type": "application/json" } },
					);
				}

				return new Response(
					JSON.stringify({
						message: "Tag created",
						tag: createdTag,
					}),
					{ status: 201, headers: { "Content-Type": "application/json" } },
				);
			} catch {
				return new Response(
					JSON.stringify({ message: "Failed to create tag." }),
					{ status: 500, headers: { "Content-Type": "application/json" } },
				);
			}
		},
		{ body: createTagSchema },
	)

	// Get all tags (optional filter)
	.get(
		"/",
		async ({ query }) => {
			const filter = query.name
				? like(tags.name, `%${query.name}%`)
				: undefined;

			const allTags = await db.select().from(tags).where(filter);

			return new Response(JSON.stringify({ tags: allTags }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ query: getTagsSchema },
	)

	// Get tag by ID
	.get(
		"/:id",
		async ({ params }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				return new Response(JSON.stringify({ message: "Invalid tag ID" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const [tag] = await db.select().from(tags).where(eq(tags.id, id));

			if (!tag) {
				return new Response(JSON.stringify({ message: "Tag not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify({ tag }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
		{ params: idParamSchema },
	)
	.use(tagsAdminRoute);
