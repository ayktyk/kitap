import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import {
  ArrowUpDown,
  Plus,
  Search,
  User,
} from 'lucide-react';
import Logo from './components/Logo';
import { MeshGradient } from '@paper-design/shaders-react';
import BookDetails from './components/BookDetails';
import BookForm from './components/BookForm';
import BookList from './components/BookList';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ThemeSwitcher from './components/ThemeSwitcher';
import { supabase } from './lib/supabase';
import * as supabaseService from './services/supabaseService';
import { Book, BookFilter, ViewState } from './types';
import { ThemeProvider, useTheme } from './lib/themeContext';

type SortOption =
  | 'NEWEST'
  | 'TITLE_ASC'
  | 'AUTHOR_ASC'
  | 'RATING_DESC'
  | 'PAGES_DESC';

const filterLabels: Record<BookFilter, string> = {
  ALL: 'Kitaplığım',
  FAVORITES: 'Favori Kitaplarım',
  READING: 'Şu An Okuduklarım',
  WANT_TO_READ: 'Okunacaklar',
  READ: 'Bitirdiğim Kitaplar',
  ABANDONED: 'Yarım Bıraktıklarım',
};

const sortLabels: Record<SortOption, string> = {
  NEWEST: 'En yeni eklenen',
  TITLE_ASC: 'Ada göre',
  AUTHOR_ASC: 'Yazara göre',
  RATING_DESC: 'Puana göre',
  PAGES_DESC: 'Sayfa sayısına göre',
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'karanlik';
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [view, setView] = useState<ViewState>('LIST');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [filter, setFilter] = useState<BookFilter>('ALL');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeSwitcherOpen, setThemeSwitcherOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadBooks();
      return;
    }

    setBooks([]);
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

  const handleDeleteBook = async (id: string) => {
    if (window.confirm('Bu kitabı silmek istediğinize emin misiniz?')) {
      await supabaseService.deleteBook(id);
      await loadBooks();
      setView('LIST');
      setSelectedBook(null);
      setSidebarOpen(false);
    }
  };

  const handleEditBook = (book: Book, event: React.MouseEvent) => {
    event.stopPropagation();
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--theme-border)', borderTopColor: 'var(--theme-ink)' }} />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <div className="fixed inset-0 -z-10" style={{ backgroundColor: 'var(--theme-bg)' }}>
          {isDarkTheme && (
            <MeshGradient
              className="w-full h-full opacity-40"
              colors={['#101010', '#1a1a1a', '#2a2a2a', '#010101']}
              speed={0.8}
            />
          )}
        </div>
        <Auth />
        <ThemeSwitcher isOpen={themeSwitcherOpen} onClose={() => setThemeSwitcherOpen(false)} />
        {/* Auth ekraninda da tema degistirme dugmesi */}
        <button
          type="button"
          onClick={() => setThemeSwitcherOpen(true)}
          className="fixed top-5 right-5 z-50 px-3.5 py-2 rounded-full border text-[11px] font-bold uppercase tracking-[0.18em] transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-ink-soft)',
          }}
        >
          Tema
        </button>
      </>
    );
  }

  const filterOptions: BookFilter[] = ['ALL', 'FAVORITES', 'READING', 'WANT_TO_READ', 'READ'];

  const filteredBooks = books.filter((book) => {
    if (filter === 'ALL') return true;
    if (filter === 'FAVORITES') return book.isFavorite || book.rating === 10;
    return book.status === filter;
  });

  const normalizedQuery = searchTerm.trim().toLocaleLowerCase('tr-TR');

  const searchedBooks = filteredBooks.filter((book) => {
    if (!normalizedQuery) return true;

    const searchableFields = [
      book.title,
      book.author,
      book.genre,
      book.thoughts,
      book.purchaseLocation,
      book.startLocation,
      book.endLocation,
      ...book.quotes.map((quote) => quote.text),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR');

    return searchableFields.includes(normalizedQuery);
  });

  const visibleBooks = [...searchedBooks].sort((left, right) => {
    switch (sortBy) {
      case 'TITLE_ASC':
        return left.title.localeCompare(right.title, 'tr');
      case 'AUTHOR_ASC':
        return left.author.localeCompare(right.author, 'tr');
      case 'RATING_DESC':
        return right.rating - left.rating;
      case 'PAGES_DESC':
        return right.pageCount - left.pageCount;
      case 'NEWEST':
      default:
        return right.createdAt - left.createdAt;
    }
  });

  const visiblePageCount = visibleBooks.reduce((total, book) => total + (book.pageCount || 0), 0);
  const visibleFavorites = visibleBooks.filter((book) => book.isFavorite || book.rating === 10).length;
  const visibleReading = visibleBooks.filter((book) => book.status === 'READING').length;
  const visibleCompleted = visibleBooks.filter((book) => book.status === 'READ').length;

  const emptyTitle = searchTerm.trim()
    ? 'Aradığın ifadeye uygun kitap bulunamadı'
    : 'Kütüphaneniz Henüz Sessiz';
  const emptyDescription = searchTerm.trim()
    ? 'Arama kelimesini değiştirerek veya filtreyi temizleyerek tekrar deneyebilirsiniz.'
    : 'Yeni bir kitap ekleyerek kütüphanenizi canlandırın. Sağ üstteki butonla başlayabilirsiniz.';

  return (
    <div className="min-h-screen relative font-sans">
      <div className="fixed inset-0 -z-10" style={{ backgroundColor: 'var(--theme-bg)' }}>
        {isDarkTheme && (
          <MeshGradient
            className="w-full h-full opacity-40"
            colors={['#101010', '#1a1a1a', '#2a2a2a', '#010101']}
            speed={0.8}
          />
        )}
      </div>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
        userEmail={session.user.email}
        activeFilter={filter}
        onFilterChange={setFilter}
        onNavigateHome={() => {
          setView('LIST');
          setSelectedBook(null);
        }}
        onOpenThemeSwitcher={() => setThemeSwitcherOpen(true)}
      />

      <ThemeSwitcher isOpen={themeSwitcherOpen} onClose={() => setThemeSwitcherOpen(false)} />

      <nav className="border-b border-white/5 sticky top-0 z-50 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                className="p-1 rounded-lg hover:scale-110 transition-all overflow-hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Menüyü aç"
              >
                <Logo size={36} className="rounded-md" />
              </button>
              <button
                className="text-left group"
                onClick={() => {
                  setView('LIST');
                  setSelectedBook(null);
                  setFilter('ALL');
                }}
              >
                <h1 className="text-xl font-serif font-bold text-white tracking-tight group-hover:text-white/80 transition-colors">Kitaplığım</h1>
                <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1">
                  Kişisel Kütüphane <span className="text-[8px] animate-pulse">o</span>
                </p>
              </button>
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
                <div className="hidden lg:flex items-center bg-white/5 p-1 rounded-lg border border-white/5">
                  {filterOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setFilter(option)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        filter === option
                          ? 'bg-blue-500/10 text-blue-300 shadow-sm'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {option === 'ALL'
                        ? 'Tümü'
                        : option === 'FAVORITES'
                          ? 'Favoriler'
                          : option === 'READING'
                            ? 'Okuyorum'
                            : option === 'WANT_TO_READ'
                              ? 'Okunacak'
                              : 'Okundu'}
                    </button>
                  ))}
                </div>
              )}

              {view === 'LIST' && (
                <button
                  onClick={() => {
                    setSelectedBook(null);
                    setView('ADD');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-white/10 text-sm font-bold rounded-full shadow-lg text-white bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all focus:outline-none hover:scale-105 active:scale-95"
                >
                  <Plus size={18} className="mr-1 md:mr-2" />
                  <span className="hidden xs:inline uppercase tracking-widest text-[10px]">Ekle</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {view === 'LIST' && (
          <div className="animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
              <div className="w-full text-center md:text-left">
                <h2 className="text-4xl font-bold text-white font-serif tracking-tight">
                  {filterLabels[filter]}
                </h2>
              </div>

              <div className="lg:hidden flex bg-white/5 p-1.5 rounded-2xl w-full overflow-x-auto no-scrollbar border border-white/5 backdrop-blur-sm">
                {filterOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFilter(option)}
                    className={`flex-1 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
                      filter === option
                        ? 'bg-white/10 text-white shadow-xl border border-white/10'
                        : 'text-white/30'
                    }`}
                  >
                    {option === 'ALL'
                      ? 'Tümü'
                      : option === 'FAVORITES'
                        ? 'Favori'
                        : option === 'READING'
                          ? 'Okuyor'
                          : option === 'WANT_TO_READ'
                            ? 'Okunacak'
                            : 'Okundu'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6 mb-8 text-sm text-white/40 flex-wrap">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <span className="font-medium text-white/50">{books.length}</span> kitap
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.4)]" />
                <span className="font-medium text-white/50">{visibleReading}</span> okuyor
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.4)]" />
                <span className="font-medium text-white/50">{visibleCompleted}</span> bitti
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_6px_rgba(244,114,182,0.4)]" />
                <span className="font-medium text-white/50">{visibleFavorites}</span> favori
              </span>
              <span className="text-white/15 hidden sm:inline">|</span>
              <span className="hidden sm:inline text-white/25">{visiblePageCount.toLocaleString()} sayfa okundu</span>
            </div>

            <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/35 mb-2">
                    Arama
                  </label>
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Kitap, yazar, tür, alıntı veya not ara"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-white/10 bg-black/20 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="lg:w-72">
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/35 mb-2">
                    Sıralama
                  </label>
                  <div className="relative">
                    <ArrowUpDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as SortOption)}
                      className="w-full appearance-none pl-11 pr-4 py-3.5 rounded-2xl border border-white/10 bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-transparent transition-all"
                    >
                      {Object.entries(sortLabels).map(([value, label]) => (
                        <option key={value} value={value} className="bg-zinc-950 text-white">
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-white/35">
                <p>
                  {searchTerm.trim()
                    ? `"${searchTerm}" için ${visibleBooks.length} sonuç bulundu.`
                    : 'Filtrelerini daraltmak veya yazara göre aramak için üstteki alanları kullan.'}
                </p>
                {(searchTerm || sortBy !== 'NEWEST') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSortBy('NEWEST');
                    }}
                    className="text-left sm:text-right font-semibold text-white/55 hover:text-white transition-colors"
                  >
                    Arama ve sıralamayı sıfırla
                  </button>
                )}
              </div>
            </section>

            <BookList
              books={visibleBooks}
              onSelect={handleSelectBook}
              onEdit={handleEditBook}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            />
          </div>
        )}

        {(view === 'ADD' || view === 'EDIT') && (
          <div className="animate-fade-in-up">
            <BookForm
              initialData={selectedBook}
              allBooks={books}
              onSave={handleSaveBook}
              onCancel={() => setView('LIST')}
              onDelete={handleDeleteBook}
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

const App: React.FC = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);

export default App;
