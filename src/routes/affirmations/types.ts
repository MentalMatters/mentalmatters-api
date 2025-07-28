import type { AffirmationCategory } from "../../db/schema";

export interface CreateAffirmationBody {
	text: string;
	category: AffirmationCategory;
	language: string;
	tags?: string[];
}

export interface UpdateAffirmationBody extends Partial<CreateAffirmationBody> {
	id: number;
}

export interface GetAffirmationsQuery {
	category?: AffirmationCategory;
	language?: string;
	tags?: string[];
	page?: number;
	limit?: number;
}

export interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface AffirmationResponse {
	id: number;
	text: string;
	category: string;
	language: string;
	tags: string[];
	createdAt?: Date | null;
	approved?: boolean;
}

export interface AffirmationsListResponse {
	affirmations: AffirmationResponse[];
	pagination: PaginationInfo;
}

export interface ErrorResponse {
	message: string;
	error: "VALIDATION_ERROR" | "NOT_FOUND" | "NOT_APPROVED" | "INTERNAL_ERROR";
}

export interface SuccessResponse {
	message: string;
	affirmation?: Partial<AffirmationResponse>;
}
