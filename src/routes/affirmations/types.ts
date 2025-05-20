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
