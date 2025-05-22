/**
 * Represents an entry that can be skipped, either as a literal string or a regular expression.
 */
type SkipEntry = string | RegExp;

/**
 * Creates a matcher function for a single skip entry.
 *
 * @param entry - The skip entry (string or RegExp).
 * @returns A function that takes a path string and returns true if the path matches the entry, false otherwise.
 */
export const createSkipEntryMatcher = (
	entry: SkipEntry,
): ((path: string) => boolean) => {
	if (entry instanceof RegExp) {
		// If the entry is already a RegExp, use its test method directly.
		return (path: string) => entry.test(path);
	}

	// If the entry is a string, convert it to a RegExp.
	// Escape special characters, then replace wildcard '*' with '.*'.
	const pattern = entry
		.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&") // Escape RegExp special chars
		.replace(/\*/g, ".*"); // Convert wildcard '*' to '.*'

	const regex = new RegExp(`^${pattern}$`);
	return (path: string) => regex.test(path);
};

/**
 * Builds a composite matcher function that checks if a path matches any of the provided skip entries.
 *
 * @param skipEntries - An array of skip entries (strings or RegExp objects). Defaults to an empty array.
 * @returns A function that takes a path string and returns true if the path matches any skip entry, false otherwise.
 */
export function buildSkipMatcher(
	skipEntries: SkipEntry[] = [],
): (path: string) => boolean {
	if (skipEntries.length === 0) {
		// Optimization: if there are no skip entries, no path will ever match.
		return () => false;
	}

	const matchers = skipEntries.map(createSkipEntryMatcher);

	return (path: string) => {
		// Check if any of the individual matchers return true for the given path.
		for (const matcher of matchers) {
			if (matcher(path)) {
				return true;
			}
		}
		return false;
	};
}
