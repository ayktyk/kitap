import React from 'react';
import { Book } from '../types';
import { Calendar, MapPin, BookOpen, Star, Trash2, Edit2 } from 'lucide-react';
import RatingStars from './RatingStars';

interface Props {
  books: Book[];
  onSelect: (book: Book) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onEdit: (book: Book, e: React.MouseEvent) => void;
}

const BookList: React.FC<Props> = ({ books, onSelect, onDelete, onEdit }) => {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in-up">
        <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/5 backdrop-blur-md">
          <BookOpen size={40} className="text-white/20" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-white mb-3">Kütüphaneniz Henüz Sessiz</h3>
        <p className="text-white/40 max-w-sm leading-relaxed">Yeni bir kitap ekleyerek kütüphanenizi canlandırın. Sağ üstteki butonla başlayabilirsiniz.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {books.map((book) => (
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
                  onClick={(e) => onEdit(book, e)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => onDelete(book.id, e)}
                  className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
               <RatingStars rating={book.rating} readOnly />
               <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md border ${
                 book.status === 'READING' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                 book.status === 'WANT_TO_READ' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                 'bg-white/5 text-white/60 border-white/10'
               }`}>
                 {book.status === 'READING' ? 'OKUYORUM' :
                  book.status === 'WANT_TO_READ' ? 'GELECEK' :
                  book.status === 'READ' ? 'OKUNDU' : 'YARIM'}
               </span>
            </div>

            <div className="space-y-3 mt-auto text-sm text-white/50">
              {book.startDate && (
                 <div className="flex items-center gap-3">
                   <div className="p-1.5 bg-white/5 rounded-md border border-white/5">
                     <Calendar size={12} className="text-white/40" />
                   </div>
                   <span className="text-xs tracking-tight">{new Date(book.startDate).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric'})}</span>
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
            </div>
            
            {book.quotes.length > 0 && (
              <div className="mt-5 pt-5 border-t border-white/5">
                <p className="text-xs italic text-white/30 line-clamp-2 leading-relaxed font-serif">
                  "{book.quotes[0].text}"
                </p>
              </div>
            )}
          </div>
          <div className="h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-white/20 transition-all duration-700"></div>
        </div>
      ))}
    </div>
  );
};

export default BookList;