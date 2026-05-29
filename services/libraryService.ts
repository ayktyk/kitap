import { z } from 'zod';
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
const AUTO_BACKUP_KEY = 'kitaplik:auto-backups';
const MAX_AUTO_BACKUPS = 3;
// İçe aktarılan kapak base64'ü için üst sınır (~9MB çözülmüş) — kötü niyetli/bozuk
// yedekte ana iş parçacığını dondurmamak için (DoS koruması).
const MAX_COVER_BASE64 = 12_000_000;
// İçe aktarmada coverUrl için izinli şemalar (CSS url() enjeksiyonuna karşı).
const SAFE_COVER_URL = /^(local:|https?:\/\/|blob:)/i;

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

// Bir kapağın bellekteki blob URL'sini serbest bırakır ve cache'ten siler.
// Kapak değiştiğinde/silindiğinde çağrılır — bellek sızıntısını önler.
function revokeCover(id: string): void {
  const url = blobUrlByCoverId.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    blobUrlByCoverId.delete(id);
    coverIdByBlobUrl.delete(url);
  }
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

  const orphanedCoverId = await tx(
    [BOOKS_STORE, COVERS_STORE],
    'readwrite',
    async (transaction) => {
      const booksStore = transaction.objectStore(BOOKS_STORE);
      const prev = (await reqToPromise(booksStore.get(toStore.id))) as Book | undefined;

      // Kapak değiştiyse eski kapağı temizle (yetim blob kaydı + bellek sızıntısı).
      let orphan: string | null = null;
      if (prev && isLocalCoverRef(prev.coverUrl)) {
        const prevId = localRefToId(prev.coverUrl);
        const newId = isLocalCoverRef(toStore.coverUrl) ? localRefToId(toStore.coverUrl) : null;
        if (prevId !== newId) {
          transaction.objectStore(COVERS_STORE).delete(prevId);
          orphan = prevId;
        }
      }

      booksStore.put(toStore);
      return orphan;
    },
  );

  if (orphanedCoverId) revokeCover(orphanedCoverId);
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
      revokeCover(coverId);
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

// Uzak (http/https) kapağı transaction DIŞINDA indirir; çağıran, dönen blob'u
// tek bir atomik yazma transaction'ında saklar. İndirilemezse null döner
// (çağıran orijinal http(s) URL'sini korur).
async function stageRemoteCover(
  remoteUrl: string,
): Promise<{ id: string; blob: Blob; mimeType: string } | null> {
  try {
    const response = await fetch(remoteUrl, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return { id: uuid(), blob, mimeType: blob.type };
  } catch (error) {
    console.warn('Uzak kapak indirilemedi:', remoteUrl, error);
    return null;
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // 32KB; String.fromCharCode argüman limitini aşmamak için
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Blob -> base64 (data URL ön eki olmadan). FileReader yerine arrayBuffer()
// kullanıyoruz: hem tarayıcıda hem test ortamında (jsdom/node) realm bağımsız
// çalışır ve FileReader'ın blob brand-check sorununu ortadan kaldırır.
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
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
  // Otomatik yedek almayı atla (yedekten geri yükleme sırasında özyinelemeyi önler).
  skipAutoBackup?: boolean;
}

const looseBookSchema = z.object({});
const coverEntrySchema = z.object({
  id: z.string(),
  data: z.string(),
  mimeType: z.string().optional(),
});

// Yapısal doğrulama şeması. Bilinmeyen/yeni alanlar varsayılan olarak elenir
// (validation yine geçer), bu yüzden gelecek sürümlerin ek alanları kontrolü kırmaz.
const bundleSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  books: z.array(looseBookSchema),
  covers: z.array(coverEntrySchema).optional(),
});

