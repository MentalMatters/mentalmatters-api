export interface Resource {
	id: number;
	title: string;
	url: string;
	description?: string;
	category: string;
	language: string;
	createdAt: Date;
	tags?: string[];
}

export interface CreateResourceRequest {
	title: string;
	url: string;
	description?: string;
	category: string;
	language: string;
	tags?: string[];
}

export interface UpdateResourceRequest {
	title?: string;
	url?: string;
	description?: string;
	category?: string;
	language?: string;
	tags?: string[];
}

export interface GetResourcesQuery {
	category?: string;
	language?: string;
	tags?: string[];
	page?: number;
	limit?: number;
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface TagOperationRequest {
	tags: string[];
}
