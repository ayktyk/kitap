import React, { useMemo } from 'react';
import { ArrowLeft, BarChart3, BookOpen, Star, Layers, CalendarDays } from 'lucide-react';
import { Book, BookStatus } from '../types';

interface Props {
  books: Book[];
  onBack: () => void;
}

const statusLabels: Record<BookStatus, string> = {
  READING: 'Okuyorum',
  WANT_TO_READ: 'Okunacak',
  READ: 'Okundu',
  ABANDONED: 'Yarım Bıraktım',
};

// Bir kitabın "bitirildiği" yılı bul: önce endDate, yoksa tamamlanmış oturumların
// endDate'i. Hiçbiri yoksa null (yıllık istatistiklere dahil edilmez).
const finishedYear = (book: Book): number | null => {
  const parseYear = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const year = new Date(dateStr).getFullYear();
    return Number.isFinite(year) ? year : null;
  };

  const fromEnd = parseYear(book.endDate);
  if (fromEnd) return fromEnd;

  const sessionYears = (book.sessions ?? [])
    .filter((session) => session.finished || session.endDate)
    .map((session) => parseYear(session.endDate))
    .filter((year): year is number => year !== null);

  return sessionYears.length > 0 ? Math.max(...sessionYears) : null;
};

// Tema değişkenleriyle uyumlu yatay bar grafiği.
const BarChart: React.FC<{
  rows: Array<{ label: string; value: number }>;
  valueSuffix?: string;
  accentVar?: string;
}> = ({ rows, valueSuffix = '', accentVar = '--theme-accent' }) => {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs font-semibold text-white/50 truncate text-right">
            {row.label}
          </span>
          <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.round((row.value / max) * 100)}%`,
                backgroundColor: `var(${accentVar})`,
                opacity: 0.7,
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-xs font-bold text-white/70 text-right tabular-nums">
            {row.value.toLocaleString('tr-TR')}
            {valueSuffix}
          </span>
        </div>
      ))}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="glass rounded-2xl border border-white/5 p-5 flex flex-col gap-2">
    <div className="flex items-center gap-2 text-white/30">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-3xl font-serif font-black text-white tabular-nums">{value}</span>
  </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <section className="glass rounded-3xl border border-white/5 p-6 md:p-8">
    <h3 className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-6">
      <span className="text-white/40">{icon}</span>
      {title}
    </h3>
    {children}
  </section>
);

const StatsView: React.FC<Props> = ({ books, onBack }) => {
  const stats = useMemo(() => {
    const statusCounts: Record<BookStatus, number> = {
      READING: 0,
      WANT_TO_READ: 0,
      READ: 0,
      ABANDONED: 0,
    };

    const booksPerYear = new Map<number, number>();
    const pagesPerYear = new Map<number, number>();
    const genreCounts = new Map<string, number>();
    const ratingCounts = new Map<number, number>();
    let ratingSum = 0;
    let ratedCount = 0;

    for (const book of books) {
      if (statusCounts[book.status] !== undefined) {
        statusCounts[book.status] += 1;
      }

      const year = finishedYear(book);
      if (year) {
        booksPerYear.set(year, (booksPerYear.get(year) ?? 0) + 1);
        pagesPerYear.set(year, (pagesPerYear.get(year) ?? 0) + (book.pageCount || 0));
      }

      const genre = (book.genre || '').trim();
      if (genre) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }

      if (book.rating > 0) {
        ratingCounts.set(book.rating, (ratingCounts.get(book.rating) ?? 0) + 1);
        ratingSum += book.rating;
        ratedCount += 1;
      }
    }

    const years = Array.from(
      new Set([...booksPerYear.keys(), ...pagesPerYear.keys()]),
    ).sort((a, b) => a - b);

    const totalPagesRead = books
      .filter((book) => book.status === 'READ')
      .reduce((sum, book) => sum + (book.pageCount || 0), 0);

    return {
      total: books.length,
      statusCounts,
      booksPerYearRows: years.map((year) => ({
        label: String(year),
        value: booksPerYear.get(year) ?? 0,
      })),
      pagesPerYearRows: years.map((year) => ({
        label: String(year),
        value: pagesPerYear.get(year) ?? 0,
      })),
      genreRows: Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, value]) => ({ label, value })),
      ratingRows: Array.from({ length: 10 }, (_, index) => {
        const star = 10 - index;
        return { label: `${star} puan`, value: ratingCounts.get(star) ?? 0 };
      }).filter((row) => row.value > 0),
      averageRating: ratedCount > 0 ? ratingSum / ratedCount : 0,
      totalPagesRead,
    };
  }, [books]);

  if (books.length === 0) {
    return (
      <div className="glass rounded-3xl border border-white/5 overflow-hidden shadow-2xl animate-fade-in-up">
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-all font-bold text-xs uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5"
          >
            <ArrowLeft size={16} />
            <span>Geri Dön</span>
          </button>
          <h2 className="text-2xl font-serif font-bold text-white">İstatistikler</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/5">
            <BarChart3 size={40} className="text-white/20" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-white mb-3">Henüz İstatistik Yok</h3>
          <p className="text-white/40 max-w-sm leading-relaxed">
            Kütüphanene kitap ekledikçe okuma alışkanlıklarına dair grafikler burada belirecek.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass rounded-3xl border border-white/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-all font-bold text-xs uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5"
          >
            <ArrowLeft size={16} />
            <span>Geri Dön</span>
          </button>
          <div>
            <h2 className="text-2xl font-serif font-bold text-white leading-none">İstatistikler</h2>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mt-2">
              Okuma Yolculuğun
            </p>
          </div>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Kitap"
          value={stats.total.toLocaleString('tr-TR')}
          icon={<BookOpen size={14} />}
        />
        <StatCard
          label="Bitirilen"
          value={stats.statusCounts.READ.toLocaleString('tr-TR')}
          icon={<Layers size={14} />}
        />
        <StatCard
          label="Okunan Sayfa"
          value={stats.totalPagesRead.toLocaleString('tr-TR')}
          icon={<BookOpen size={14} />}
        />
        <StatCard
          label="Ortalama Puan"
          value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
          icon={<Star size={14} />}
        />
      </div>

      {/* Duruma göre dağılım */}
      <Section title="Duruma Göre" icon={<Layers size={14} />}>
        <BarChart
          rows={(Object.keys(stats.statusCounts) as BookStatus[]).map((status) => ({
            label: statusLabels[status],
            value: stats.statusCounts[status],
          }))}
        />
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yıllara göre bitirilen kitap */}
        <Section title="Yıllara Göre Bitirilen" icon={<CalendarDays size={14} />}>
          {stats.booksPerYearRows.length > 0 ? (
            <BarChart rows={stats.booksPerYearRows} accentVar="--theme-accent-2" />
          ) : (
            <p className="text-sm text-white/30">
              Bitiş tarihi girilmiş kitap bulunmuyor.
            </p>
          )}
        </Section>

        {/* Yıllara göre okunan sayfa */}
        <Section title="Yıllara Göre Okunan Sayfa" icon={<CalendarDays size={14} />}>
          {stats.pagesPerYearRows.some((row) => row.value > 0) ? (
            <BarChart rows={stats.pagesPerYearRows} valueSuffix="" accentVar="--theme-accent-warm" />
          ) : (
            <p className="text-sm text-white/30">
              Yıllık sayfa verisi için bitiş tarihi ve sayfa sayısı gerekir.
            </p>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tür dağılımı */}
        <Section title="Türlere Göre" icon={<BookOpen size={14} />}>
          {stats.genreRows.length > 0 ? (
            <BarChart rows={stats.genreRows} />
          ) : (
            <p className="text-sm text-white/30">Henüz tür bilgisi girilmemiş.</p>
          )}
        </Section>

        {/* Puan dağılımı */}
        <Section title="Puan Dağılımı" icon={<Star size={14} />}>
          {stats.ratingRows.length > 0 ? (
            <BarChart rows={stats.ratingRows} accentVar="--theme-rating" />
          ) : (
            <p className="text-sm text-white/30">Henüz puanlanmış kitap yok.</p>
          )}
        </Section>
      </div>
    </div>
  );
};

export default StatsView;
