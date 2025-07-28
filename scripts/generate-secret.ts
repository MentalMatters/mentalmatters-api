#!/usr/bin/env bun

import { randomBytes } from "node:crypto";

/**
 * Utility script to generate a secure random string for ADMIN_CREATION_SECRET
 */

function generateSecureSecret(length = 64): string {
	return randomBytes(length).toString("hex");
}

function main() {
	const secret = generateSecureSecret();

	console.log("🔐 Generated secure secret for ADMIN_CREATION_SECRET:");
	console.log("");
	console.log(secret);
	console.log("");
	console.log("📋 Usage:");
	console.log(`export ADMIN_CREATION_SECRET="${secret}"`);
	console.log("");
	console.log("⚠️  Security notes:");
	console.log("   - Store this secret securely");
	console.log("   - Use different secrets for different environments");
	console.log(
		"   - Keep this secret private and don't commit it to version control",
	);
}

main();
