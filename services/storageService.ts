import { Book } from '../types';

const STORAGE_KEY = 'my_library_books_v1';

export const getBooks = (): Book[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load books", e);
    return [];
  }
};

export const saveBook = (book: Book): void => {
  const books = getBooks();
  const existingIndex = books.findIndex(b => b.id === book.id);
  
  if (existingIndex >= 0) {
    books[existingIndex] = book;
  } else {
    books.unshift(book); // Add to top
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
};

export const deleteBook = (id: string): void => {
  const books = getBooks().filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
};
