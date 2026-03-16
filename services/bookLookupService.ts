import { BookLookupResult } from '../types';

const normalizeIsbn = (rawValue: string) => rawValue.replace(/[^0-9Xx]/g, '').toUpperCase();

export const lookupBookByIsbn = async (rawValue: string): Promise<BookLookupResult> => {
  const isbn = normalizeIsbn(rawValue);

  if (isbn.length !== 10 && isbn.length !== 13) {
    throw new Error('Lutfen gecerli bir ISBN-10 veya ISBN-13 gir.');
  }

  const response = await fetch(`/api/isbn-lookup?isbn=${encodeURIComponent(isbn)}`);

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error || 'ISBN bilgisi alınamadı.');
  }

  return response.json();
};
