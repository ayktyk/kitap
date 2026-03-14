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

// Helper to map Book interface to DB row
const mapBookToRow = (book: Book, userId: string): any => ({
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
  cover_url: book.coverUrl,
  is_favorite: book.isFavorite || (book.rating === 10),
});

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

  const row = mapBookToRow(book, user.id);
  
  const { error } = await supabase
    .from('books')
    .upsert(row);

  if (error) {
    console.error('Error saving book:', error);
    throw error;
  }
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

export const uploadCoverImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('book-covers')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('book-covers')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
