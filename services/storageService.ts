import { Book } from '../types';

const STORAGE_KEY = 'my_library_books_v1';

export const getBooks = (): Book[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const books: Book[] = stored ? JSON.parse(stored) : [];
    
    // Migration: Ensure all books have a status and genre
    let migrated = false;
    const updatedBooks = books.map(book => {
      if (!book.status || !book.genre) {
        migrated = true;
        return {
          ...book,
          status: book.status || 'READ',
          genre: book.genre || ''
        };
      }
      return book;
    });

    if (migrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBooks));
    }

    return updatedBooks;
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
