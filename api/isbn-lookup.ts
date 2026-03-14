const normalizeIsbn = (rawValue: string) => rawValue.replace(/[^0-9Xx]/g, '').toUpperCase();

const safeJoin = (values?: Array<string | undefined | null>) =>
  values?.filter(Boolean).join(', ') || '';

const toHttps = (url?: string) => (url ? url.replace('http://', 'https://') : '');

const fetchGoogleBooks = async (isbn: string) => {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY || process.env.VITE_GOOGLE_BOOKS_API_KEY || '';
  if (!apiKey) return null;

  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1&projection=full&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const payload = await response.json();
  const item = payload.items?.[0];
  if (!item?.volumeInfo) return null;

  const volumeInfo = item.volumeInfo;

  return {
    isbn,
    title: volumeInfo.title || '',
    author: safeJoin(volumeInfo.authors),
    authors: volumeInfo.authors || [],
    description: volumeInfo.description || '',
    pageCount: volumeInfo.pageCount || 0,
    genre: volumeInfo.categories?.[0] || '',
    categories: volumeInfo.categories || [],
    coverUrl: toHttps(
      volumeInfo.imageLinks?.thumbnail ||
        volumeInfo.imageLinks?.smallThumbnail ||
        volumeInfo.imageLinks?.small ||
        '',
    ),
    publisher: volumeInfo.publisher || '',
    publishedDate: volumeInfo.publishedDate || '',
    source: 'google-books' as const,
  };
};

const fetchOpenLibrary = async (isbn: string) => {
  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`,
  );
  if (!response.ok) return null;

  const payload = await response.json();
  const book = payload[`ISBN:${isbn}`];
  if (!book) return null;

  const notes =
    typeof book.notes === 'string'
      ? book.notes
      : typeof book.notes?.value === 'string'
        ? book.notes.value
        : '';

  return {
    isbn,
    title: book.title || '',
    author: safeJoin(book.authors?.map((author: { name?: string }) => author.name || '')),
    authors: book.authors?.map((author: { name?: string }) => author.name || '').filter(Boolean) || [],
    description: notes,
    pageCount: book.number_of_pages || 0,
    genre: book.subjects?.[0]?.name || '',
    categories: book.subjects?.map((subject: { name?: string }) => subject.name || '').filter(Boolean) || [],
    coverUrl: toHttps(book.cover?.large || book.cover?.medium || book.cover?.small || ''),
    publisher: safeJoin(book.publishers?.map((publisher: { name?: string }) => publisher.name || '')),
    publishedDate: book.publish_date || '',
    source: 'open-library' as const,
  };
};

const fetchWikipediaSummary = async (title: string) => {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  const attempts = [
    `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(trimmedTitle)}`,
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(trimmedTitle)}`,
  ];

  for (const url of attempts) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'kitap-app/1.0',
      },
    });

    if (!response.ok) continue;

    const payload = await response.json();
    if (typeof payload.extract === 'string' && payload.extract.trim()) {
      return {
        description: payload.extract.trim(),
        source: 'wikipedia' as const,
      };
    }
  }

  return null;
};

const mergeLookupResults = (
  primary: Record<string, any> | null,
  fallback: Record<string, any> | null,
  descriptionFallback: Record<string, any> | null,
  isbn: string,
) => {
  const merged = {
    isbn,
    title: primary?.title || fallback?.title || '',
    author: primary?.author || fallback?.author || '',
    authors: primary?.authors?.length ? primary.authors : fallback?.authors || [],
    description:
      primary?.description || fallback?.description || descriptionFallback?.description || '',
    pageCount: primary?.pageCount || fallback?.pageCount || 0,
    genre: primary?.genre || fallback?.genre || '',
    categories:
      primary?.categories?.length ? primary.categories : fallback?.categories || [],
    coverUrl: primary?.coverUrl || fallback?.coverUrl || '',
    publisher: primary?.publisher || fallback?.publisher || '',
    publishedDate: primary?.publishedDate || fallback?.publishedDate || '',
    source:
      primary && (fallback || descriptionFallback)
        ? 'combined'
        : primary?.source || fallback?.source || descriptionFallback?.source || 'open-library',
  };

  return merged;
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const isbn = normalizeIsbn(String(request.query?.isbn || ''));
  if (isbn.length !== 10 && isbn.length !== 13) {
    response.status(400).json({ error: 'Gecerli bir ISBN-10 veya ISBN-13 gerekli.' });
    return;
  }

  try {
    const googleBook = await fetchGoogleBooks(isbn);
    const openLibraryBook = await fetchOpenLibrary(isbn);
    const wikipediaSummary = await fetchWikipediaSummary(
      googleBook?.title || openLibraryBook?.title || '',
    );

    const merged = mergeLookupResults(googleBook, openLibraryBook, wikipediaSummary, isbn);

    if (!merged.title) {
      response.status(404).json({ error: 'Bu ISBN icin kitap bilgisi bulunamadi.' });
      return;
    }

    response.status(200).json(merged);
  } catch (error) {
    console.error('ISBN lookup failed:', error);
    response.status(500).json({ error: 'ISBN sorgusu sirasinda hata olustu.' });
  }
}
