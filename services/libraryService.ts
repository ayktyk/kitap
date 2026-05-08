import { Book } from '../types';

// Local-first kitaplık servisi.
// Kitaplar IndexedDB'de "books" store'unda saklanır.
// Kapaklar Blob olarak "covers" store'unda saklanır; book.coverUrl içinde
// "local:<uuid>" referansı tutulur, okuma sırasında çalışan blob URL'sine
// dönüştürülür.

const DB_NAME = 'kitapligim';
const DB_VERSION = 1;
const BOOKS_STORE = 'books';
const COVERS_STORE = 'covers';
const LEGACY_LOCALSTORAGE_KEY = 'my_library_books_v1';
const LEGACY_FLAG_KEY = 'my_library_localstorage_migrated_v1';

const LOCAL_PREFIX = 'local:';

interface CoverRecord {
  id: string;
  blob: Blob;
  mimeType: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;
const blobUrlByCoverId = new Map<string, string>();
const coverIdByBlobUrl = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(COVERS_STORE)) {
        db.createObjectStore(COVERS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeNames, mode);
        let bodyResult: T;
        let bodySettled = false;
        let bodyError: unknown = null;
        let txDone = false;
        let finalized = false;

        const finalize = () => {
          if (finalized) return;
          if (!bodySettled || !txDone) return;
          finalized = true;
          if (bodyError) reject(bodyError);
          else resolve(bodyResult);
        };

        Promise.resolve(body(transaction))
          .then((value) => {
            bodyResult = value;
            bodySettled = true;
            finalize();
          })
          .catch((error) => {
            bodyError = error;
            bodySettled = true;
            try {
              transaction.abort();
            } catch {
              /* zaten kapanmış olabilir */
            }
            finalize();
          });

        transaction.oncomplete = () => {
          txDone = true;
          finalize();
        };
        transaction.onabort = () => {
          if (finalized) return;
          finalized = true;
          reject(bodyError || transaction.error || new Error('Transaction aborted'));
        };
        transaction.onerror = () => {
          if (finalized) return;
          finalized = true;
          reject(transaction.error || bodyError || new Error('Transaction error'));
        };
      }),
  );
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function isLocalCoverRef(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.startsWith(LOCAL_PREFIX);
}

function localRefToId(ref: string): string {
  return ref.slice(LOCAL_PREFIX.length);
}

function blobUrlForCover(id: string, blob: Blob): string {
  const cached = blobUrlByCoverId.get(id);
  if (cached) return cached;
  const url = URL.createObjectURL(blob);
  blobUrlByCoverId.set(id, url);
  coverIdByBlobUrl.set(url, id);
  return url;
}

async function readCoverBlob(store: IDBObjectStore, id: string): Promise<Blob | null> {
  const record = (await reqToPromise(store.get(id))) as CoverRecord | undefined;
  return record?.blob ?? null;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Basit fallback
  return 'cv-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function migrateLegacyLocalStorageOnce(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(LEGACY_FLAG_KEY)) return;

  const raw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
  if (!raw) {
    localStorage.setItem(LEGACY_FLAG_KEY, '1');
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Book[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      await tx(BOOKS_STORE, 'readwrite', (transaction) => {
        const store = transaction.objectStore(BOOKS_STORE);
        for (const legacy of parsed) {
          const safeBook: Book = {
            ...legacy,
            status: legacy.status || 'READ',
            genre: legacy.genre || '',
            quotes: Array.isArray(legacy.quotes) ? legacy.quotes : [],
            createdAt: legacy.createdAt || Date.now(),
          };
          store.put(safeBook);
        }
      });
    }
  } catch (error) {
    console.warn('Eski localStorage verisi okunamadı:', error);
  } finally {
    localStorage.setItem(LEGACY_FLAG_KEY, '1');
  }
}

let initPromise: Promise<void> | null = null;
function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await openDb();
      await migrateLegacyLocalStorageOnce();
    })();
  }
  return initPromise;
}

