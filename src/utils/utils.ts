type FormatResponseOptions = {
	body: unknown;
	status?: number;
	headers?: Record<string, string>;
};

export function formatResponse({
	body,
	status = 200,
	headers = {},
}: FormatResponseOptions): Response {
	const defaultHeaders = { "Content-Type": "application/json" };
	const mergedHeaders = { ...defaultHeaders, ...headers };

	const responseBody = typeof body === "string" ? body : JSON.stringify(body);

	return new Response(responseBody, {
		status,
		headers: mergedHeaders,
	});
}
