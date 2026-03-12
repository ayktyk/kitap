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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <BookOpen size={40} className="text-gray-300" />
        </div>
        <h3 className="text-xl font-medium text-gray-700 mb-2">Kütüphaneniz Boş</h3>
        <p className="text-gray-500 max-w-sm">Henüz bir kitap eklemediniz. Sağ üstteki buton ile ilk kitabınızı ekleyin.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {books.map((book) => (
        <div 
          key={book.id}
          onClick={() => onSelect(book)}
          className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-accent/30 transition-all duration-300 cursor-pointer flex flex-col h-full"
        >
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                  {book.title}
                </h3>
                <p className="text-sm text-gray-500 font-medium mt-1">{book.author}</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                 <button 
                  onClick={(e) => onEdit(book, e)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => onDelete(book.id, e)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="mb-4">
               <RatingStars rating={book.rating} readOnly />
            </div>

            <div className="space-y-2 mt-auto text-sm text-gray-600">
              {book.startDate && (
                 <div className="flex items-center gap-2">
                   <Calendar size={14} className="text-gray-400" />
                   <span className="text-xs">{new Date(book.startDate).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric'})}</span>
                 </div>
              )}
              {book.startLocation && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="text-xs truncate">{book.startLocation}</span>
                </div>
              )}
              {book.pageCount > 0 && (
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-gray-400" />
                  <span className="text-xs">{book.pageCount} sayfa</span>
                </div>
              )}
            </div>
            
            {book.quotes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs italic text-gray-500 line-clamp-2">
                  "{book.quotes[0].text}"
                </p>
              </div>
            )}
          </div>
          <div className="h-1.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent group-hover:via-accent transition-all duration-500"></div>
        </div>
      ))}
    </div>
  );
};

export default BookList;