async function resolveCoverUrl(
  store: IDBObjectStore,
  storedCoverUrl: string | undefined,
): Promise<string> {
  if (!storedCoverUrl) return '';
  if (!isLocalCoverRef(storedCoverUrl)) return storedCoverUrl;

  const id = localRefToId(storedCoverUrl);
  const cached = blobUrlByCoverId.get(id);
  if (cached) return cached;

  const blob = await readCoverBlob(store, id);
  if (!blob) return '';
  return blobUrlForCover(id, blob);
}

export const getBooks = async (): Promise<Book[]> => {
  await ensureInitialized();

  // Transaction içinde sadece DB oku — kitaplar + ihtiyaç duyulan kapak blob'ları.
  const { books, blobs } = await tx(
    [BOOKS_STORE, COVERS_STORE],
    'readonly',
    async (transaction) => {
      const booksStore = transaction.objectStore(BOOKS_STORE);
      const coversStore = transaction.objectStore(COVERS_STORE);
      const allBooks = (await reqToPromise(booksStore.getAll())) as Book[];

      const neededIds = new Set<string>();
      for (const book of allBooks) {
        if (isLocalCoverRef(book.coverUrl)) {
          neededIds.add(localRefToId(book.coverUrl!));
        }
      }

      const blobMap = new Map<string, Blob>();
      for (const id of neededIds) {
        if (blobUrlByCoverId.has(id)) continue; // zaten cache'de URL üretilmiş
        const record = (await reqToPromise(coversStore.get(id))) as CoverRecord | undefined;
        if (record) blobMap.set(id, record.blob);
      }

      return { books: allBooks, blobs: blobMap };
    },
  );

  // Transaction dışında URL.createObjectURL — sync ama yine de güvenli tarafta kalalım.
  const resolved: Book[] = books.map((stored) => {
    let coverUrl = '';
    if (stored.coverUrl) {
      if (isLocalCoverRef(stored.coverUrl)) {
        const id = localRefToId(stored.coverUrl);
        const cached = blobUrlByCoverId.get(id);
        if (cached) {
          coverUrl = cached;
        } else {
          const blob = blobs.get(id);
          if (blob) coverUrl = blobUrlForCover(id, blob);
        }
      } else {
        coverUrl = stored.coverUrl;
      }
    }
    return { ...stored, coverUrl };
  });

  resolved.sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
  return resolved;
};

export const saveBook = async (book: Book): Promise<void> => {
  await ensureInitialized();

  // form blob URL döndürdüyse, kalıcı referansa çevir
  let storableCoverUrl = book.coverUrl || '';
  if (storableCoverUrl.startsWith('blob:')) {
    const coverId = coverIdByBlobUrl.get(storableCoverUrl);
    if (coverId) {
      storableCoverUrl = `${LOCAL_PREFIX}${coverId}`;
    } else {
      // Bilinmeyen blob URL — güvenli tarafta kalıp boşalt
      storableCoverUrl = '';
    }
  }

  const toStore: Book = {
    ...book,
    coverUrl: storableCoverUrl,
    isFavorite: book.isFavorite || book.rating === 10,
    quotes: Array.isArray(book.quotes) ? book.quotes : [],
  };

  await tx(BOOKS_STORE, 'readwrite', (transaction) => {
    transaction.objectStore(BOOKS_STORE).put(toStore);
  });
};

export const deleteBook = async (id: string): Promise<void> => {
  await ensureInitialized();

  await tx([BOOKS_STORE, COVERS_STORE], 'readwrite', async (transaction) => {
    const booksStore = transaction.objectStore(BOOKS_STORE);
    const coversStore = transaction.objectStore(COVERS_STORE);
    const existing = (await reqToPromise(booksStore.get(id))) as Book | undefined;
    if (existing && isLocalCoverRef(existing.coverUrl)) {
      const coverId = localRefToId(existing.coverUrl!);
      coversStore.delete(coverId);
      const cachedUrl = blobUrlByCoverId.get(coverId);
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
        blobUrlByCoverId.delete(coverId);
        coverIdByBlobUrl.delete(cachedUrl);
      }
    }
    booksStore.delete(id);
  });
};

