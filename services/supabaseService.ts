import { supabase } from '../lib/supabase';
import { Book, Quote } from '../types';

// Helper to map DB row to Book interface
const mapRowToBook = (row: any): Book => ({
  id: row.id,
  title: row.title,
  author: row.author,
  status: row.status,
  genre: row.genre || '',
  rating: row.rating || 0,
  pageCount: row.page_count || 0,
  startDate: row.start_date || '',
  endDate: row.end_date || '',
  startLocation: row.start_location || '',
  endLocation: row.end_location || '',
  purchaseDate: row.purchase_date || '',
  purchaseLocation: row.purchase_location || '',
  thoughts: row.thoughts || '',
  quotes: (row.quotes as Quote[]) || [],
  coverUrl: row.cover_url || '',
  isFavorite: row.is_favorite || false,
  createdAt: new Date(row.created_at).getTime(),
});

const mapBookToRow = (
  book: Book,
  userId: string,
  options?: {
    includeCoverUrl?: boolean;
    includeIsFavorite?: boolean;
  },
): Record<string, unknown> => {
  const row: Record<string, unknown> = {
    id: book.id,
    user_id: userId,
    title: book.title,
    author: book.author,
    status: book.status,
    genre: book.genre,
    rating: book.rating,
    page_count: book.pageCount,
    start_date: book.startDate || null,
    end_date: book.endDate || null,
    start_location: book.startLocation,
    end_location: book.endLocation,
    purchase_date: book.purchaseDate || null,
    purchase_location: book.purchaseLocation,
    thoughts: book.thoughts,
    quotes: book.quotes,
  };

  if (options?.includeCoverUrl !== false) {
    row.cover_url = book.coverUrl || '';
  }

  if (options?.includeIsFavorite !== false) {
    row.is_favorite = book.isFavorite || book.rating === 10;
  }

  return row;
};

const isMissingColumnError = (error: { message?: string } | null, columnName: string) => {
  const message = error?.message?.toLowerCase() || '';
  return message.includes(columnName.toLowerCase()) && message.includes('column');
};

export const getBooks = async (): Promise<Book[]> => {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching books:', error);
    return [];
  }

  return data.map(mapRowToBook);
};

export const saveBook = async (book: Book): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('User not authenticated');

  const fullRow = mapBookToRow(book, user.id);
  
  const { error } = await supabase
    .from('books')
    .upsert(fullRow);

  if (!error) {
    return;
  }

  const shouldRetryWithoutCoverUrl = isMissingColumnError(error, 'cover_url');
  const shouldRetryWithoutIsFavorite = isMissingColumnError(error, 'is_favorite');

  if (shouldRetryWithoutCoverUrl || shouldRetryWithoutIsFavorite) {
    const fallbackRow = mapBookToRow(book, user.id, {
      includeCoverUrl: !shouldRetryWithoutCoverUrl,
      includeIsFavorite: !shouldRetryWithoutIsFavorite,
    });

    const { error: fallbackError } = await supabase
      .from('books')
      .upsert(fallbackRow);

    if (!fallbackError) {
      return;
    }

    console.error('Error saving book after fallback:', fallbackError);
    throw fallbackError;
  }

  console.error('Error saving book:', error);
  throw error;
};

export const deleteBook = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
};

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  exportedBy: string;
  bookCount: number;
  books: Book[];
}

export const exportBooks = async (userEmail: string): Promise<ExportBundle> => {
  const books = await getBooks();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: userEmail,
    bookCount: books.length,
    books,
  };
};

export interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface ImportOptions {
  conflictMode: 'skip' | 'overwrite' | 'duplicate';
}

export const importBooks = async (
  bundle: ExportBundle,
  options: ImportOptions = { conflictMode: 'skip' },
): Promise<ImportSummary> => {
  if (!bundle || bundle.version !== 1 || !Array.isArray(bundle.books)) {
    throw new Error('Geçersiz yedek dosyası. Lütfen doğru bir kitaplık yedeği yükleyin.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Önce giriş yapmanız gerekir.');

  const existingBooks = await getBooks();
  const existingIds = new Set(existingBooks.map((b) => b.id));
  const existingTitleAuthor = new Set(
    existingBooks.map((b) => `${b.title.trim().toLowerCase()}|${b.author.trim().toLowerCase()}`),
  );

  const summary: ImportSummary = {
    total: bundle.books.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const incoming of bundle.books) {
    try {
      const titleAuthorKey = `${(incoming.title || '').trim().toLowerCase()}|${(incoming.author || '').trim().toLowerCase()}`;
      const idConflict = existingIds.has(incoming.id);
      const contentConflict = titleAuthorKey !== '|' && existingTitleAuthor.has(titleAuthorKey);

      if ((idConflict || contentConflict) && options.conflictMode === 'skip') {
        summary.skipped += 1;
        continue;
      }

      let bookToSave: Book = { ...incoming };

      if (options.conflictMode === 'duplicate' || idConflict) {
        bookToSave = {
          ...bookToSave,
          id: crypto.randomUUID(),
          quotes: (bookToSave.quotes || []).map((q) => ({ ...q, id: crypto.randomUUID() })),
        };
      }

      await saveBook(bookToSave);
      summary.imported += 1;
      existingIds.add(bookToSave.id);
      existingTitleAuthor.add(titleAuthorKey);
    } catch (err) {
      summary.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push(`${incoming.title || 'Bilinmeyen kitap'}: ${message}`);
    }
  }

  return summary;
};

export const uploadCoverImage = async (file: File): Promise<string> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    throw new Error('User not authenticated');
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('book-covers')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('book-covers')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
