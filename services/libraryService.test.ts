// @vitest-environment node
// The data layer needs no DOM. node's global Blob has arrayBuffer(), and
// btoa/atob/Response/crypto are all present — avoiding jsdom's Blob realm
// friction with fake-indexeddb. localStorage is absent here, which
// libraryService already guards against.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import type { Book } from '../types';
import type { ExportBundle } from './libraryService';

// Fresh, isolated IndexedDB + fresh module singletons for every test.
type Svc = typeof import('./libraryService');
let svc: Svc;

beforeEach(async () => {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  if (typeof localStorage !== 'undefined') localStorage.clear();
  vi.resetModules();
  vi.unstubAllGlobals();
  svc = await import('./libraryService');
});

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    title: 'Test Kitap',
    author: 'Test Yazar',
    rating: 8,
    pageCount: 200,
    genre: 'Roman',
    status: 'READ',
    startDate: '',
    endDate: '',
    startLocation: '',
    endLocation: '',
    purchaseDate: '',
    purchaseLocation: '',
    thoughts: '',
    quotes: [],
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('libraryService — CRUD', () => {
  it('saveBook + getBooks round-trips a book', async () => {
    await svc.saveBook(makeBook({ id: 'b1', title: 'Tutunamayanlar', author: 'Oğuz Atay' }));
    const books = await svc.getBooks();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Tutunamayanlar');
    expect(books[0].author).toBe('Oğuz Atay');
  });

  it('deleteBook removes a book and its cover', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
    const coverUrl = await svc.saveCoverImage(blob);
    await svc.saveBook(makeBook({ id: 'b1', coverUrl }));
    await svc.deleteBook('b1');
    expect(await svc.getBooks()).toHaveLength(0);
  });
});

describe('libraryService — export/import round-trip', () => {
  it('exports books + covers and restores them on a wiped library (base64 survives)', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4, 5, 6])], { type: 'image/png' });
    const coverUrl = await svc.saveCoverImage(blob);
    await svc.saveBook(
      makeBook({ id: 'b1', title: 'Kürk Mantolu Madonna', author: 'Sabahattin Ali', coverUrl }),
    );

    const bundle = await svc.exportBooks('tester');
    expect(bundle.version).toBe(2);
    expect(bundle.bookCount).toBe(1);
    expect(bundle.covers).toHaveLength(1);
    expect(bundle.covers[0].data.length).toBeGreaterThan(0);

    // Wipe the library.
    for (const b of await svc.getBooks()) await svc.deleteBook(b.id);
    expect(await svc.getBooks()).toHaveLength(0);

    // Re-import.
    const summary = await svc.importBooks(bundle, { conflictMode: 'duplicate' });
    expect(summary.imported).toBe(1);
    expect(summary.failed).toBe(0);

    const restored = await svc.getBooks();
    expect(restored).toHaveLength(1);
    expect(restored[0].title).toBe('Kürk Mantolu Madonna');
    // Cover restored from base64 and resolved to a runtime object URL.
    expect(restored[0].coverUrl).toMatch(/^blob:/);
  });
});

describe('libraryService — conflict modes', () => {
  it('skip: keeps existing, imports nothing', async () => {
    await svc.saveBook(makeBook({ id: 'b1', title: 'T', author: 'A' }));
    const bundle = await svc.exportBooks();
    const summary = await svc.importBooks(bundle, { conflictMode: 'skip' });
    expect(summary.skipped).toBe(1);
    expect(summary.imported).toBe(0);
    expect(await svc.getBooks()).toHaveLength(1);
  });

  it('overwrite: replaces the matching book in place (count unchanged)', async () => {
    await svc.saveBook(makeBook({ id: 'b1', title: 'T', author: 'A', thoughts: 'orijinal' }));
    const bundle = await svc.exportBooks();
    bundle.books[0].thoughts = 'güncellendi';
    const summary = await svc.importBooks(bundle, { conflictMode: 'overwrite' });
    expect(summary.imported).toBe(1);
    const books = await svc.getBooks();
    expect(books).toHaveLength(1);
    expect(books[0].thoughts).toBe('güncellendi');
  });

  it('duplicate: imports as a new book (count grows)', async () => {
    await svc.saveBook(makeBook({ id: 'b1', title: 'T', author: 'A' }));
    const bundle = await svc.exportBooks();
    const summary = await svc.importBooks(bundle, { conflictMode: 'duplicate' });
    expect(summary.imported).toBe(1);
    expect(await svc.getBooks()).toHaveLength(2);
  });
});

