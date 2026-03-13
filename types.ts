export interface Quote {
  id: string;
  text: string;
  page?: number;
}

export type BookStatus = 'READING' | 'WANT_TO_READ' | 'READ' | 'ABANDONED';

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
  
  createdAt: number;
}

export type ViewState = 'LIST' | 'ADD' | 'EDIT' | 'DETAILS';

export interface BookAIResponse {
  description?: string;
  pageCount?: number;
  author?: string;
  genre?: string;
  suggestedQuotes?: string[];
}
