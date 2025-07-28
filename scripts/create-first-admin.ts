#!/usr/bin/env bun

import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../src/db";
import { ApiKeyRole, apiKeys } from "../src/db/schema";

/**
 * Secure script to create the first admin API key
 * This script can only be run on the server and requires specific environment variables
 */

async function createFirstAdminKey() {
	try {
		// Check if we're in a production-like environment
		const nodeEnv = process.env.NODE_ENV;
		if (nodeEnv === "development" && !process.env.FORCE_CREATE_ADMIN) {
			console.error("❌ This script is designed for production use only.");
			console.error(
				"   Set FORCE_CREATE_ADMIN=true to override in development.",
			);
			process.exit(1);
		}

		// Check for required environment variable
		const adminSecret = process.env.ADMIN_CREATION_SECRET;
		if (!adminSecret) {
			console.error(
				"❌ ADMIN_CREATION_SECRET environment variable is required.",
			);
			console.error(
				"   Set this to a secure random string to enable admin key creation.",
			);
			process.exit(1);
		}

		// Check if any admin API keys already exist
		const existingAdmins = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.role, ApiKeyRole.ADMIN));

		if (existingAdmins.length > 0) {
			console.error("❌ Admin API keys already exist in the database.");
			console.error(`   Found ${existingAdmins.length} admin key(s).`);
			console.error("   This script can only create the FIRST admin key.");
			process.exit(1);
		}

		// Generate a new admin API key
		const newKey = uuid();
		const label = process.env.ADMIN_KEY_LABEL || "Initial Admin Key";

		console.log("🔐 Creating first admin API key...");

		const [created] = await db
			.insert(apiKeys)
			.values({
				key: newKey,
				label,
				role: ApiKeyRole.ADMIN,
				revoked: 0,
			})
			.returning();

		if (!created) {
			console.error("❌ Failed to create admin API key.");
			process.exit(1);
		}

		console.log("✅ First admin API key created successfully!");
		console.log("");
		console.log("📋 API Key Details:");
		console.log(`   ID: ${created.id}`);
		console.log(`   Key: ${created.key}`);
		console.log(`   Label: ${created.label}`);
		console.log(`   Role: ${created.role}`);
		console.log(`   Created: ${created.createdAt}`);
		console.log("");
		console.log("⚠️  IMPORTANT SECURITY NOTES:");
		console.log(
			"   1. Store this API key securely - it cannot be retrieved again",
		);
		console.log("   2. Use this key to access admin endpoints");
		console.log(
			"   3. Consider creating additional admin keys for team members",
		);
		console.log(
			"   4. This script will not work again once an admin key exists",
		);
		console.log("");
		console.log("🔗 Admin endpoints available at:");
		console.log("   - POST /api-keys/admin (create new keys)");
		console.log("   - GET /api-keys/admin (list all keys)");
		console.log("   - PATCH /api-keys/admin/:id (update keys)");
		console.log("   - DELETE /api-keys/admin/:id (delete keys)");
	} catch (error) {
		console.error("❌ Error creating admin API key:", error);
		process.exit(1);
	}
}

// Run the script
createFirstAdminKey();
