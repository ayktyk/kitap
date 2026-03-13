import React, { useState, useEffect } from 'react';
import { Book, ViewState, BookStatus } from './types';
import * as supabaseService from './services/supabaseService';
import BookList from './components/BookList';
import BookForm from './components/BookForm';
import BookDetails from './components/BookDetails';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { MeshGradient } from "@paper-design/shaders-react";
import { Library, Plus, LogOut, User } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [view, setView] = useState<ViewState>('LIST');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [filter, setFilter] = useState<BookStatus | 'ALL'>('ALL');

  // Handle Auth Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load books from Supabase when session changes
  useEffect(() => {
    if (session) {
      loadBooks();
    } else {
      setBooks([]);
    }
  }, [session]);

  const loadBooks = async () => {
    const data = await supabaseService.getBooks();
    setBooks(data);
  };

  const handleSaveBook = async (book: Book) => {
    await supabaseService.saveBook(book);
    await loadBooks();
    setView('LIST');
    setSelectedBook(null);
  };

  const handleDeleteBook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bu kitabı silmek istediğinize emin misiniz?")) {
      await supabaseService.deleteBook(id);
      await loadBooks();
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <div className="fixed inset-0 -z-10 bg-black">
          <MeshGradient
            className="w-full h-full opacity-40"
            colors={["#101010", "#1a1a1a", "#2a2a2a", "#010101"]}
            speed={0.8}
          />
        </div>
        <Auth />
      </>
    );
  }

  const filteredBooks = books.filter(b => filter === 'ALL' || b.status === filter);

  return (
    <div className="min-h-screen relative font-sans">
      {/* Global Background Shader */}
      <div className="fixed inset-0 -z-10 bg-black">
        <MeshGradient
          className="w-full h-full opacity-40"
          colors={["#101010", "#1a1a1a", "#2a2a2a", "#010101"]}
          speed={0.8}
        />
      </div>

      {/* Navbar - Glass Effect */}
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer group" onClick={() => setView('LIST')}>
              <div className="bg-white/10 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform backdrop-blur-sm border border-white/10">
                 <Library className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-white tracking-tight">Kitaplığım</h1>
                <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Kişisel Kütüphane</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 mr-2">
                <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center">
                  <User size={12} className="text-white/70" />
                </div>
                <span className="text-[10px] text-white/60 font-medium max-w-[120px] truncate">
                  {session.user.email}
                </span>
              </div>

              {view === 'LIST' && (
                <div className="hidden md:flex items-center bg-white/5 p-1 rounded-lg border border-white/5">
                  {(['ALL', 'READING', 'WANT_TO_READ', 'READ'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        filter === f 
                          ? 'bg-white/10 text-white shadow-sm' 
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {f === 'ALL' ? 'Tümü' : f === 'READING' ? 'Okuyorum' : f === 'WANT_TO_READ' ? 'Gelecek' : 'Okundu'}
                    </button>
                  ))}
                </div>
              )}
              
              {view === 'LIST' && (
                <button
                  onClick={() => { setSelectedBook(null); setView('ADD'); }}
                  className="inline-flex items-center px-4 py-2 border border-white/10 text-sm font-medium rounded-md shadow-lg text-white bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all focus:outline-none"
                >
                  <Plus size={18} className="mr-1 md:mr-2" />
                  <span className="hidden xs:inline">Kitap Ekle</span>
                </button>
              )}

              <button
                onClick={handleSignOut}
                title="Çıkış Yap"
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        
        {view === 'LIST' && (
          <div className="animate-fade-in-up">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
               <div>
                 <h2 className="text-3xl font-bold text-white font-serif">
                    {filter === 'ALL' ? 'Kitaplığım' : 
                     filter === 'READING' ? 'Şu An Okuduklarım' : 
                     filter === 'WANT_TO_READ' ? 'Okunacaklar' : 'Bitirdiğim Kitaplar'}
                 </h2>
                 <p className="text-sm text-white/40 mt-1">
                   Toplam {filteredBooks.length} kitap, {filteredBooks.reduce((acc, b) => acc + (b.pageCount || 0), 0).toLocaleString()} sayfa
                 </p>
               </div>
               
               {/* Mobile Filter */}
               <div className="md:hidden flex bg-white/5 p-1 rounded-lg w-full overflow-x-auto no-scrollbar border border-white/5">
                  {(['ALL', 'READING', 'WANT_TO_READ', 'READ'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                        filter === f 
                          ? 'bg-white/10 text-white' 
                          : 'text-white/40'
                      }`}
                    >
                      {f === 'ALL' ? 'Tümü' : f === 'READING' ? 'Okuyorum' : f === 'WANT_TO_READ' ? 'Gelecek' : 'Okundu'}
                    </button>
                  ))}
               </div>
             </div>
             
             <BookList 
               books={filteredBooks} 
               onSelect={handleSelectBook} 
               onDelete={handleDeleteBook}
               onEdit={handleEditBook}
             />
          </div>
        )}

        {(view === 'ADD' || view === 'EDIT') && (
          <div className="animate-fade-in-up">
            <BookForm
              initialData={selectedBook}
              onSave={handleSaveBook}
              onCancel={() => setView('LIST')}
            />
          </div>
        )}

        {view === 'DETAILS' && selectedBook && (
          <div className="animate-fade-in-up">
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