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

// Input validation utilities
export function validateString(
	value: unknown,
	fieldName: string,
	maxLength = 1000,
): string {
	if (typeof value !== "string") {
		throw new Error(`${fieldName} must be a string`);
	}
	if (value.trim().length === 0) {
		throw new Error(`${fieldName} cannot be empty`);
	}
	if (value.length > maxLength) {
		throw new Error(`${fieldName} must be less than ${maxLength} characters`);
	}
	return value.trim();
}

export function validateOptionalString(
	value: unknown,
	fieldName: string,
	maxLength = 1000,
): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	return validateString(value, fieldName, maxLength);
}

export function validateNumber(
	value: unknown,
	fieldName: string,
	min = 0,
	max = Number.MAX_SAFE_INTEGER,
): number {
	if (typeof value !== "number" || Number.isNaN(value)) {
		throw new Error(`${fieldName} must be a valid number`);
	}
	if (value < min || value > max) {
		throw new Error(`${fieldName} must be between ${min} and ${max}`);
	}
	return value;
}

export function validateOptionalNumber(
	value: unknown,
	fieldName: string,
	min = 0,
	max = Number.MAX_SAFE_INTEGER,
): number | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	return validateNumber(value, fieldName, min, max);
}

export function validateEnum<T extends string>(
	value: unknown,
	fieldName: string,
	allowedValues: readonly T[],
): T {
	if (typeof value !== "string") {
		throw new Error(`${fieldName} must be a string`);
	}
	if (!allowedValues.includes(value as T)) {
		throw new Error(`${fieldName} must be one of: ${allowedValues.join(", ")}`);
	}
	return value as T;
}

export function validateOptionalEnum<T extends string>(
	value: unknown,
	fieldName: string,
	allowedValues: readonly T[],
): T | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	return validateEnum(value, fieldName, allowedValues);
}

export function validateArray<T>(
	value: unknown,
	fieldName: string,
	validator: (item: unknown) => T,
): T[] {
	if (!Array.isArray(value)) {
		throw new Error(`${fieldName} must be an array`);
	}
	return value.map((item, index) => {
		try {
			return validator(item);
		} catch (error) {
			throw new Error(
				`${fieldName}[${index}]: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	});
}

export function validateOptionalArray<T>(
	value: unknown,
	fieldName: string,
	validator: (item: unknown) => T,
): T[] | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	return validateArray(value, fieldName, validator);
}

// URL validation
export function validateUrl(value: unknown, fieldName: string): string {
	const url = validateString(value, fieldName);
	try {
		new URL(url);
		return url;
	} catch {
		throw new Error(`${fieldName} must be a valid URL`);
	}
}

// Email validation (basic)
export function validateEmail(value: unknown, fieldName: string): string {
	const email = validateString(value, fieldName);
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		throw new Error(`${fieldName} must be a valid email address`);
	}
	return email;
}

// Pagination validation
export function validatePagination(page?: unknown, limit?: unknown) {
	const validatedPage = validateOptionalNumber(page, "page", 1) ?? 1;
	const validatedLimit = validateOptionalNumber(limit, "limit", 1, 100) ?? 20;

	return {
		page: validatedPage,
		limit: validatedLimit,
		offset: (validatedPage - 1) * validatedLimit,
	};
}
