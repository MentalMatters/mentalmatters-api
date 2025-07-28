import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { quotes } from "../../db/schema";

// Database types
export type Quote = InferSelectModel<typeof quotes>;
export type NewQuote = InferInsertModel<typeof quotes>;

// API response types
export interface QuotesResponse {
	quotes: Quote[];
	pagination: {
		page: number;
		limit: number;
		totalCount: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

export interface QuoteResponse {
	quote: Quote;
}

export interface MessageResponse {
	message: string;
}

export interface CreateQuoteResponse extends MessageResponse {
	quote: Quote;
}

export interface UpdateQuoteResponse extends MessageResponse {
	quote: Quote;
}

// Query parameter types
export interface GetQuotesQuery {
	category?: string;
	language?: string;
	author?: string;
	page?: number;
	limit?: number;
}

// Request body types
export interface CreateQuoteBody {
	quoteText: string;
	author?: string;
	category?: string;
	language: string;
}

export interface UpdateQuoteBody {
	quoteText?: string;
	author?: string;
	category?: string;
	language?: string;
}
