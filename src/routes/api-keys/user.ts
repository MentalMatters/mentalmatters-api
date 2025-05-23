import Elysia from "elysia";
import { ApiKeyRole } from "@/db/schema";
import { apiKeyPlugin } from "@/plugins/apiKey";

export const apiKeyMeRoute = new Elysia({ prefix: "/me" })
	.use(apiKeyPlugin({ requiredRole: ApiKeyRole.USER }))

	.get(
		"/",
		async ({ apiKey }) => {
			return new Response(
				JSON.stringify({
					message: "API key retrieved",
					apiKey: {
						key: apiKey.key,
						label: apiKey.label,
						role: apiKey.role,
						createdAt: apiKey.createdAt,
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		},
		{
			detail: {
				tags: ["API Keys"],
				summary: "Get current API key",
				operationId: "getCurrentApiKey",
				description:
					"Retrieves information about the API key used for the current request",
			},
		},
	);
