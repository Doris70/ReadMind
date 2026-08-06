'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock3, Filter, Leaf, Plus, SlidersHorizontal, X } from 'lucide-react';
import NavBar from '@/components/ui/NavBar';
import BookDetailDrawer from '@/components/book/BookDetailDrawer';
import {
  Book,
  BookStatus,
  CATEGORY_COLORS,
  Category,
  STATUS_LABELS,
  UserData,
  formatReadingTime,
} from '@/lib/adapters/types';
import { addStoredBook, loadUserData, recordBookOpened, removeStoredBook, updateStoredBook } from '@/lib/store';
import { generateRecommendations, selectRecommendationForBook } from '@/lib/ai';
import { getCategoryInsights, getReadingStats, parseLocalDate } from '@/lib/insights';

const ALL_CATEGORIES: Category[] = ['文学', '心理', '历史', '社科', '经济理财', '小说', '计算机'];
const PAGE_SIZE = 15;
type DurationFilter = 'all' | '1h' | '5h' | '10h';
type TimelineScale = 'year' | 'quarter' | 'month';
const DEMO_TODAY = new Date(2026, 7, 1);

function createEmptyBook(): Book {
  return {
    id: `manual_axis_${Date.now()}`,
    title: '',
    author: '',
    category: '文学',
    status: 'reading',
    startDate: localDateString(DEMO_TODAY),
    endDate: null,
    lastReadDate: localDateString(DEMO_TODAY),
    dateSource: 'manual',
    progress: 0.1,
    readingSeconds: 0,
    readingDays: 1,
    highlightCount: 0,
    thoughtCount: 0,
    isPinned: false,
  };
}

function getReadingDays(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
}

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTrackEndDate(book: Book, year: number, today = DEMO_TODAY): string | null {
  if (book.endDate) return book.endDate;
  if (book.status === 'reading') {
    return today.getFullYear() === year ? localDateString(today) : `${year}-12-31`;
  }
  return book.lastReadDate || book.startDate;
}

function getRange(year: number, scale: TimelineScale, books: Book[]) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  if (scale === 'year') return { start: yearStart, end: yearEnd };

  const anchor = books
    .map(book => parseLocalDate(book.lastReadDate || book.startDate))
    .filter((date): date is Date => date !== null && date.getFullYear() === year)
    .sort((a, b) => b.getTime() - a.getTime())[0] || new Date(year, scale === 'quarter' ? 6 : 0, 1);

  if (scale === 'quarter') {
    const quarterStartMonth = Math.floor(anchor.getMonth() / 3) * 3;
    return { start: new Date(year, quarterStartMonth, 1), end: new Date(year, quarterStartMonth + 3, 0) };
  }
  return { start: new Date(year, anchor.getMonth(), 1), end: new Date(year, anchor.getMonth() + 1, 0) };
}

function bookOverlapsRange(book: Book, year: number, range: { start: Date; end: Date }): boolean {
  const start = parseLocalDate(book.startDate || book.lastReadDate);
  const end = parseLocalDate(getTrackEndDate(book, year));
  return Boolean(start && end && start <= range.end && end >= range.start);
}

function getAxisLabels(range: { start: Date; end: Date }, scale: TimelineScale) {
  if (scale === 'year') {
    return Array.from({ length: 12 }, (_, index) => ({
      label: `${index + 1}月`,
      position: (index / 12) * 100,
    }));
  }
  if (scale === 'quarter') {
    return Array.from({ length: 3 }, (_, index) => {
      const date = new Date(range.start.getFullYear(), range.start.getMonth() + index, 1);
      const offset = (date.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime());
      return { label: `${date.getMonth() + 1}月`, position: offset * 100 };
    });
  }
  const totalDays = range.end.getDate();
  return [1, 8, 15, 22, totalDays].filter((day, index, array) => array.indexOf(day) === index).map(day => ({
    label: `${day}日`,
    position: ((day - 1) / totalDays) * 100,
  }));
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="min-h-screen px-6 py-20 text-center text-sm text-ink-soft">正在展开书迹轴...</div>}>
      <TimelineContent />
    </Suspense>
  );
}

function TimelineContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<UserData | null>(null);
  const [year, setYear] = useState(2026);
  const [scale, setScale] = useState<TimelineScale>('year');
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [onlyUnfinished, setOnlyUnfinished] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [hoveredBook, setHoveredBook] = useState<Book | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showAddBook, setShowAddBook] = useState(false);
  const [newBook, setNewBook] = useState<Book>(createEmptyBook);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const stored = loadUserData();
    if (stored) setData(stored);
    const bookId = searchParams.get('book');
    if (bookId && stored) {
      const book = stored.books.find(item => item.id === bookId);
      if (book) setSelectedBook(book);
    }
  }, [searchParams]);

  const years = useMemo(() => {
    if (!data) return [2026];
    const allYears = data.books
      .flatMap(book => [book.startDate, book.lastReadDate, book.endDate])
      .map(date => parseLocalDate(date)?.getFullYear())
      .filter((value): value is number => Boolean(value));
    const min = Math.min(...allYears, 2024);
    const max = Math.max(...allYears, 2026);
    return Array.from({ length: max - min + 1 }, (_, index) => max - index);
  }, [data]);

  const yearBooks = useMemo(() => {
    if (!data) return [];
    return data.books.filter(book => {
      const start = parseLocalDate(book.startDate || book.lastReadDate);
      const end = parseLocalDate(getTrackEndDate(book, year));
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      return Boolean(start && end && start <= yearEnd && end >= yearStart);
    });
  }, [data, year]);

  const range = useMemo(() => getRange(year, scale, yearBooks), [year, scale, yearBooks]);

  const filteredBooks = useMemo(() => {
    return yearBooks
      .filter(book => {
        if (book.status === 'unstarted' && statusFilter === 'all') return false;
        if (!bookOverlapsRange(book, year, range)) return false;
        if (statusFilter !== 'all' && book.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && book.category !== categoryFilter) return false;
        if (onlyUnfinished && book.status === 'finished') return false;
        if (durationFilter === '1h' && book.readingSeconds < 3600) return false;
        if (durationFilter === '5h' && book.readingSeconds < 18000) return false;
        if (durationFilter === '10h' && book.readingSeconds < 36000) return false;
        return true;
      })
      .sort((a, b) => (b.lastReadDate || '').localeCompare(a.lastReadDate || ''));
  }, [yearBooks, year, range, statusFilter, categoryFilter, durationFilter, onlyUnfinished]);

  useEffect(() => {
    setCurrentPage(1);
  }, [year, scale, statusFilter, categoryFilter, durationFilter, onlyUnfinished]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paginatedBooks = filteredBooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const axisLabels = getAxisLabels(range, scale);
  const rangeDuration = range.end.getTime() - range.start.getTime();
  const categoryInsights = getCategoryInsights(paginatedBooks);
  const stats = getReadingStats(paginatedBooks);
  const nextRecommendation = data ? generateRecommendations(data)[0] || null : null;
  const selectedBookRecommendation = data && selectedBook ? selectRecommendationForBook(selectedBook, data) : nextRecommendation;

  if (!data) return null;

  const getDateX = (dateString: string | null) => {
    const date = parseLocalDate(dateString);
    if (!date) return 0;
    if (date <= range.start) return 0;
    if (date >= range.end) return 100;
    return ((date.getTime() - range.start.getTime()) / rangeDuration) * 100;
  };

  const getNodeSize = (book: Book) => 14 + Math.min(book.readingSeconds / 3600, 10) + Math.min(book.highlightCount / 6, 6);

  const openBook = (book: Book) => {
    recordBookOpened(book.id);
    setSelectedBook(book);
  };

  const updateBook = (book: Book) => {
    const next = updateStoredBook(book);
    if (next) {
      setData(next);
      setSelectedBook(book);
    }
  };

  const deleteBook = (bookId: string) => {
    const next = removeStoredBook(bookId);
    if (next) setData(next);
    setSelectedBook(null);
  };

  const saveNewBook = () => {
    if (!newBook.title.trim()) return;
    const end = newBook.endDate || newBook.lastReadDate || newBook.startDate;
    const book = {
      ...newBook,
      id: `manual_axis_${Date.now()}`,
      title: newBook.title.trim(),
      author: newBook.author.trim() || '未知作者',
      endDate: newBook.endDate || null,
      lastReadDate: newBook.lastReadDate || end,
      readingDays: getReadingDays(newBook.startDate, newBook.endDate || newBook.lastReadDate || newBook.startDate),
      progress: newBook.status === 'finished' ? 1 : newBook.progress,
    };
    const next = addStoredBook(book);
    if (next) {
      setData(next);
      setSelectedBook(book);
      setNewBook(createEmptyBook());
      setShowAddBook(false);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-[1280px] px-5 pb-16 pt-8 sm:px-8">
        <header className="mb-8 flex flex-col justify-between gap-6 border-b border-line-soft/40 pb-8 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="ink-label">READMIND / TIMELINE</span>
              <span className="text-xs text-ink-soft">一条共享时间轴，多条书籍轨道</span>
            </div>
            <h1 className="mt-4 text-4xl text-ink-deep sm:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>书迹轴</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-ink-soft">把开始、停留、中断和抵达放回同一段时间里，看看哪些书仍然在你的路上。</p>
          </div>
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <p className="text-[11px] text-ink-soft">当前年度</p>
              <p className="mt-1 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{year}</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-soft">可见书目</p>
              <p className="mt-1 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{filteredBooks.length}</p>
            </div>
            <button onClick={() => setShowAddBook(true)} className="inline-flex items-center gap-2 bg-ink-deep px-4 py-2.5 text-sm text-white hover:bg-ink-deep/90">
              <Plus className="h-4 w-4" /> 添加书目
            </button>
          </div>
        </header>

        <section className="border-y border-line-soft/35 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 border border-line-soft/45 bg-paper-warm p-1">
              <button
                onClick={() => setYear(value => Math.max(years[years.length - 1] || value - 1, value - 1))}
                className="icon-button border-0"
                title="上一年"
                aria-label="上一年"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-16 text-center text-sm text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{year}</span>
              <button
                onClick={() => setYear(value => Math.min(years[0] || value + 1, value + 1))}
                className="icon-button border-0"
                title="下一年"
                aria-label="下一年"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="inline-flex items-center gap-1 border border-line-soft/45 bg-paper-warm p-1">
              {(['year', 'quarter', 'month'] as TimelineScale[]).map(option => (
                <button
                  key={option}
                  onClick={() => setScale(option)}
                  className={`px-3 py-2 text-xs transition-colors ${scale === option ? 'bg-ink-deep text-white' : 'text-ink-soft hover:text-ink-deep'}`}
                >
                  {option === 'year' ? '全年' : option === 'quarter' ? '季度' : '月份'}
                </button>
              ))}
            </div>
            <div className="ml-auto inline-flex items-center gap-2 text-xs text-ink-soft">
              <SlidersHorizontal className="h-3.5 w-3.5" /> 轨迹筛选
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs">
            <div className="inline-flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-ink-soft" />
              <span className="text-ink-soft">状态</span>
              {(['all', 'reading', 'finished', 'paused', 'abandoned', 'unstarted'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setStatusFilter(option)}
                  className={`border-b-2 px-1 py-1 transition-colors ${statusFilter === option ? 'border-ink-deep text-ink-deep' : 'border-transparent text-ink-soft hover:text-ink-deep'}`}
                >
                  {option === 'all' ? '全部' : STATUS_LABELS[option]}
                </button>
              ))}
            </div>
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="text-ink-soft">类别</span>
              <button
                onClick={() => setCategoryFilter('all')}
                className={`inline-flex items-center gap-1.5 border-b-2 px-1 py-1 transition-colors ${categoryFilter === 'all' ? 'border-ink-deep text-ink-deep' : 'border-transparent text-ink-soft hover:text-ink-deep'}`}
              >
                <span className="h-2 w-2 rounded-full bg-ink-soft/45" /> 全部
              </button>
              {ALL_CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(categoryFilter === category ? 'all' : category)}
                  className={`inline-flex items-center gap-1.5 border-b-2 px-1 py-1 transition-colors ${categoryFilter === category ? 'border-ink-deep text-ink-deep' : 'border-transparent text-ink-soft hover:text-ink-deep'}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
                  {category}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center gap-2">
              <Clock3 className="h-3.5 w-3.5 text-ink-soft" />
              <span className="text-ink-soft">时长</span>
              {([
                ['all', '不限'],
                ['1h', '> 1 小时'],
                ['5h', '> 5 小时'],
                ['10h', '> 10 小时'],
              ] as [DurationFilter, string][]).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setDurationFilter(value)}
                  className={`border-b-2 px-1 py-1 transition-colors ${durationFilter === value ? 'border-ink-deep text-ink-deep' : 'border-transparent text-ink-soft hover:text-ink-deep'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setOnlyUnfinished(value => !value)}
              className={`border-b-2 px-1 py-1 transition-colors ${onlyUnfinished ? 'border-dust-rose text-dust-rose' : 'border-transparent text-ink-soft hover:text-ink-deep'}`}
            >
              {onlyUnfinished ? '只看未完成 · 开' : '只看未完成'}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-line-soft/25 pt-4 text-[11px] text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-sprout-green bg-sprout-green" /> 实心土豆：已开始阅读
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-line-soft border-dashed" /> 空心土豆：未开始或收藏
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-px w-5 bg-line-soft" /> 细线：阅读持续时间
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-[48%_52%_43%_57%] bg-ink-soft/30" /> 土豆越大：阅读时长和划线越多
            </span>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="ink-label">{scale === 'year' ? 'YEAR VIEW' : scale === 'quarter' ? 'QUARTER VIEW' : 'MONTH VIEW'}</span>
              <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>
                {range.start.getFullYear()} · {scale === 'year' ? '全年阅读轨迹' : scale === 'quarter' ? `${Math.floor(range.start.getMonth() / 3) + 1}季度 · ${range.start.getMonth() + 1}-${range.end.getMonth() + 1}月` : `${range.start.getMonth() + 1}月的阅读轨迹`}
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink-soft">
              <span>点击土豆，打开书籍档案</span>
              {filteredBooks.length > PAGE_SIZE && (
                <span style={{ fontFamily: 'var(--font-number)' }}>
                  第 {page} / {totalPages} 页
                </span>
              )}
            </div>
          </div>

          <div className="mt-7 overflow-x-auto border-y border-line-soft/30 bg-paper-light/35 px-2 py-4 pb-2">
            <div className="min-w-[760px]">
              <div className="ml-[148px] mr-[74px] relative h-8 border-b border-line-soft/45">
                {axisLabels.map(label => (
                  <span key={`${label.label}-${label.position}`} className="absolute bottom-2 text-[10px] text-ink-soft/75" style={{ left: `${label.position}%`, fontFamily: 'var(--font-number)' }}>
                    {label.label}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                {paginatedBooks.map(book => {
                  const startX = getDateX(book.startDate || book.lastReadDate);
                  const endX = getDateX(getTrackEndDate(book, year));
                  const nodeSize = getNodeSize(book);
                  const color = CATEGORY_COLORS[book.category];
                  const isHovered = hoveredBook?.id === book.id;
                  return (
                    <div key={book.id} className="group flex min-h-12 items-center gap-3">
                      <button onClick={() => openBook(book)} className="flex w-32 shrink-0 items-center justify-end gap-2 text-right">
                        <span className="hidden h-2 w-2 rounded-full sm:block" style={{ backgroundColor: color }} />
                        <span className="block max-w-28 truncate text-xs text-ink-deep transition-colors group-hover:text-sprout-green">{book.title}</span>
                      </button>
                      <div className="relative h-12 flex-1">
                        <div className="absolute inset-x-0 top-1/2 h-px bg-line-soft/25" />
                        <div
                          className="absolute top-1/2 h-0.5 -translate-y-1/2 transition-opacity"
                          style={{
                            left: `${startX}%`,
                            width: `${Math.max(endX - startX, 0)}%`,
                            backgroundColor: color,
                            opacity: book.status === 'abandoned' ? 0.25 : 0.7,
                          }}
                        />
                        {book.status === 'paused' && (
                          <span className="absolute top-1/2 h-3 w-8 -translate-x-1/2 -translate-y-1/2 border-y border-dashed" style={{ left: `${(startX + endX) / 2}%`, borderColor: color }} />
                        )}
                        <button
                          onClick={() => openBook(book)}
                          onMouseEnter={event => {
                            setHoveredBook(book);
                            setTooltipPos({ x: event.clientX, y: event.clientY });
                          }}
                          onMouseLeave={() => setHoveredBook(null)}
                          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125"
                          style={{
                            left: `${startX}%`,
                            width: nodeSize,
                            height: nodeSize,
                            backgroundColor: book.status === 'unstarted' ? 'transparent' : color,
                            border: `2px ${book.status === 'unstarted' ? 'dashed' : 'solid'} ${color}`,
                            borderRadius: '46% 54% 52% 48%',
                            opacity: book.status === 'abandoned' ? 0.42 : 1,
                            boxShadow: isHovered ? `0 0 0 5px ${color}25` : undefined,
                          }}
                          aria-label={`打开《${book.title}》`}
                        >
                          {book.status === 'finished' && <Leaf className="absolute -right-3 -top-3 h-4 w-4 -rotate-12 text-moss-green" />}
                        </button>
                        {book.endDate && (
                          <button
                            onClick={() => openBook(book)}
                            className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-transform hover:scale-125"
                            style={{ left: `${endX}%`, width: nodeSize * 0.74, height: nodeSize * 0.74, backgroundColor: color, borderColor: color, opacity: 0.78 }}
                            aria-label={`打开《${book.title}》结束节点`}
                          />
                        )}
                        {book.status === 'reading' && !book.endDate && <span className="absolute top-1/2 -translate-y-1/2 text-xs text-sprout-green" style={{ left: `${Math.min(endX + 1, 98)}%` }}>→</span>}
                      </div>
                      <span className="w-16 shrink-0 text-right text-[10px] text-ink-soft">{STATUS_LABELS[book.status]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {filteredBooks.length === 0 && <p className="border-l-2 border-line-soft px-4 py-8 text-sm text-ink-soft">这个筛选范围里还没有书迹。</p>}
          {filteredBooks.length > PAGE_SIZE && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-line-soft/25 pb-4">
              <p className="text-xs text-ink-soft">
                每页 15 本 · 当前显示第 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredBooks.length)} 本，共 {filteredBooks.length} 本
              </p>
              <div className="inline-flex items-center gap-1 border border-line-soft/45 bg-paper-warm p-1">
                <button
                  onClick={() => setCurrentPage(value => Math.max(1, value - 1))}
                  disabled={page <= 1}
                  className="icon-button border-0 disabled:cursor-not-allowed disabled:opacity-35"
                  title="上一页"
                  aria-label="上一页"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`min-w-8 px-2 py-1.5 text-xs transition-colors ${page === pageNumber ? 'bg-ink-deep text-white' : 'text-ink-soft hover:text-ink-deep'}`}
                    aria-label={`第 ${pageNumber} 页`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(value => Math.min(totalPages, value + 1))}
                  disabled={page >= totalPages}
                  className="icon-button border-0 disabled:cursor-not-allowed disabled:opacity-35"
                  title="下一页"
                  aria-label="下一页"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
          <div className="section-rule pt-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="ink-label">READING DISTRIBUTION</span>
                <h2 className="mt-2 text-xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>阅读类型分布</h2>
              </div>
              <span className="text-xs text-ink-soft">{categoryInsights.length} 个类别</span>
            </div>
            <div className="mt-6 space-y-4">
              {categoryInsights.map(item => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-deep">{item.category}</span>
                    <span className="text-ink-soft">{item.count} 本 · {formatReadingTime(item.seconds)}</span>
                  </div>
                  <div className="mt-2 h-2 bg-line-soft/25">
                    <div className="h-full" style={{ width: `${Math.max(item.percentage, 5)}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="section-rule pt-7">
            <span className="ink-label">YEAR SUMMARY</span>
            <h2 className="mt-2 text-xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>这一页的阅读摘要</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
              {[
                ['可见书籍', `${stats.books.length} 本`],
                ['阅读时长', formatReadingTime(stats.totalSeconds)],
                ['读完', `${stats.finishedCount} 本`],
                ['未完成', `${stats.readingCount + stats.pausedCount} 本`],
                ['阅读天数', `${stats.totalDays} 天`],
                ['划线数量', `${stats.highlightCount} 条`],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] text-ink-soft">{label}</p>
                  <p className="mt-1 text-base text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {hoveredBook && (
        <div className="pointer-events-none fixed z-40 border border-line-soft/40 bg-paper-warm px-3 py-2 shadow-sm" style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 48 }}>
          <p className="text-sm text-ink-deep">{hoveredBook.title}</p>
          <p className="mt-1 text-[11px] text-ink-soft">{STATUS_LABELS[hoveredBook.status]} · {formatReadingTime(hoveredBook.readingSeconds)}</p>
        </div>
      )}

      {selectedBook && (
        <BookDetailDrawer
          book={selectedBook}
          highlights={data.highlights.filter(highlight => highlight.bookId === selectedBook.id)}
          nextRecommendation={selectedBookRecommendation}
          onBookUpdate={updateBook}
          onBookDelete={deleteBook}
          onClose={() => setSelectedBook(null)}
        />
      )}

      {showAddBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/20 p-5 backdrop-blur-[2px]" onClick={() => setShowAddBook(false)}>
          <div className="w-full max-w-2xl bg-paper-warm p-6 shadow-[0_20px_60px_rgba(38,59,53,0.18)]" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-line-soft/35 pb-4">
              <div>
                <span className="ink-label">ADD TO TIMELINE</span>
                <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>添加到书迹轴</h2>
              </div>
              <button className="icon-button" onClick={() => setShowAddBook(false)} aria-label="关闭添加书目">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input value={newBook.title} onChange={event => setNewBook(book => ({ ...book, title: event.target.value }))} placeholder="书名" className="border border-line-soft bg-paper-light px-3 py-2 text-sm outline-none focus:border-sprout-green" />
              <input value={newBook.author} onChange={event => setNewBook(book => ({ ...book, author: event.target.value }))} placeholder="作者" className="border border-line-soft bg-paper-light px-3 py-2 text-sm outline-none focus:border-sprout-green" />
              <select value={newBook.category} onChange={event => setNewBook(book => ({ ...book, category: event.target.value as Category }))} className="border border-line-soft bg-paper-light px-3 py-2 text-sm outline-none focus:border-sprout-green">
                {ALL_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
              <select value={newBook.status} onChange={event => setNewBook(book => ({ ...book, status: event.target.value as BookStatus, progress: event.target.value === 'finished' ? 1 : book.progress }))} className="border border-line-soft bg-paper-light px-3 py-2 text-sm outline-none focus:border-sprout-green">
                {(['reading', 'finished', 'paused', 'abandoned', 'unstarted'] as BookStatus[]).map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
              </select>
              <label className="text-xs text-ink-soft">开始日期
                <input type="date" value={newBook.startDate || ''} onChange={event => setNewBook(book => ({ ...book, startDate: event.target.value || null }))} className="mt-1 w-full border border-line-soft bg-paper-light px-3 py-2 text-sm text-ink-deep outline-none focus:border-sprout-green" />
              </label>
              <label className="text-xs text-ink-soft">结束日期
                <input type="date" value={newBook.endDate || ''} onChange={event => setNewBook(book => ({ ...book, endDate: event.target.value || null }))} className="mt-1 w-full border border-line-soft bg-paper-light px-3 py-2 text-sm text-ink-deep outline-none focus:border-sprout-green" />
              </label>
              <label className="text-xs text-ink-soft">阅读时长（小时）
                <input type="number" min="0" step="0.5" value={Math.round(newBook.readingSeconds / 1800) / 2} onChange={event => setNewBook(book => ({ ...book, readingSeconds: Math.round(Number(event.target.value || 0) * 3600) }))} className="mt-1 w-full border border-line-soft bg-paper-light px-3 py-2 text-sm text-ink-deep outline-none focus:border-sprout-green" />
              </label>
              <label className="text-xs text-ink-soft">阅读进度
                <input type="range" min="0" max="100" value={Math.round(newBook.progress * 100)} onChange={event => setNewBook(book => ({ ...book, progress: Number(event.target.value) / 100 }))} className="mt-4 w-full accent-sprout-green" />
              </label>
            </div>
            <button onClick={saveNewBook} className="mt-6 w-full bg-sprout-green px-4 py-3 text-sm font-medium text-white hover:bg-sprout-green/90">保存并加入书迹轴</button>
          </div>
        </div>
      )}
    </div>
  );
}
