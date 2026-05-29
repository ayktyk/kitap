// @vitest-environment node
// Auto-backup is localStorage-centric. node has no localStorage, so we install a
// tiny in-memory polyfill before importing the service.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import type { Book } from '../types';

class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

type Svc = typeof import('./libraryService');
let svc: Svc;

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    title: 'T',
    author: 'A',
    rating: 5,
    pageCount: 100,
    genre: '',
    status: 'READ',
    startDate: '',
    endDate: '',
    startLocation: '',
    endLocation: '',
    purchaseDate: '',
    purchaseLocation: '',
    thoughts: '',
    quotes: [],
    createdAt: 1,
    ...overrides,
  };
}

beforeEach(async () => {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new MemoryStorage() as unknown as Storage;
  vi.resetModules();
  svc = await import('./libraryService');
});

describe('auto-backup', () => {
  it('createAutoBackup snapshots current books to localStorage', async () => {
    await svc.saveBook(makeBook({ id: 'b1', title: 'Saatleri Ayarlama Enstitüsü', author: 'Tanpınar' }));
    const entry = await svc.createAutoBackup();
    expect(entry).not.toBeNull();
    expect(entry!.bookCount).toBe(1);

    const list = svc.listAutoBackups();
    expect(list).toHaveLength(1);
    expect(list[0].books[0].title).toBe('Saatleri Ayarlama Enstitüsü');
  });

  it('importBooks captures a pre-import snapshot', async () => {
    await svc.saveBook(makeBook({ id: 'b1', title: 'Önceki', author: 'X' }));
    await svc.importBooks(
      {
        version: 2,
        exportedAt: new Date().toISOString(),
        bookCount: 1,
        books: [makeBook({ id: 'b2', title: 'Yeni', author: 'Y' })],
        covers: [],
      },
      { conflictMode: 'duplicate' },
    );

    const list = svc.listAutoBackups();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].bookCount).toBe(1);
    expect(list[0].books[0].title).toBe('Önceki');
  });

  it('keeps at most 3 backups', async () => {
    for (let i = 0; i < 5; i += 1) await svc.createAutoBackup();
    expect(svc.listAutoBackups().length).toBeLessThanOrEqual(3);
  });

  it('restoreAutoBackup rolls the library back to the snapshot (overwrite)', async () => {
    await svc.saveBook(makeBook({ id: 'b1', title: 'Orijinal', author: 'A', thoughts: 'ilk' }));
    const entry = await svc.createAutoBackup();
    expect(entry).not.toBeNull();

    await svc.saveBook(makeBook({ id: 'b1', title: 'Orijinal', author: 'A', thoughts: 'değişti' }));
    await svc.restoreAutoBackup(entry!);

    const books = await svc.getBooks();
    expect(books).toHaveLength(1);
    expect(books[0].thoughts).toBe('ilk');
  });
});
