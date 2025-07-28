import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { apiKeyPlugin } from "@/plugins/apiKey";
import { formatResponse } from "@/utils";
import { db } from "../../db";
import { ApiKeyRole, tags } from "../../db/schema";
import { tagsAdminRoute } from "./admin";
import { getTagsSchema } from "./schema";
import { getTagsWithPagination, validateTagId } from "./utils";

const idParamSchema = t.Object({ id: t.String() });

export const tagsRoute = new Elysia({ prefix: "/tags" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	.get(
		"/",
		async ({ query }) => {
			try {
				const page = query.page || 1;
				const limit = query.limit || 20;
				const filter = query.name;

				const result = await getTagsWithPagination(filter, page, limit);

				return formatResponse({
					body: {
						tags: result.tags,
						pagination: result.pagination,
					},
					status: 200,
				});
			} catch (error) {
				console.error("Error fetching tags:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			query: getTagsSchema,
			detail: {
				tags: ["Tags"],
				summary: "Get all tags",
				operationId: "getAllTags",
				description:
					"Retrieve a list of all tags with optional filtering by name and pagination",
			},
		},
	)

	.get(
		"/:id",
		async ({ params }) => {
			try {
				const { isValid, numericId } = validateTagId(params.id);
				if (!isValid || !numericId) {
					return formatResponse({
						body: { message: "Invalid tag ID" },
						status: 400,
					});
				}

				const [tag] = await db
					.select()
					.from(tags)
					.where(eq(tags.id, numericId));

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
			} catch (error) {
				console.error("Error fetching tag:", error);
				return formatResponse({
					body: { message: "Internal server error" },
					status: 500,
				});
			}
		},
		{
			params: idParamSchema,
			detail: {
				tags: ["Tags"],
				summary: "Get a tag by ID",
				operationId: "getTagById",
				description: "Retrieve a specific tag by its unique identifier",
			},
		},
	)
	.use(tagsAdminRoute);
