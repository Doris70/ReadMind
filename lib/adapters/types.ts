export type BookStatus = 'reading' | 'finished' | 'paused' | 'abandoned' | 'unstarted';

export type Category = '文学' | '心理' | '历史' | '社科' | '经济理财' | '小说' | '计算机';

export interface Book {
  id: string;
  sourceBookId?: string;
  title: string;
  author: string;
  coverUrl?: string;
  category: Category;
  status: BookStatus;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
  lastReadDate: string | null;
  dateSource: 'inferred' | 'manual' | 'real';
  progress: number; // 0-1
  readingSeconds: number;
  readingDays: number;
  highlightCount: number;
  thoughtCount: number;
  isPinned: boolean;
  deepLink?: string;
}

export interface Highlight {
  id: string;
  bookId: string;
  sourceBookId?: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookDeepLink?: string;
  chapter: string;
  content: string;
  thought?: string;
  createdAt: string;
  source: 'weread_personal' | 'weread_public';
  isFeatured: boolean;
  topicTags: string[];
}

export interface ReadingEvent {
  id: string;
  bookId: string;
  type: 'start' | 'resume' | 'pause' | 'finish';
  date: string;
}

export interface Recommendation {
  bookId: string;
  title: string;
  author: string;
  coverUrl?: string;
  deepLink?: string;
  description?: string;
  sourceBookId?: string;
  category: Category;
  reason: string;
  evidence: { type: 'topic' | 'book'; value: string }[];
  confidence: number;
  quote?: string;
}

export interface ReadingPersona {
  year: number;
  month?: number;
  period?: 'year' | 'month';
  name: string;
  description: string;
  topCategories: Category[];
  longestBook: string;
  topTopic: string;
  peakMonth: string;
  totalSeconds: number;
  finishedCount: number;
  highlightCount: number;
  representativeHighlight: string;
  suggestion: string;
  monthlyReadingSeconds?: number;
}

export interface UserData {
  userId: string;
  books: Book[];
  highlights: Highlight[];
  readingEvents: ReadingEvent[];
  recommendations: Recommendation[];
  personas: ReadingPersona[];
  lastSyncTime: string | null;
  source: 'demo' | 'weread' | 'manual';
}

export const CATEGORY_COLORS: Record<Category, string> = {
  '文学': '#9FC8BB',
  '心理': '#B9A8C5',
  '历史': '#D7C68C',
  '社科': '#93B8C6',
  '经济理财': '#A8BE8A',
  '小说': '#D6A49A',
  '计算机': '#86A99A',
};

export const STATUS_LABELS: Record<BookStatus, string> = {
  reading: '进行中',
  finished: '已读完',
  paused: '已暂停',
  abandoned: '已搁置',
  unstarted: '未开始',
};

export function formatReadingTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}分钟`;
  return `${hours}小时${minutes}分钟`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return dateStr;
}