describe('libraryService — remote cover localization on import', () => {
  it('fetches an http(s) cover and stores it locally', async () => {
    const png = new Blob([new Uint8Array([9, 9, 9, 9])], { type: 'image/png' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(png, { status: 200 })),
    );

    const bundle: ExportBundle = {
      version: 2,
      exportedAt: new Date().toISOString(),
      bookCount: 1,
      books: [
        makeBook({ id: 'r1', title: 'Remote', author: 'X', coverUrl: 'https://example.com/c.png' }),
      ],
      covers: [],
    };

    const summary = await svc.importBooks(bundle, { conflictMode: 'duplicate' });
    expect(summary.imported).toBe(1);
    const books = await svc.getBooks();
    expect(books[0].coverUrl).toMatch(/^blob:/);
  });
});

describe('libraryService — bundle validation (zod)', () => {
  it('rejects structurally invalid bundles', async () => {
    await expect(
      svc.importBooks({ version: 3, books: [] } as never, { conflictMode: 'skip' }),
    ).rejects.toThrow();
    await expect(
      svc.importBooks({ version: 2, books: 'nope' } as never, { conflictMode: 'skip' }),
    ).rejects.toThrow();
    // v2 cover missing required `data`
    await expect(
      svc.importBooks({ version: 2, books: [{}], covers: [{ id: 'x' }] } as never, {
        conflictMode: 'skip',
      }),
    ).rejects.toThrow();
  });

  it('accepts bundles carrying unknown/future fields', async () => {
    const bundle = {
      version: 2 as const,
      exportedAt: new Date().toISOString(),
      bookCount: 1,
      futureTopLevel: 'ok',
      books: [{ ...makeBook({ id: 'b1', title: 'T', author: 'A' }), futureField: 123 }],
      covers: [],
    };
    const summary = await svc.importBooks(bundle as never, { conflictMode: 'duplicate' });
    expect(summary.imported).toBe(1);
  });
});

describe('libraryService — cover lifecycle (leak fix)', () => {
  it('deletes the orphaned cover record when a book cover is replaced', async () => {
    const url1 = await svc.saveCoverImage(new Blob([new Uint8Array([1, 1, 1])], { type: 'image/png' }));
    await svc.saveBook(makeBook({ id: 'b1', coverUrl: url1 }));
    expect(await countCovers()).toBe(1);

    const url2 = await svc.saveCoverImage(new Blob([new Uint8Array([2, 2, 2, 2])], { type: 'image/png' }));
    await svc.saveBook(makeBook({ id: 'b1', coverUrl: url2 }));

    // Old cover must be gone — exactly one cover remains.
    expect(await countCovers()).toBe(1);
  });
});

describe('libraryService — import sanitization & limits', () => {
  it('round-trips a larger cover through base64 chunking', async () => {
    const big = new Uint8Array(120_000); // 32KB chunk döngüsünü zorlar
    for (let i = 0; i < big.length; i += 1) big[i] = i % 256;
    const coverUrl = await svc.saveCoverImage(new Blob([big], { type: 'image/png' }));
    await svc.saveBook(makeBook({ id: 'big', title: 'Büyük Kapak', author: 'Z', coverUrl }));

    const bundle = await svc.exportBooks();
    expect(bundle.covers).toHaveLength(1);
    expect(bundle.covers[0].data.length).toBeGreaterThan(100_000);

    for (const b of await svc.getBooks()) await svc.deleteBook(b.id);
    const summary = await svc.importBooks(bundle, { conflictMode: 'duplicate' });
    expect(summary.imported).toBe(1);
    expect(summary.failed).toBe(0);
  });

  it('does not persist covers for skipped books (no orphan cover records)', async () => {
    await svc.saveBook(makeBook({ id: 'b1', title: 'Var', author: 'A' }));
    const before = await countCovers();
    const bundle = {
      version: 2 as const,
      exportedAt: new Date().toISOString(),
      bookCount: 1,
      books: [makeBook({ id: 'x', title: 'Var', author: 'A', coverUrl: 'local:c1' })],
      covers: [{ id: 'c1', mimeType: 'image/png', data: btoa('imgdata') }],
    };
    const summary = await svc.importBooks(bundle, { conflictMode: 'skip' });
    expect(summary.skipped).toBe(1);
    expect(summary.imported).toBe(0);
    expect(await countCovers()).toBe(before);
  });

  it('drops unexpected coverUrl schemes on import (no CSS url() injection)', async () => {
    const bundle = {
      version: 2 as const,
      exportedAt: new Date().toISOString(),
      bookCount: 1,
      books: [makeBook({ id: 'x', title: 'Evil', author: 'E', coverUrl: 'foo) ; background: red' })],
      covers: [],
    };
    await svc.importBooks(bundle, { conflictMode: 'duplicate' });
    const books = await svc.getBooks();
    expect(books[0].coverUrl).toBe('');
  });
});

