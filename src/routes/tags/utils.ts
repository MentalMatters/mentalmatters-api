import { eq, like, sql } from "drizzle-orm";
import { db } from "../../db";
import { tags } from "../../db/schema";

/**
 * Sanitize input string by trimming whitespace and removing extra spaces
 */
export function sanitizeString(input: string | undefined): string | undefined {
	if (!input) return input;
	return input.trim().replace(/\s+/g, " ");
}

/**
 * Validate tag ID format
 */
export function validateTagId(id: string): {
	isValid: boolean;
	numericId?: number;
} {
	const numericId = Number(id);
	const isValid = !Number.isNaN(numericId) && numericId > 0;
	return { isValid, numericId: isValid ? numericId : undefined };
}

/**
 * Check if tag name already exists
 */
export async function checkTagNameExists(
	name: string,
	excludeId?: number,
): Promise<boolean> {
	const sanitizedName = sanitizeString(name);
	if (!sanitizedName) return false;

	const query = excludeId
		? db
				.select()
				.from(tags)
				.where(
					sql`${tags.name} = ${sanitizedName} AND ${tags.id} != ${excludeId}`,
				)
		: db.select().from(tags).where(eq(tags.name, sanitizedName));

	const existing = await query;
	return existing.length > 0;
}

/**
 * Get tags with pagination and filtering
 */
export async function getTagsWithPagination(
	filter?: string,
	page = 1,
	limit = 20,
) {
	const offset = (page - 1) * limit;
	const whereClause = filter ? like(tags.name, `%${filter}%`) : undefined;

	const [tagsData, totalCount] = await Promise.all([
		db
			.select()
			.from(tags)
			.where(whereClause)
			.limit(limit)
			.offset(offset)
			.orderBy(tags.name),
		db
			.select({ count: sql<number>`count(*)` })
			.from(tags)
			.where(whereClause)
			.then((result) => result[0]?.count || 0),
	]);

	return {
		tags: tagsData,
		pagination: {
			page,
			limit,
			total: totalCount,
			totalPages: Math.ceil(totalCount / limit),
		},
	};
}