export const saveCoverImage = async (file: Blob): Promise<string> => {
  await ensureInitialized();

  const id = uuid();
  const mimeType = (file as File).type || 'application/octet-stream';
  const record: CoverRecord = { id, blob: file, mimeType };

  await tx(COVERS_STORE, 'readwrite', (transaction) => {
    transaction.objectStore(COVERS_STORE).put(record);
  });

  return blobUrlForCover(id, file);
};

// Eski Supabase URL'sini ya da diğer http(s) URL'lerini kalıcı yerel kapağa
// dönüştürür. CORS engellenirse orijinal URL'yi geri döndürür.
async function localizeRemoteCover(remoteUrl: string): Promise<string> {
  try {
    const response = await fetch(remoteUrl, { mode: 'cors' });
    if (!response.ok) return remoteUrl;
    const blob = await response.blob();
    const id = uuid();
    await tx(COVERS_STORE, 'readwrite', (transaction) => {
      transaction.objectStore(COVERS_STORE).put({ id, blob, mimeType: blob.type } as CoverRecord);
    });
    return `${LOCAL_PREFIX}${id}`;
  } catch (error) {
    console.warn('Uzak kapak indirilemedi, orijinal URL korunuyor:', remoteUrl, error);
    return remoteUrl;
  }
}

// ----- Export / Import -----

export interface ExportCoverEntry {
  id: string;
  mimeType: string;
  // base64 (without data URL prefix) — dosya boyutunu küçültmek için
  data: string;
}

export interface ExportBundle {
  version: 2;
  exportedAt: string;
  exportedBy?: string;
  bookCount: number;
  books: Book[];
  covers: ExportCoverEntry[];
}

// Eski Supabase formatı (v1) ile geriye uyumluluk
export interface LegacyExportBundleV1 {
  version: 1;
  exportedAt: string;
  exportedBy?: string;
  bookCount: number;
  books: Book[];
}

export type AnyExportBundle = ExportBundle | LegacyExportBundleV1;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader sonucu string değil'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(data: string, mimeType: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}

