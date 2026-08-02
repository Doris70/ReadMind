'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock3, Leaf, Quote } from 'lucide-react';
import NavBar from '@/components/ui/NavBar';
import DailyQuoteCard from '@/components/home/DailyQuoteCard';
import BookDetailDrawer from '@/components/book/BookDetailDrawer';
import HighlightQuote from '@/components/insights/HighlightQuote';
import BookCover from '@/components/ui/BookCover';
import { Book, Highlight, CATEGORY_COLORS, formatReadingTime, UserData } from '@/lib/adapters/types';
import { loadRecentOpenedBooks, loadUserData, recordBookOpened, updateStoredBook } from '@/lib/store';
import { selectDailyQuote, selectRecommendationForBook } from '@/lib/ai';
import { getCategoryInsights, getReadingStats, getTopHighlights } from '@/lib/insights';

function getHomeMonthStats(data: UserData) {
  if (data.source === 'demo') {
    return { totalSeconds: 34920, totalDays: 24 };
  }
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return getReadingStats(data.books.filter(book => book.lastReadDate?.startsWith(monthKey)));
}

export default function HomePage() {
  const [data, setData] = useState<UserData | null>(null);
  const [dailyQuote, setDailyQuote] = useState<Highlight | null>(null);
  const [quoteBook, setQuoteBook] = useState<Book | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [recentOpenedMap, setRecentOpenedMap] = useState<Record<string, string>>({});
  const [todayLabel, setTodayLabel] = useState('');

  useEffect(() => {
    const updateTodayLabel = () => {
      const now = new Date();
      setTodayLabel(`${now.getFullYear()} · ${String(now.getMonth() + 1).padStart(2, '0')} · ${String(now.getDate()).padStart(2, '0')}`);
    };

    updateTodayLabel();
    const interval = window.setInterval(updateTodayLabel, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const refreshData = useCallback(() => {
    const stored = loadUserData();
    if (!stored) {
      window.location.assign('/setup');
      return;
    }
    setData(stored);
    setRecentOpenedMap(Object.fromEntries(loadRecentOpenedBooks().map(item => [item.bookId, item.openedAt])));
    const quote = selectDailyQuote(stored.highlights);
    setDailyQuote(quote);
    setQuoteBook(quote ? stored.books.find(book => book.id === quote.bookId) || null : null);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const onDataChange = () => refreshData();
    window.addEventListener('readmind-data-updated', onDataChange);
    window.addEventListener('readmind-recent-opened-updated', onDataChange);
    window.addEventListener('focus', onDataChange);
    return () => {
      window.removeEventListener('readmind-data-updated', onDataChange);
      window.removeEventListener('readmind-recent-opened-updated', onDataChange);
      window.removeEventListener('focus', onDataChange);
    };
  }, [refreshData]);

  const readingBooks = useMemo(() => {
    if (!data) return [];
    return data.books
      .filter(book => book.status === 'reading')
      .sort((a, b) => b.progress - a.progress || (b.lastReadDate || '').localeCompare(a.lastReadDate || ''));
  }, [data]);

  const recentBooks = useMemo(() => {
    if (!data) return [];
    return [...data.books]
      .filter(book => book.status !== 'unstarted')
      .sort((a, b) => {
        const opened = (recentOpenedMap[b.id] || '').localeCompare(recentOpenedMap[a.id] || '');
        return opened || (b.lastReadDate || '').localeCompare(a.lastReadDate || '');
      })
      .slice(0, 6);
  }, [data, recentOpenedMap]);

  if (!data) return null;

  const monthStats = getHomeMonthStats(data);
  const allStats = getReadingStats(data.books.filter(book => book.status !== 'unstarted'));
  const categoryInsights = getCategoryInsights(data.books.filter(book => book.status !== 'unstarted')).slice(0, 3);
  const topHighlights = getTopHighlights(data.highlights, 3);
  const selectedBookRecommendation = selectedBook ? selectRecommendationForBook(selectedBook, data) : null;
  const primaryBook = readingBooks[0] || recentBooks[0] || null;

  const refreshQuote = () => {
    const candidates = data.highlights.length > 0 ? data.highlights : [];
    if (candidates.length === 0) return;
    const currentIndex = candidates.findIndex(highlight => highlight.id === dailyQuote?.id);
    const next = candidates[(currentIndex + 1) % candidates.length];
    setDailyQuote(next);
    setQuoteBook(data.books.find(book => book.id === next.bookId) || null);
  };

  const openBook = (book: Book) => {
    recordBookOpened(book.id);
    setSelectedBook(book);
    setRecentOpenedMap(Object.fromEntries(loadRecentOpenedBooks().map(item => [item.bookId, item.openedAt])));
  };

  const updateBook = (book: Book) => {
    const next = updateStoredBook(book);
    if (next) {
      setData(next);
      setSelectedBook(book);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-[1280px] px-5 pb-16 pt-8 sm:px-8">
        <header className="mb-8 flex flex-col justify-between gap-6 border-b border-line-soft/40 pb-8 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="ink-label">READMIND / TODAY</span>
              <span className="text-xs text-ink-soft">{todayLabel}</span>
            </div>
            <h1 className="mt-4 max-w-2xl text-4xl leading-tight text-ink-deep sm:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
              今天，哪一句话正在发芽？
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-ink-soft">
              把最近的阅读痕迹重新放到眼前。这里不催你读完，只提醒你下一次可以从哪里继续。
            </p>
          </div>
          <div className="flex items-end gap-7 lg:pb-1">
            <div>
              <p className="text-[11px] text-ink-soft">本月阅读</p>
              <p className="mt-1 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{formatReadingTime(monthStats.totalSeconds)}</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-soft">正在读</p>
              <p className="mt-1 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{readingBooks.length}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.7fr)]">
          <DailyQuoteCard highlight={dailyQuote} book={quoteBook} onRefresh={refreshQuote} />
          <aside className="border-y border-line-soft/35 py-6">
            <span className="ink-label">RESTART READING</span>
            <h2 className="mt-3 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>从一本书继续</h2>
            {primaryBook ? (
              <button className="mt-6 flex w-full items-start gap-4 text-left group" onClick={() => openBook(primaryBook)}>
                <BookCover book={primaryBook} size="md" className="transition-transform group-hover:-translate-y-1" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-ink-deep">{primaryBook.title}</span>
                  <span className="mt-1 block text-xs text-ink-soft">{primaryBook.author}</span>
                  <span className="mt-4 block text-xs text-ink-soft">{Math.round(primaryBook.progress * 100)}% 已读</span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line-soft/35">
                    <span className="block h-full rounded-full bg-sprout-green" style={{ width: `${primaryBook.progress * 100}%` }} />
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs text-ink-deep">
                    打开阅读档案 <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </span>
              </button>
            ) : (
              <p className="mt-6 text-sm leading-7 text-ink-soft">还没有进行中的阅读，去发现页找一本新的入口。</p>
            )}
            <div className="mt-8 grid grid-cols-2 border-t border-line-soft/30 pt-4">
              <div>
                <p className="text-[11px] text-ink-soft">本月阅读天数</p>
                <p className="mt-1 text-lg text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{monthStats.totalDays} 天</p>
              </div>
              <div>
                <p className="text-[11px] text-ink-soft">累计划线</p>
                <p className="mt-1 text-lg text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{allStats.highlightCount} 条</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-rule mt-14 pt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="ink-label">IN PROGRESS</span>
              <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>还在路上的书</h2>
            </div>
            <Link href="/timeline" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink-deep">
              查看完整书迹轴 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {readingBooks.length > 0 ? (
            <div className="mt-6 flex gap-6 overflow-x-auto pb-3">
              {readingBooks.map(book => (
                <button key={book.id} onClick={() => openBook(book)} className="group w-28 shrink-0 text-left">
                  <BookCover book={book} size="lg" className="h-36 w-24 transition-transform group-hover:-translate-y-1" />
                  <span className="mt-3 block truncate text-sm text-ink-deep">{book.title}</span>
                  <span className="mt-1 block text-[11px] text-ink-soft">{book.author}</span>
                  <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-line-soft/35">
                    <span className="block h-full rounded-full bg-sprout-green" style={{ width: `${book.progress * 100}%` }} />
                  </span>
                  <span className="mt-1 block text-[11px] text-ink-soft" style={{ fontFamily: 'var(--font-number)' }}>{Math.round(book.progress * 100)}%</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-6 border-l-2 border-line-soft px-4 py-3 text-sm text-ink-soft">当前没有进行中的书。</p>
          )}
        </section>

        <section className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <div className="section-rule pt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="ink-label">RECENT TRACE</span>
                <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>最近的书迹</h2>
              </div>
              <span className="text-xs text-ink-soft">按最近点开排序</span>
            </div>
            <div className="mt-8 space-y-5">
              {recentBooks.map((book, index) => (
                <button key={book.id} onClick={() => openBook(book)} className="group flex w-full items-center gap-4 text-left">
                  <span className="relative flex w-8 shrink-0 justify-center">
                    {index < recentBooks.length - 1 && <span className="absolute left-1/2 top-5 h-12 w-px -translate-x-1/2 bg-line-soft/60" />}
                    <span
                      className="relative z-10 h-3 w-3 rounded-full border-2 bg-paper-mist transition-transform group-hover:scale-150"
                      style={{ borderColor: CATEGORY_COLORS[book.category], backgroundColor: book.status === 'finished' ? CATEGORY_COLORS[book.category] : undefined }}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink-deep">{book.title}</span>
                    <span className="mt-1 block text-xs text-ink-soft">{book.author} · {book.lastReadDate || '时间未知'}</span>
                  </span>
                  <span className="hidden text-right sm:block">
                    <span className="block text-xs text-ink-soft">{book.category}</span>
                    <span className="mt-1 block text-[11px] text-ink-soft">{formatReadingTime(book.readingSeconds)}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-line-soft transition-transform group-hover:translate-x-1 group-hover:text-ink-deep" />
                </button>
              ))}
            </div>
          </div>

          <div className="section-rule pt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="ink-label">LINES TO KEEP</span>
                <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>最近值得回看的句子</h2>
              </div>
              <Quote className="h-5 w-5 text-sun-yellow" />
            </div>
            <div className="mt-6 space-y-4">
              {topHighlights.slice(0, 2).map(highlight => (
                <HighlightQuote key={highlight.id} highlight={highlight} book={data.books.find(book => book.id === highlight.bookId)} compact />
              ))}
            </div>
          </div>
        </section>

        <section className="section-rule mt-14 pt-8">
          <div className="grid grid-cols-2 divide-x divide-line-soft/40 border-y border-line-soft/30 sm:grid-cols-4">
            {[
              { label: '本月阅读', value: formatReadingTime(monthStats.totalSeconds), icon: Clock3 },
              { label: '读完作品', value: `${allStats.finishedCount} 本`, icon: BookOpen },
              { label: '累计划线', value: `${allStats.highlightCount} 条`, icon: Quote },
              { label: '阅读类别', value: `${categoryInsights.length} 类`, icon: Leaf },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="px-4 py-5 sm:px-6">
                  <Icon className="h-4 w-4 text-sprout-green" />
                  <p className="mt-3 text-[11px] text-ink-soft">{item.label}</p>
                  <p className="mt-1 text-lg text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{item.value}</p>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {selectedBook && (
        <BookDetailDrawer
          book={selectedBook}
          highlights={data.highlights.filter(highlight => highlight.bookId === selectedBook.id)}
          nextRecommendation={selectedBookRecommendation}
          onBookUpdate={updateBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </div>
  );
}