// Yapısal doğrulama. Geçersizse anlamlı bir hata fırlatır (proje strict mod
// kullanmadığından discriminated-union daraltmasına güvenmiyoruz).
function assertValidBundle(value: unknown): void {
  const result = bundleSchema.safeParse(value);
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || '(kök)'}: ${issue.message}`)
      .join('; ');
    throw new Error(
      `Geçersiz yedek dosyası (${detail || 'bilinmeyen yapı hatası'}). ` +
        'Lütfen doğru bir kitaplık yedeği yükleyin.',
    );
  }
}

export const isValidBundle = (value: unknown): value is AnyExportBundle =>
  bundleSchema.safeParse(value).success;

// Başlık+yazar tekilleştirme anahtarı; string olmayan alanlara karşı güvenli.
function titleAuthorKey(title: unknown, author: unknown): string {
  const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();
  return `${norm(title)}|${norm(author)}`;
}

// ----- Otomatik yedek (içe aktarma öncesi güvenlik ağı) -----
// Kapaklar hariç tutulur (localStorage kotasını aşmamak için). Kapaklar IDB'de
// kalır; içe aktarma mevcut kapakları silmediği için yedekten geri yükleme onları korur.
export interface AutoBackupEntry {
  createdAt: string;
  bookCount: number;
  books: Book[];
}

export const listAutoBackups = (): AutoBackupEntry[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AutoBackupEntry[]) : [];
  } catch {
    return [];
  }
};

export const createAutoBackup = async (): Promise<AutoBackupEntry | null> => {
  if (typeof localStorage === 'undefined') return null;
  try {
    await ensureInitialized();
    const books = await tx(
      BOOKS_STORE,
      'readonly',
      async (transaction) =>
        (await reqToPromise(transaction.objectStore(BOOKS_STORE).getAll())) as Book[],
    );
    const entry: AutoBackupEntry = {
      createdAt: new Date().toISOString(),
      bookCount: books.length,
      books,
    };
    const next = [entry, ...listAutoBackups()].slice(0, MAX_AUTO_BACKUPS);
    localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(next));
    return entry;
  } catch (error) {
    // Yedek alınamazsa içe aktarmayı engelleme — yalnızca uyar.
    console.warn('Otomatik yedek oluşturulamadı:', error);
    return null;
  }
};

export interface ImportPreview {
  total: number;
  newCount: number;
  conflictCount: number;
}

// İçe aktarmadan önce kullanıcıya gösterilecek önizleme: kaç yeni, kaç çakışma.
export const previewImport = async (bundle: AnyExportBundle): Promise<ImportPreview> => {
  assertValidBundle(bundle);
  await ensureInitialized();

  const existing = await getBooks();
  const existingKeys = new Set<string>();
  for (const book of existing) {
    const key = titleAuthorKey(book.title, book.author);
    if (key !== '|') existingKeys.add(key);
  }

  let conflictCount = 0;
  for (const book of bundle.books) {
    const key = titleAuthorKey(book.title, book.author);
    if (key !== '|' && existingKeys.has(key)) conflictCount += 1;
  }

  return {
    total: bundle.books.length,
    conflictCount,
    newCount: bundle.books.length - conflictCount,
  };
};

export const importBooks = async (
  bundle: AnyExportBundle,
  options: ImportOptions = { conflictMode: 'skip' },
): Promise<ImportSummary> => {
  assertValidBundle(bundle);

  await ensureInitialized();

  // İçe aktarmadan ÖNCE mevcut kütüphanenin otomatik yedeğini al (veri kaybına karşı).
  if (!options.skipAutoBackup) {
    await createAutoBackup();
  }

  const existingBooks = await getBooks();
  const existingByTitleAuthor = new Map<string, Book>();
  for (const book of existingBooks) {
    const key = titleAuthorKey(book.title, book.author);
    if (key !== '|') existingByTitleAuthor.set(key, book);
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

  // 1) HAZIRLIK — tüm async iş (base64 decode + uzak kapak fetch) transaction
  //    DIŞINDA yapılır; yazılacak kitap ve kapak listeleri toplanır.
  const coverBlobsById = new Map<string, { blob: Blob; mimeType: string }>();
  const importedCoverMap = new Map<string, string>();
  if (bundle.version === 2 && Array.isArray(bundle.covers)) {
    for (const cover of bundle.covers) {
      try {
        if (typeof cover.data !== 'string' || cover.data.length > MAX_COVER_BASE64) {
          console.warn('Kapak çok büyük veya geçersiz, atlanıyor:', cover.id);
          continue;
        }
        const blob = base64ToBlob(cover.data, cover.mimeType || 'image/jpeg');
        const newId = uuid();
        coverBlobsById.set(newId, { blob, mimeType: cover.mimeType || blob.type });
        importedCoverMap.set(cover.id, newId);
      } catch (error) {
        console.warn('Kapak içe aktarılamadı:', cover.id, error);
      }
    }
  }

  const booksToWrite: Book[] = [];
  for (const incoming of bundle.books) {
    try {
      const incomingKey = titleAuthorKey(incoming.title, incoming.author);
      const existingMatch = incomingKey !== '|' ? existingByTitleAuthor.get(incomingKey) : undefined;

      if (existingMatch && options.conflictMode === 'skip') {
        summary.skipped += 1;
        continue;
      }

      const newId =
        existingMatch && options.conflictMode === 'overwrite' ? existingMatch.id : uuid();

      let coverUrl = incoming.coverUrl || '';
      if (isLocalCoverRef(coverUrl)) {
        const oldId = localRefToId(coverUrl);
        const mappedId = importedCoverMap.get(oldId);
        coverUrl = mappedId ? `${LOCAL_PREFIX}${mappedId}` : '';
      } else if (coverUrl && /^https?:\/\//i.test(coverUrl)) {
        const staged = await stageRemoteCover(coverUrl);
        if (staged) {
          coverBlobsById.set(staged.id, { blob: staged.blob, mimeType: staged.mimeType });
          coverUrl = `${LOCAL_PREFIX}${staged.id}`;
        }
        // İndirilemezse coverUrl orijinal http(s) olarak kalır (güvenli şema).
      } else if (coverUrl && !SAFE_COVER_URL.test(coverUrl)) {
        // Beklenmeyen şema (ör. CSS url() enjeksiyonu) — güvenli tarafta kal, at.
        coverUrl = '';
      }

      const bookToSave: Book = {
        ...incoming,
        id: newId,
        coverUrl,
        isFavorite: incoming.isFavorite || incoming.rating === 10,
        quotes: (incoming.quotes || []).map((q) => ({ ...q, id: uuid() })),
      };
      booksToWrite.push(bookToSave);
      existingByTitleAuthor.set(incomingKey, bookToSave);
    } catch (err) {
      summary.failed += 1;
      summary.errors.push(`${incoming.title || 'Bilinmeyen kitap'}: ${extractErrorMessage(err)}`);
    }
  }

  // 2) YAZMA — tek readwrite transaction: ya hep ya hiç. Hata olursa tx abort
  //    edilir, hiçbir kısmi değişiklik kalmaz (kütüphane bozulmaz).
  if (booksToWrite.length > 0 || coverBlobsById.size > 0) {
    const orphanCoverIds = await tx(
      [BOOKS_STORE, COVERS_STORE],
      'readwrite',
      async (transaction) => {
        const coversStore = transaction.objectStore(COVERS_STORE);
        const booksStore = transaction.objectStore(BOOKS_STORE);

        // Yalnızca bir kitabın referans verdiği kapakları yaz — atlanan/başarısız
        // kitapların kapakları yetim kayıt olarak kalmasın (IDB şişmesi önlenir).
        const referenced = new Set<string>();
        for (const book of booksToWrite) {
          if (isLocalCoverRef(book.coverUrl)) referenced.add(localRefToId(book.coverUrl));
        }
        for (const [id, record] of coverBlobsById) {
          if (referenced.has(id)) {
            coversStore.put({ id, blob: record.blob, mimeType: record.mimeType } as CoverRecord);
          }
        }

        const orphans: string[] = [];
        for (const book of booksToWrite) {
          // Üzerine-yazmada eski kapak yetim kalıyorsa temizle.
          const prev = (await reqToPromise(booksStore.get(book.id))) as Book | undefined;
          if (prev && isLocalCoverRef(prev.coverUrl)) {
            const prevId = localRefToId(prev.coverUrl);
            const newId = isLocalCoverRef(book.coverUrl) ? localRefToId(book.coverUrl) : null;
            if (prevId !== newId) {
              coversStore.delete(prevId);
              orphans.push(prevId);
            }
          }
          booksStore.put(book);
        }
        return orphans;
      },
    );

    for (const id of orphanCoverIds) revokeCover(id);
  }

  summary.imported = booksToWrite.length;
  return summary;
};

// Bir otomatik yedek girdisini geri yükler (içe aktarma sonrası kurtarma için).
// Üzerine-yaz modu kullanır ve yeniden yedek almaz.
export const restoreAutoBackup = async (entry: AutoBackupEntry): Promise<ImportSummary> => {
  return importBooks(
    {
      version: 2,
      exportedAt: entry.createdAt,
      bookCount: entry.bookCount,
      books: entry.books,
      covers: [],
    },
    { conflictMode: 'overwrite', skipAutoBackup: true },
  );
};
