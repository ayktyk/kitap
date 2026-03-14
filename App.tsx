import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import {
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  Clock3,
  Heart,
  Library,
  Plus,
  Search,
  User,
} from 'lucide-react';
import { MeshGradient } from '@paper-design/shaders-react';
import BookDetails from './components/BookDetails';
import BookForm from './components/BookForm';
import BookList from './components/BookList';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import { supabase } from './lib/supabase';
import * as supabaseService from './services/supabaseService';
import { Book, BookFilter, ViewState } from './types';

type SortOption =
  | 'NEWEST'
  | 'TITLE_ASC'
  | 'AUTHOR_ASC'
  | 'RATING_DESC'
  | 'PAGES_DESC';

const filterLabels: Record<BookFilter, string> = {
  ALL: 'Kitapligim',
  FAVORITES: 'Favori Kitaplarim',
  READING: 'Su An Okuduklarim',
  WANT_TO_READ: 'Okunacaklar',
  READ: 'Bitirdigim Kitaplar',
  ABANDONED: 'Yarim Biraktiklarim',
};

const sortLabels: Record<SortOption, string> = {
  NEWEST: 'En yeni eklenen',
  TITLE_ASC: 'Ada gore',
  AUTHOR_ASC: 'Yazara gore',
  RATING_DESC: 'Puana gore',
  PAGES_DESC: 'Sayfa sayisina gore',
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [view, setView] = useState<ViewState>('LIST');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [filter, setFilter] = useState<BookFilter>('ALL');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    if (window.confirm('Bu kitabi silmek istediginize emin misiniz?')) {
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
            colors={['#101010', '#1a1a1a', '#2a2a2a', '#010101']}
            speed={0.8}
          />
        </div>
        <Auth />
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
    ? 'Aradigin ifadeye uygun kitap bulunamadi'
    : 'Kutuphaneniz Henuz Sessiz';
  const emptyDescription = searchTerm.trim()
    ? 'Arama kelimesini degistirerek veya filtreyi temizleyerek tekrar deneyebilirsiniz.'
    : 'Yeni bir kitap ekleyerek kutuphanenizi canlandirin. Sag ustteki butonla baslayabilirsiniz.';

  return (
    <div className="min-h-screen relative font-sans">
      <div className="fixed inset-0 -z-10 bg-black">
        <MeshGradient
          className="w-full h-full opacity-40"
          colors={['#101010', '#1a1a1a', '#2a2a2a', '#010101']}
          speed={0.8}
        />
      </div>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
        userEmail={session.user.email}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      <nav className="border-b border-white/5 sticky top-0 z-50 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer group" onClick={() => setSidebarOpen(true)}>
              <div className="bg-white/10 p-2 rounded-lg mr-3 group-hover:bg-white/20 group-hover:scale-110 transition-all backdrop-blur-sm border border-white/10">
                <Library className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-white tracking-tight">Kitapligim</h1>
                <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1">
                  Kisisel Kutuphane <span className="text-[8px] animate-pulse">o</span>
                </p>
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
                        ? 'Tumu'
                        : option === 'FAVORITES'
                          ? 'Favoriler'
                          : option === 'READING'
                            ? 'Okuyorum'
                            : option === 'WANT_TO_READ'
                              ? 'Gelecek'
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
                <p className="text-xs text-white/30 mt-2 font-medium tracking-wide uppercase">
                  {visibleBooks.length} Kitap • {visiblePageCount.toLocaleString()} Sayfa
                </p>
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
                      ? 'Tumu'
                      : option === 'FAVORITES'
                        ? 'Favori'
                        : option === 'READING'
                          ? 'Okuyor'
                          : option === 'WANT_TO_READ'
                            ? 'Gelecek'
                            : 'Okundu'}
                  </button>
                ))}
              </div>
            </div>

            <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    Gorunen
                  </span>
                  <BookOpen size={16} className="text-white/35" />
                </div>
                <p className="text-3xl font-serif font-bold text-white">{visibleBooks.length}</p>
                <p className="text-xs text-white/35 mt-2">Anlik liste sonucu</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    Okunuyor
                  </span>
                  <Clock3 size={16} className="text-green-300/70" />
                </div>
                <p className="text-3xl font-serif font-bold text-white">{visibleReading}</p>
                <p className="text-xs text-white/35 mt-2">Aktif okuma sayisi</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    Tamamlandi
                  </span>
                  <CheckCircle2 size={16} className="text-blue-300/70" />
                </div>
                <p className="text-3xl font-serif font-bold text-white">{visibleCompleted}</p>
                <p className="text-xs text-white/35 mt-2">Bitirilen kitaplar</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    Favoriler
                  </span>
                  <Heart size={16} className="text-pink-300/70" />
                </div>
                <p className="text-3xl font-serif font-bold text-white">{visibleFavorites}</p>
                <p className="text-xs text-white/35 mt-2">Kalp attigin secimler</p>
              </div>
            </section>

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
                      placeholder="Kitap, yazar, tur, alinti veya not ara"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-white/10 bg-black/20 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="lg:w-72">
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/35 mb-2">
                    Siralama
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
                    ? `"${searchTerm}" icin ${visibleBooks.length} sonuc bulundu.`
                    : 'Filtrelerini daraltmak veya yazara gore aramak icin ustteki alanlari kullan.'}
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
                    Arama ve siralamayi sifirla
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

export default App;