describe('libraryService — Turkish-locale dedup', () => {
  it('treats İ/ı correctly (İSTANBUL == istanbul) so they dedup', async () => {
    await svc.saveBook(makeBook({ id: 'b1', title: 'İSTANBUL', author: 'X' }));
    const bundle = {
      version: 2 as const,
      exportedAt: new Date().toISOString(),
      bookCount: 1,
      books: [makeBook({ id: 'b2', title: 'istanbul', author: 'x' })],
      covers: [],
    };
    const summary = await svc.importBooks(bundle, { conflictMode: 'skip' });
    expect(summary.skipped).toBe(1);
    expect(await svc.getBooks()).toHaveLength(1);
  });
});

describe('libraryService — import preview', () => {
  it('counts new vs conflicting books', async () => {
    await svc.saveBook(makeBook({ id: 'b1', title: 'Var Olan', author: 'A' }));
    const bundle = {
      version: 2 as const,
      exportedAt: new Date().toISOString(),
      bookCount: 2,
      books: [
        makeBook({ id: 'x1', title: 'Var Olan', author: 'A' }),
        makeBook({ id: 'x2', title: 'Yeni Kitap', author: 'B' }),
      ],
      covers: [],
    };
    const preview = await svc.previewImport(bundle);
    expect(preview.total).toBe(2);
    expect(preview.conflictCount).toBe(1);
    expect(preview.newCount).toBe(1);
  });
});

describe('libraryService — reading sessions on import', () => {
  it('regenerates session ids on import (like quotes)', async () => {
    const bundle = {
      version: 2 as const,
      exportedAt: new Date().toISOString(),
      bookCount: 1,
      books: [
        makeBook({
          id: 'b1',
          title: 'Oturumlu',
          author: 'A',
          sessions: [{ id: 'old-1', startDate: '2024-01-01', finished: true }],
        }),
      ],
      covers: [],
    };
    await svc.importBooks(bundle, { conflictMode: 'duplicate' });
    const books = await svc.getBooks();
    expect(books).toHaveLength(1);
    expect(books[0].sessions).toHaveLength(1);
    expect(books[0].sessions![0].id).not.toBe('old-1');
    expect(books[0].sessions![0].startDate).toBe('2024-01-01');
  });
});

describe('libraryService — atomic import', () => {
  it('rolls back the entire import if a write fails (no partial state)', async () => {
    await svc.saveBook(makeBook({ id: 'keep', title: 'Kalsın', author: 'A' }));

    // structured-clone edilemeyen bir alan -> put() DataCloneError -> tx abort.
    const badBook = makeBook({ id: 'bad', title: 'Bozuk', author: 'B' }) as Book & {
      evil?: unknown;
    };
    badBook.evil = () => undefined;

    const bundle = {
      version: 2 as const,
      exportedAt: new Date().toISOString(),
      bookCount: 1,
      books: [badBook],
      covers: [],
    };

    await expect(svc.importBooks(bundle as never, { conflictMode: 'duplicate' })).rejects.toThrow();

    // Kütüphane değişmedi — sadece 'keep' var, 'bad' yazılmadı.
    const books = await svc.getBooks();
    expect(books).toHaveLength(1);
    expect(books[0].id).toBe('keep');
  });
});

function countCovers(): Promise<number> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('kitapligim');
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('covers', 'readonly');
      const req = transaction.objectStore('covers').count();
      req.onsuccess = () => {
        resolve(req.result);
        db.close();
      };
      req.onerror = () => reject(req.error);
    };
    open.onerror = () => reject(open.error);
  });
}
