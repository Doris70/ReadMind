import { Book, Category, Highlight, UserData, CATEGORY_COLORS } from './adapters/types';

export interface CategoryInsight {
  category: Category;
  count: number;
  seconds: number;
  percentage: number;
  color: string;
}

export interface ReadingStats {
  books: Book[];
  totalSeconds: number;
  totalDays: number;
  finishedCount: number;
  pausedCount: number;
  readingCount: number;
  highlightCount: number;
  thoughtCount: number;
}

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function getYearBooks(data: UserData, year: number): Book[] {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  return data.books.filter(book => {
    if (book.status === 'unstarted') return false;
    const start = parseLocalDate(book.startDate || book.lastReadDate);
    const end = parseLocalDate(book.endDate || book.lastReadDate) || new Date();
    if (!start) return false;
    return start <= yearEnd && end >= yearStart;
  });
}

export function getMonthBooks(data: UserData, year: number, month: number): Book[] {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  return data.books.filter(book => {
    if (book.status === 'unstarted') return false;
    const start = parseLocalDate(book.startDate || book.lastReadDate);
    const end = parseLocalDate(book.endDate || book.lastReadDate) || new Date();
    if (!start) return false;
    return start <= monthEnd && end >= monthStart;
  });
}

export function getMonthLabel(month: number): string {
  return MONTHS[month - 1] || `${month}月`;
}

export function getReadingStats(books: Book[]): ReadingStats {
  return {
    books,
    totalSeconds: books.reduce((sum, book) => sum + book.readingSeconds, 0),
    totalDays: books.reduce((sum, book) => sum + book.readingDays, 0),
    finishedCount: books.filter(book => book.status === 'finished').length,
    pausedCount: books.filter(book => book.status === 'paused' || book.status === 'abandoned').length,
    readingCount: books.filter(book => book.status === 'reading').length,
    highlightCount: books.reduce((sum, book) => sum + book.highlightCount, 0),
    thoughtCount: books.reduce((sum, book) => sum + book.thoughtCount, 0),
  };
}

export function getCategoryInsights(books: Book[]): CategoryInsight[] {
  const counts = new Map<Category, { count: number; seconds: number }>();
  books.forEach(book => {
    const current = counts.get(book.category) || { count: 0, seconds: 0 };
    counts.set(book.category, {
      count: current.count + 1,
      seconds: current.seconds + book.readingSeconds,
    });
  });

  const total = books.length || 1;
  return Array.from(counts.entries())
    .map(([category, value]) => ({
      category,
      count: value.count,
      seconds: value.seconds,
      percentage: Math.round((value.count / total) * 100),
      color: CATEGORY_COLORS[category],
    }))
    .sort((a, b) => b.seconds - a.seconds || b.count - a.count);
}

export function getBookHighlights(highlights: Highlight[], bookId: string): Highlight[] {
  return highlights
    .filter(highlight => highlight.bookId === bookId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getHighlightScore(highlight: Highlight): number {
  return (highlight.isFeatured ? 5 : 0)
    + (highlight.thought ? 3 : 0)
    + (highlight.source === 'weread_personal' ? 1 : 0)
    + (highlight.content.length < 90 ? 1 : 0);
}

export function getTopHighlights(highlights: Highlight[], limit = 5): Highlight[] {
  return [...highlights]
    .sort((a, b) => getHighlightScore(b) - getHighlightScore(a) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getTopics(data: UserData, limit = 8): string[] {
  const counts = new Map<string, number>();
  data.highlights.forEach(highlight => {
    highlight.topicTags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1));
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function getReadingGaps(data: UserData): { label: string; detail: string; color: string }[] {
  const categoryInsights = getCategoryInsights(data.books.filter(book => book.status !== 'unstarted'));
  const seen = new Set(categoryInsights.map(item => item.category));
  const allCategories: Category[] = ['文学', '心理', '历史', '社科', '经济理财', '小说', '计算机'];
  const missing = allCategories.filter(category => !seen.has(category));

  if (missing.length > 0) {
    return missing.slice(0, 2).map(category => ({
      label: `${category}还没有留下足迹`,
      detail: '可以作为下一次阅读的轻微偏航，给地图留一个新入口。',
      color: CATEGORY_COLORS[category],
    }));
  }

  const lightest = [...categoryInsights].sort((a, b) => a.seconds - b.seconds)[0];
  if (!lightest) return [];
  return [{
    label: `${lightest.category}的阅读停留较少`,
    detail: '你的阅读重心很清晰，也可以偶尔为这个方向留出一小段时间。',
    color: lightest.color,
  }];
}

export function getPeakMonth(books: Book[]): string {
  const monthCounts = new Array(12).fill(0);
  books.forEach(book => {
    const date = parseLocalDate(book.lastReadDate || book.startDate);
    if (date) monthCounts[date.getMonth()] += Math.max(book.readingDays, 1);
  });
  const peak = monthCounts.indexOf(Math.max(...monthCounts));
  return peak >= 0 && monthCounts[peak] > 0 ? MONTHS[peak] : '—';
}

export function getPersonaEvidence(data: UserData, year: number): string[] {
  const books = getYearBooks(data, year);
  const stats = getReadingStats(books);
  const topics = getTopics({
    ...data,
    highlights: data.highlights.filter(highlight => {
      const book = books.find(item => item.id === highlight.bookId);
      return Boolean(book);
    }),
  }, 1);
  return [
    `打开过 ${books.length} 本书`,
    `累计阅读 ${stats.totalDays} 天`,
    topics[0] ? `反复关注「${topics[0]}」` : `留下 ${stats.highlightCount} 条划线`,
  ];
}

export function getMonthlyPersonaEvidence(data: UserData, year: number, month: number): string[] {
  const books = getMonthBooks(data, year, month);
  const stats = getReadingStats(books);
  const highlights = data.highlights.filter(highlight => {
    const date = parseLocalDate(highlight.createdAt);
    return Boolean(date && date.getFullYear() === year && date.getMonth() === month - 1);
  });
  const topics = getTopics({ ...data, highlights }, 1);
  return [
    `打开过 ${books.length} 本书`,
    `累计阅读 ${stats.totalDays} 天`,
    topics[0] ? `反复关注「${topics[0]}」` : `留下 ${highlights.length || stats.highlightCount} 条划线`,
  ];
}
