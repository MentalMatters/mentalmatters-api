import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Affirmation categories
export enum AffirmationCategory {
	SelfEsteem = "self-esteem",
	Anxiety = "anxiety",
	Motivation = "motivation",
	Gratitude = "gratitude",
	Mindfulness = "mindfulness",
}

export const affirmationCategories = [
	"self-esteem",
	"anxiety",
	"motivation",
	"gratitude",
	"mindfulness",
] as const;

// Resource categories
export enum ResourceCategory {
	Hotline = "hotline",
	Article = "article",
	App = "app",
	Video = "video",
	Website = "website",
	Book = "book",
}

export const resourceCategories = [
	"hotline",
	"article",
	"app",
	"video",
	"website",
	"book",
] as const;

// Languages
export const languages = sqliteTable("languages", {
	code: text("code").primaryKey(), // e.g., 'en', 'es'
	name: text("name").notNull(),
});

// kept as table below
export const tags = sqliteTable("tags", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull().unique(),
});

// Affirmations
export enum AffirmationApproval {
	Pending = 0,
	Approved = 1,
}

export const affirmations = sqliteTable("affirmations", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	text: text("text").notNull().unique(),
	category: text("category", { enum: affirmationCategories }).notNull(),
	language: text("language")
		.notNull()
		.references(() => languages.code, { onDelete: "restrict" }),
	approved: integer("approved").notNull().default(sql`0`), // 0 = false, 1 = true
	approvedAt: integer("approved_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(strftime('%s', 'now'))`,
	),
	updatedAt: integer("updated_at", { mode: "timestamp" }).default(
		sql`(strftime('%s', 'now'))`,
	),
});

// Resources
export const resources = sqliteTable("resources", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	title: text("title").notNull(),
	url: text("url").notNull(),
	description: text("description"),
	category: text("category", { enum: resourceCategories }).notNull(),
	language: text("language")
		.notNull()
		.references(() => languages.code, { onDelete: "restrict" }),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`CURRENT_TIMESTAMP`,
	),
});

// Affirmation <-> Tag many-to-many
export const affirmationTags = sqliteTable("affirmation_tags", {
	affirmationId: integer("affirmation_id")
		.notNull()
		.references(() => affirmations.id, { onDelete: "cascade" }),
	tagId: integer("tag_id")
		.notNull()
		.references(() => tags.id, { onDelete: "cascade" }),
});

// Resource <-> Tag many-to-many
export const resourceTags = sqliteTable("resource_tags", {
	resourceId: integer("resource_id")
		.notNull()
		.references(() => resources.id, { onDelete: "cascade" }),
	tagId: integer("tag_id")
		.notNull()
		.references(() => tags.id, { onDelete: "cascade" }),
});

// Moods
export const moods = sqliteTable("moods", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull().unique(), // e.g., "happy", "anxious"
	description: text("description"), // Optional: a short description of the mood
	emoji: text("emoji"), // Optional: emoji representation, e.g., "😊"
	language: text("language")
		.notNull()
		.references(() => languages.code, { onDelete: "restrict" }),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(strftime('%s', 'now'))`,
	),
	updatedAt: integer("updated_at", { mode: "timestamp" }).default(
		sql`(strftime('%s', 'now'))`,
	),
});

// Quotes
export const quotes = sqliteTable("quotes", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	quoteText: text("quote_text").notNull().unique(),
	author: text("author"), // Optional: who said/wrote the quote
	category: text("category"), // Optional: e.g., "hope", "resilience"
	language: text("language")
		.notNull()
		.references(() => languages.code, { onDelete: "restrict" }),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(strftime('%s', 'now'))`,
	),
	updatedAt: integer("updated_at", { mode: "timestamp" }).default(
		sql`(strftime('%s', 'now'))`,
	),
});

export enum ApiKeyRole {
	USER = "USER",
	ADMIN = "ADMIN",
}

export const apiKeys = sqliteTable("api_keys", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	key: text("key").notNull().unique(),
	label: text("label"),
	role: text("role", { enum: [ApiKeyRole.USER, ApiKeyRole.ADMIN] })
		.notNull()
		.default(ApiKeyRole.USER),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(strftime('%s', 'now'))`,
	),
	revoked: integer("revoked").notNull().default(0),
	lastUsed: integer("last_used", { mode: "timestamp" }).default(
		sql`(strftime('%s', 'now'))`,
	),
});
