import { t } from "elysia";
import { ResourceCategory } from "../../db/schema";

export const createResourceSchema = t.Object({
	title: t.String(),
	url: t.String(),
	description: t.Optional(t.String()),
	category: t.Enum(ResourceCategory),
	language: t.String(),
});

export const updateResourceSchema = t.Object({
	title: t.Optional(t.String()),
	url: t.Optional(t.String()),
	description: t.Optional(t.String()),
	category: t.Optional(t.Enum(ResourceCategory)),
	language: t.Optional(t.String()),
});

export const getResourcesSchema = t.Object({
	category: t.Optional(t.Enum(ResourceCategory)),
	language: t.Optional(t.String()),
	page: t.Optional(t.Number()),
	limit: t.Optional(t.Number()),
});
