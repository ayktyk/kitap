import React, { useState, useEffect } from 'react';
import { Book, ViewState } from './types';
import * as storageService from './services/storageService';
import BookList from './components/BookList';
import BookForm from './components/BookForm';
import BookDetails from './components/BookDetails';
import { Library, Plus } from 'lucide-react';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [view, setView] = useState<ViewState>('LIST');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Load books on mount
  useEffect(() => {
    setBooks(storageService.getBooks());
  }, []);

  const handleSaveBook = (book: Book) => {
    storageService.saveBook(book);
    setBooks(storageService.getBooks()); // Reload
    setView('LIST');
    setSelectedBook(null);
  };

  const handleDeleteBook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bu kitabı silmek istediğinize emin misiniz?")) {
      storageService.deleteBook(id);
      setBooks(storageService.getBooks());
    }
  };

  const handleEditBook = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBook(book);
    setView('EDIT');
  };

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setView('DETAILS');
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] pb-10">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => setView('LIST')}>
              <div className="bg-ink p-2 rounded-lg mr-3">
                 <Library className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-gray-900 tracking-tight">Kitaplığım</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Kişisel Kütüphane</p>
              </div>
            </div>
            <div className="flex items-center">
              {view === 'LIST' && (
                <button
                  onClick={() => { setSelectedBook(null); setView('ADD'); }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                >
                  <Plus size={18} className="mr-2" />
                  Kitap Ekle
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {view === 'LIST' && (
          <div className="animate-in fade-in duration-500">
             <div className="flex justify-between items-end mb-6">
               <h2 className="text-2xl font-bold text-gray-800 font-serif">Okuduğum Kitaplar ({books.length})</h2>
               
               {/* Simple Stats or Filter could go here */}
               <div className="text-sm text-gray-500">
                  {books.length > 0 && (
                    <span>Toplam {books.reduce((acc, b) => acc + (b.pageCount || 0), 0).toLocaleString()} sayfa okundu.</span>
                  )}
               </div>
             </div>
             <BookList 
               books={books} 
               onSelect={handleSelectBook} 
               onDelete={handleDeleteBook}
               onEdit={handleEditBook}
             />
          </div>
        )}

        {(view === 'ADD' || view === 'EDIT') && (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <BookForm
              initialData={selectedBook}
              onSave={handleSaveBook}
              onCancel={() => setView('LIST')}
            />
          </div>
        )}

        {view === 'DETAILS' && selectedBook && (
          <div className="animate-in zoom-in-95 duration-300">
            <BookDetails
              book={selectedBook}
              onBack={() => setView('LIST')}
              onEdit={() => setView('EDIT')}
            />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;