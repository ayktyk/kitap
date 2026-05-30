export interface Quote {
  id: string;
  text: string;
  page?: number;
}

export interface ReadingSession {
  id: string;
  startDate?: string;
  endDate?: string;
  currentPage?: number;
  finished?: boolean;
}

export type BookStatus = 'READING' | 'WANT_TO_READ' | 'READ' | 'ABANDONED';
export type BookFilter = BookStatus | 'ALL' | 'FAVORITES';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string; // URL for cover image
  rating: number; // 1-10
  pageCount: number;
  genre?: string;
  status: BookStatus;
  
  // Reading Process
  startDate: string;
  endDate: string;
  startLocation: string;
  endLocation: string;
  
  // Acquisition
  purchaseDate: string;
  purchaseLocation: string; // "D&R, Kadıköy", "Amazon"
  
  // Content
  thoughts: string;
  quotes: Quote[];

  // Progress & organization (P2)
  currentPage?: number;
  tags?: string[];
  sessions?: ReadingSession[];

  isFavorite?: boolean;
  createdAt: number;
}

export type ViewState = 'LIST' | 'ADD' | 'EDIT' | 'DETAILS' | 'STATS';

export interface BookAIResponse {
  description?: string;
  pageCount?: number;
  author?: string;
  genre?: string;
  suggestedQuotes?: string[];
}

export interface BookLookupResult {
  isbn: string;
  title?: string;
  author?: string;
  authors?: string[];
  description?: string;
  pageCount?: number;
  genre?: string;
  categories?: string[];
  coverUrl?: string;
  publisher?: string;
  publishedDate?: string;
  source: 'google-books' | 'open-library' | 'wikipedia' | 'combined';
}