export const exportBooks = async (exportedBy?: string): Promise<ExportBundle> => {
  await ensureInitialized();

  // 1) Transaction içinde sadece IndexedDB işleri: kitaplar ve cover blobları topla.
  //    Async base64 dönüşümü transaction içinde yapılırsa IndexedDB transaction'ı
  //    auto-commit edip "inactive" duruma geçer, takılır. O yüzden burada SADECE
  //    DB okuyoruz, sonra dışarı çıkıyoruz.
  const collected = await tx([BOOKS_STORE, COVERS_STORE], 'readonly', async (transaction) => {
    const booksStore = transaction.objectStore(BOOKS_STORE);
    const coversStore = transaction.objectStore(COVERS_STORE);
    const books = (await reqToPromise(booksStore.getAll())) as Book[];

    const referencedIds = new Set<string>();
    for (const book of books) {
      if (isLocalCoverRef(book.coverUrl)) {
        referencedIds.add(localRefToId(book.coverUrl!));
      }
    }

    const blobs: { id: string; blob: Blob; mimeType: string }[] = [];
    for (const id of referencedIds) {
      const record = (await reqToPromise(coversStore.get(id))) as CoverRecord | undefined;
      if (!record) continue;
      blobs.push({
        id,
        blob: record.blob,
        mimeType: record.mimeType || record.blob.type,
      });
    }

    return { books, blobs };
  });

  // 2) Transaction kapandıktan sonra base64 dönüşümlerini yap.
  const covers: ExportCoverEntry[] = [];
  for (const item of collected.blobs) {
    try {
      const data = await blobToBase64(item.blob);
      covers.push({ id: item.id, mimeType: item.mimeType, data });
    } catch (error) {
      console.warn('Kapak base64\'e çevrilemedi, atlanıyor:', item.id, error);
    }
  }

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    exportedBy,
    bookCount: collected.books.length,
    books: collected.books,
    covers,
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

const isExportBundle = (value: unknown): value is AnyExportBundle => {
  if (!value || typeof value !== 'object') return false;
  const v = value as { version?: unknown; books?: unknown };
  return (v.version === 1 || v.version === 2) && Array.isArray(v.books);
};

export const isValidBundle = (value: unknown): value is AnyExportBundle => isExportBundle(value);

export const importBooks = async (
  bundle: AnyExportBundle,
  options: ImportOptions = { conflictMode: 'skip' },
): Promise<ImportSummary> => {
  if (!isExportBundle(bundle)) {
    throw new Error('Geçersiz yedek dosyası. Lütfen doğru bir kitaplık yedeği yükleyin.');
  }

  await ensureInitialized();

  const existingBooks = await getBooks();
  const existingByTitleAuthor = new Map<string, Book>();
  for (const book of existingBooks) {
    const key = `${book.title.trim().toLowerCase()}|${book.author.trim().toLowerCase()}`;
    if (key !== '|') existingByTitleAuthor.set(key, book);
  }

  // İçeri aktarılan kapakları önce yerel store'a yaz, eski id -> yeni id eşlemesi tut
  const importedCoverMap = new Map<string, string>();
  if (bundle.version === 2 && Array.isArray(bundle.covers)) {
    await tx(COVERS_STORE, 'readwrite', (transaction) => {
      const store = transaction.objectStore(COVERS_STORE);
      for (const cover of bundle.covers) {
        try {
          const blob = base64ToBlob(cover.data, cover.mimeType || 'image/jpeg');
          const newId = uuid();
          store.put({ id: newId, blob, mimeType: cover.mimeType || blob.type } as CoverRecord);
          importedCoverMap.set(cover.id, newId);
        } catch (error) {
          console.warn('Kapak içe aktarılamadı:', cover.id, error);
        }
      }
    });
  }

  const summary: ImportSummary = {
    total: bundle.books.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const extractErrorMessage = (err: unknown): string => {
    if (!err) return 'Bilinmeyen hata';
    if (err instanceof Error) return err.message;
    return String(err);
  };

  for (const incoming of bundle.books) {
    try {
      const titleAuthorKey = `${(incoming.title || '').trim().toLowerCase()}|${(incoming.author || '').trim().toLowerCase()}`;
      const existingMatch = titleAuthorKey !== '|' ? existingByTitleAuthor.get(titleAuthorKey) : undefined;

      if (existingMatch && options.conflictMode === 'skip') {
        summary.skipped += 1;
        continue;
      }

      const newId =
        existingMatch && options.conflictMode === 'overwrite'
          ? existingMatch.id
          : uuid();

      // CoverUrl normalleştirme
      let coverUrl = incoming.coverUrl || '';
      if (isLocalCoverRef(coverUrl)) {
        const oldId = localRefToId(coverUrl);
        const newCoverId = importedCoverMap.get(oldId);
        coverUrl = newCoverId ? `${LOCAL_PREFIX}${newCoverId}` : '';
      } else if (coverUrl && /^https?:\/\//i.test(coverUrl)) {
        // Eski Supabase / dış URL — yerelleştirmeyi dene
        coverUrl = await localizeRemoteCover(coverUrl);
      }

      const bookToSave: Book = {
        ...incoming,
        id: newId,
        coverUrl,
        quotes: (incoming.quotes || []).map((q) => ({
          ...q,
          id: uuid(),
        })),
      };

      await saveBook(bookToSave);
      summary.imported += 1;
      existingByTitleAuthor.set(titleAuthorKey, bookToSave);
    } catch (err) {
      summary.failed += 1;
      summary.errors.push(`${incoming.title || 'Bilinmeyen kitap'}: ${extractErrorMessage(err)}`);
    }
  }

  return summary;
};
