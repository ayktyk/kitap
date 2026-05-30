import React from 'react';
import { Calendar, BookOpen, Edit2 } from 'lucide-react';
import { Book } from '../types';
import RatingStars from './RatingStars';

export type ViewMode = 'list' | 'cover';
export type GroupBy = 'none' | 'status' | 'genre' | 'tag';

interface Props {
  books: Book[];
  onSelect: (book: Book) => void;
  onEdit: (book: Book, e: React.MouseEvent) => void;
  viewMode?: ViewMode;
  groupBy?: GroupBy;
  emptyTitle?: string;
  emptyDescription?: string;
}

const statusLabel = (status: Book['status']) =>
  status === 'READING'
    ? 'Okuyorum'
    : status === 'WANT_TO_READ'
      ? 'Okunacak'
      : status === 'READ'
        ? 'Okundu'
        : 'Yarım';

const BookList: React.FC<Props> = ({
  books,
  onSelect,
  onEdit,
  viewMode = 'list',
  groupBy = 'none',
  emptyTitle = 'Kütüphaneniz Henüz Sessiz',
  emptyDescription = 'Yeni bir kitap ekleyerek kütüphanenizi canlandırın. Sağ üstteki butonla başlayabilirsiniz.',
}) => {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in-up">
        <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/5 backdrop-blur-md">
          <BookOpen size={40} className="text-white/20" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-white mb-3">{emptyTitle}</h3>
        <p className="text-white/40 max-w-sm leading-relaxed">{emptyDescription}</p>
      </div>
    );
  }

  const renderCard = (book: Book) => (
    <div
      key={book.id}
      onClick={() => onSelect(book)}
      className="group glass rounded-2xl overflow-hidden card-hover cursor-pointer flex flex-col h-full border border-white/5"
    >
      <div className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-serif font-bold text-white leading-tight line-clamp-2 group-hover:text-blue-300 transition-colors">
              {book.title}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-sm text-white/60 font-medium truncate">{book.author}</p>
              {book.genre && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="text-xs text-white/40 font-semibold tracking-wide uppercase px-2 py-0.5 bg-white/5 rounded-full border border-white/5">
                    {book.genre}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
            <button
              onClick={(event) => onEdit(book, event)}
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <RatingStars rating={book.rating} readOnly />
          <span
            className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md border ${
              book.status === 'READING'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : book.status === 'WANT_TO_READ'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-white/5 text-white/60 border-white/10'
            }`}
          >
            {book.status === 'READING'
              ? 'OKUYORUM'
              : book.status === 'WANT_TO_READ'
                ? 'OKUNACAK'
                : book.status === 'READ'
                  ? 'OKUNDU'
                  : 'YARIM'}
          </span>
        </div>

        <div className="space-y-3 mt-auto text-sm text-white/50">
          {book.startDate && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/5 rounded-md border border-white/5">
                <Calendar size={12} className="text-white/40" />
              </div>
              <span className="text-xs tracking-tight">
                {new Date(book.startDate).toLocaleDateString('tr-TR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          {book.pageCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/5 rounded-md border border-white/5">
                <BookOpen size={12} className="text-white/40" />
              </div>
              <span className="text-xs tracking-tight">{book.pageCount} sayfa</span>
            </div>
          )}

          {book.status === 'READING' &&
            book.pageCount > 0 &&
            (book.currentPage ?? 0) > 0 &&
            (() => {
              const percent = Math.max(
                0,
                Math.min(100, Math.round(((book.currentPage ?? 0) / book.pageCount) * 100)),
              );
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/30">
                    <span>İlerleme</span>
                    <span>%{percent}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-400/70 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })()}
        </div>

        {(book.tags ?? []).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(book.tags ?? []).slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold text-white/50 px-2 py-0.5 bg-white/5 rounded-full border border-white/10"
              >
                {tag}
              </span>
            ))}
            {(book.tags ?? []).length > 4 && (
              <span className="text-[10px] font-semibold text-white/30 px-1.5 py-0.5">
                +{(book.tags ?? []).length - 4}
              </span>
            )}
          </div>
        )}

        {book.quotes.length > 0 && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <p className="text-xs italic text-white/30 line-clamp-2 leading-relaxed font-serif">
              "{book.quotes[0].text}"
            </p>
          </div>
        )}
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-white/20 transition-all duration-700" />
    </div>
  );

  const renderCoverTile = (book: Book) => (
    <div
      key={book.id}
      onClick={() => onSelect(book)}
      className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer border border-white/10 bg-white/5 bg-cover bg-center transition-transform hover:scale-[1.03]"
      style={book.coverUrl ? { backgroundImage: `url(${book.coverUrl})` } : undefined}
    >
      {!book.coverUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen size={28} className="text-white/15" />
        </div>
      )}
      <button
        onClick={(event) => onEdit(book, event)}
        aria-label="Düzenle"
        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
      >
        <Edit2 size={13} />
      </button>
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
        <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight">{book.title}</p>
        <p className="text-[10px] text-white/60 truncate">{book.author}</p>
      </div>
    </div>
  );

  const renderGrid = (subset: Book[]) =>
    viewMode === 'cover' ? (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {subset.map(renderCoverTile)}
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subset.map(renderCard)}
      </div>
    );

  if (groupBy === 'none') {
    return renderGrid(books);
  }

  // Gruplama. Etikete göre grupta bir kitap birden fazla grupta görünebilir.
  const groupKeysOf = (book: Book): string[] => {
    if (groupBy === 'status') return [statusLabel(book.status)];
    if (groupBy === 'genre') return [book.genre?.trim() || 'Tür belirtilmemiş'];
    const tags = (book.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
    return tags.length > 0 ? tags : ['Etiketsiz'];
  };

  const groups = new Map<string, Book[]>();
  for (const book of books) {
    for (const key of groupKeysOf(book)) {
      const bucket = groups.get(key) ?? [];
      bucket.push(book);
      groups.set(key, bucket);
    }
  }
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'tr'));

  return (
    <div className="space-y-10">
      {sortedKeys.map((key) => (
        <section key={key}>
          <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/30 mb-4 flex items-center gap-2">
            {key}
            <span className="text-white/15">({groups.get(key)!.length})</span>
          </h3>
          {renderGrid(groups.get(key)!)}
        </section>
      ))}
    </div>
  );
};

export default BookList;
