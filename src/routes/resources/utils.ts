import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { resources, resourceTags, tags } from "../../db/schema";

/**
 * Sanitize input string by trimming whitespace and removing extra spaces
 */
export function sanitizeString(input: string | undefined): string | undefined {
	if (!input) return input;
	return input.trim().replace(/\s+/g, " ");
}

/**
 * Validate if a resource with the given URL already exists
 */
export async function checkResourceUrlExists(
	url: string,
	excludeId?: number,
): Promise<boolean> {
	const conditions = [eq(resources.url, url)];

	if (excludeId) {
		conditions.push(ne(resources.id, excludeId));
	}

	const [existing] = await db
		.select()
		.from(resources)
		.where(and(...conditions));

	return !!existing;
}

/**
 * Validate resource ID format
 */
export function validateResourceId(id: string): {
	isValid: boolean;
	numericId?: number;
} {
	const numericId = Number(id);
	const isValid = !Number.isNaN(numericId) && numericId > 0;
	return { isValid, numericId: isValid ? numericId : undefined };
}

/**
 * Format pagination parameters with defaults and limits
 */
export function formatPaginationParams(page?: number, limit?: number) {
	const validPage = Math.max(1, page || 1);
	const validLimit = Math.min(100, Math.max(1, limit || 10));
	const offset = (validPage - 1) * validLimit;

	return {
		page: validPage,
		limit: validLimit,
		offset,
	};
}

/**
 * Get or create tags by names
 */
export async function getOrCreateTags(tagNames: string[]): Promise<number[]> {
	if (tagNames.length === 0) return [];

	const tagIds: number[] = [];

	for (const tagName of tagNames) {
		const sanitizedName = sanitizeString(tagName);

		if (!sanitizedName) {
			continue; // Skip empty or undefined tag names
		}

		// Try to find existing tag
		let [existingTag] = await db
			.select()
			.from(tags)
			.where(eq(tags.name, sanitizedName));

		// Create tag if it doesn't exist
		if (!existingTag) {
			[existingTag] = await db
				.insert(tags)
				.values({ name: sanitizedName })
				.returning();
		}

		tagIds.push(existingTag.id);
	}

	return tagIds;
}

/**
 * Get resource IDs filtered by tags
 */
export async function getResourceIdsByTags(
	tagNames: string[],
): Promise<number[]> {
	if (tagNames.length === 0) return [];

	const tagFilterQuery = await db
		.select({ resourceId: resourceTags.resourceId })
		.from(resourceTags)
		.innerJoin(tags, eq(resourceTags.tagId, tags.id))
		.where(inArray(tags.name, tagNames))
		.groupBy(resourceTags.resourceId)
		.having(sql`COUNT(DISTINCT ${tags.name}) = ${tagNames.length}`);

	return tagFilterQuery.map((row) => row.resourceId);
}

/**
 * Get tags for a resource
 */
export async function getResourceTags(resourceId: number): Promise<string[]> {
	const resourceTagsQuery = await db
		.select({ name: tags.name })
		.from(resourceTags)
		.innerJoin(tags, eq(resourceTags.tagId, tags.id))
		.where(eq(resourceTags.resourceId, resourceId));

	return resourceTagsQuery.map((row) => row.name);
}
