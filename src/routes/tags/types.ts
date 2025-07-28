export interface CreateTagRequest {
	name: string;
}

export interface UpdateTagRequest {
	name?: string;
}

export interface GetTagsRequest {
	name?: string;
	page?: number;
	limit?: number;
}

export interface Tag {
	id: number;
	name: string;
}

export interface TagResponse {
	message: string;
	tag?: Tag;
	tags?: Tag[];
}
