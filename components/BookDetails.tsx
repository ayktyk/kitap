import React from 'react';
import { Book } from '../types';
import { ArrowLeft, Calendar, MapPin, Quote, Clock, BookOpen, ShoppingBag } from 'lucide-react';
import RatingStars from './RatingStars';

interface Props {
  book: Book;
  onBack: () => void;
  onEdit: () => void;
}

const BookDetails: React.FC<Props> = ({ book, onBack, onEdit }) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Belirtilmedi';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="glass min-h-[80vh] rounded-3xl border border-white/5 overflow-hidden relative shadow-2xl animate-fade-in-up">
      {/* Top Banner */}
      <div className="h-40 bg-white/5 relative border-b border-white/5 backdrop-blur-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-white/[0.08] to-white/[0.02] animate-pulse-slow" />
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-white/50 hover:text-white transition-all z-10 font-bold text-xs uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md"
        >
          <ArrowLeft size={16} />
          <span>Geri Dön</span>
        </button>
        <button
          onClick={onEdit}
          className="absolute top-8 right-8 px-6 py-2 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 transition-all shadow-lg z-10"
        >
          Düzenle
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-20">
        {/* Header — centered */}
        <div className="relative -mt-20 mb-16 flex flex-col items-center text-center">
          <div
            className="w-44 h-64 bg-white/5 rounded-2xl shadow-2xl shrink-0 flex items-center justify-center bg-cover bg-center border-2 border-white/20 hover:scale-105 transition-transform duration-500 z-10"
            style={{ backgroundImage: `url(${book.coverUrl || `https://picsum.photos/seed/${book.id}/300/450`})` }}
          >
            {!book.coverUrl && <BookOpen className="text-white/10" size={50} />}
          </div>

          <h1 className="text-3xl md:text-4xl font-serif font-black text-white mt-8 mb-3 tracking-tight leading-tight">
            {book.title}
          </h1>
          <p className="text-lg text-white/50 font-medium mb-5">{book.author}</p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <span
              className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-[0.2em] border shadow-lg ${
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
            {book.genre && (
              <span className="px-4 py-1.5 bg-white/5 text-white/40 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                {book.genre}
              </span>
            )}
          </div>

          <div className="mt-5">
            <RatingStars rating={book.rating} readOnly size={22} />
          </div>
        </div>

        {/* Journey */}
        <section className="mb-14">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-8 text-center">
            Okuma Yolculuğu
          </h3>
          <div className="relative flex justify-between items-center px-2">
            <div className="absolute left-12 right-12 top-1/2 h-px bg-white/5" />

            <div className="z-10 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-xl flex flex-col items-center gap-2 min-w-[110px] backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                <MapPin size={18} />
              </div>
              <span className="text-xs font-bold text-white/90">{book.startLocation || '---'}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                {formatDate(book.startDate)}
              </span>
            </div>

            <div className="z-10 bg-white/10 w-10 h-10 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-xl animate-pulse">
              <Clock size={16} className="text-white/40" />
            </div>

            <div className="z-10 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-xl flex flex-col items-center gap-2 min-w-[110px] backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                <MapPin size={18} />
              </div>
              <span className="text-xs font-bold text-white/90">{book.endLocation || '---'}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                {formatDate(book.endDate)}
              </span>
            </div>
          </div>
        </section>

        {/* Thoughts */}
        {book.thoughts && (
          <section className="mb-14">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-8">Düşüncelerim</h3>
            <div className="relative bg-white/[0.03] p-8 md:p-10 rounded-3xl border border-white/5 shadow-inner">
              <Quote className="absolute top-6 left-6 text-white/[0.04] -rotate-12" size={60} />
              <p className="relative font-serif text-lg text-white/80 italic leading-[1.9] tracking-tight whitespace-pre-wrap z-10">
                {book.thoughts}
              </p>
            </div>
          </section>
        )}

        {/* Quotes */}
        {book.quotes.length > 0 && (
          <section className="mb-14">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-8">
              Altını Çizdiklerim <span className="text-white/10 ml-1">({book.quotes.length})</span>
            </h3>
            <div className="grid gap-6">
              {book.quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="relative bg-white/[0.03] p-8 rounded-3xl border border-white/5 shadow-xl hover:bg-white/[0.06] transition-all duration-500 group"
                >
                  <Quote className="absolute -top-4 -left-2 text-white/[0.04] -rotate-12" size={80} />
                  <p className="relative text-white/90 font-serif italic text-lg z-10 pl-4 leading-[1.9] tracking-tight group-hover:translate-x-1 transition-transform">
                    "{quote.text}"
                  </p>
                  {quote.page && quote.page > 0 && (
                    <div className="text-right mt-6 text-[10px] font-black uppercase tracking-widest text-white/20">
                      — Sayfa {quote.page}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Acquisition details — inline compact */}
        {(book.purchaseDate || book.purchaseLocation) && (
          <section className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/30 border-t border-white/5 pt-10">
            {book.purchaseDate && (
              <span className="flex items-center gap-2">
                <Calendar size={14} className="text-white/20" />
                {formatDate(book.purchaseDate)}
              </span>
            )}
            {book.purchaseLocation && (
              <span className="flex items-center gap-2">
                <ShoppingBag size={14} className="text-white/20" />
                {book.purchaseLocation}
              </span>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default BookDetails;
