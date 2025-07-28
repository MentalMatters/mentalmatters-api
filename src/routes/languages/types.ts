export interface Language {
	code: string;
	name: string;
}

export interface CreateLanguageRequest {
	code: string;
	name: string;
}

export interface UpdateLanguageRequest {
	name?: string;
}

export interface GetLanguagesQuery {
	code?: string;
	name?: string;
	page?: number;
	limit?: number;
}

export interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface LanguagesResponse {
	languages: Language[];
	pagination: PaginationInfo;
}

export interface LanguageResponse {
	language: Language;
}
