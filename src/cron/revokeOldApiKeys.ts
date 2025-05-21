import { sql } from "drizzle-orm";
import cron from "node-cron";
import { db } from "../db";
import { apiKeys } from "../db/schema";

// CONFIGURABLES
const HOURS_BETWEEN_RUNS = 6; // Run every 6 hours
const UNUSED_DAYS_THRESHOLD = 30; // Revoke if not used in 30 days

// The main revoke function
async function revokeOldApiKeys() {
	console.log("[CRON] Checking for old API keys to revoke...");

	// Calculate threshold timestamp (in seconds)
	const now = Math.floor(Date.now() / 1000);
	const thresholdSeconds = now - UNUSED_DAYS_THRESHOLD * 24 * 60 * 60;

	// Find keys not used in threshold, and not already revoked
	const oldKeys = await db
		.select()
		.from(apiKeys)
		.where(
			sql`${apiKeys.revoked} = 0 AND (${apiKeys.lastUsed} IS NULL OR ${apiKeys.lastUsed} < ${thresholdSeconds})`,
		);

	if (oldKeys.length === 0) {
		console.log("[CRON] No old API keys to revoke.");
		return;
	}

	// Revoke them
	const ids = oldKeys.map((k) => k.id);
	await db
		.update(apiKeys)
		.set({ revoked: 1 })
		.where(sql`${apiKeys.id} IN (${ids.join(",")})`);

	console.log(`[CRON] Revoked ${ids.length} API keys:`, ids);
}

// Schedule: every N hours
const cronExpression = `0 */${HOURS_BETWEEN_RUNS} * * *`; // At minute 0 every Nth hour

cron.schedule(cronExpression, revokeOldApiKeys);

revokeOldApiKeys();
