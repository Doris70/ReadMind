import { Book, UserData } from './adapters/types';

const STORAGE_KEY = 'readmind_data';
const USER_ID_KEY = 'readmind_user_id';
const RECENT_OPENED_KEY = 'readmind_recent_opened_books';
const RECOMMENDATION_FEEDBACK_KEY = 'readmind_recommendation_feedback';
const MANUAL_DRAFT_KEY = 'readmind_manual_books_draft';
const MANUAL_DATA_KEY = 'readmind_manual_data';
const WEREAD_DATA_KEY = 'readmind_weread_data';

export type RecentOpenedBook = {
  bookId: string;
  openedAt: string;
};

export type RecommendationFeedback = {
  bookId: string;
  reason: string;
  createdAt: string;
};

export function generateUserId(): string {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getUserId(): string {
  if (typeof window === 'undefined') return '';
  let uid = localStorage.getItem(USER_ID_KEY);
  if (!uid) {
    uid = generateUserId();
    localStorage.setItem(USER_ID_KEY, uid);
  }
  return uid;
}

export function saveUserData(data: UserData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // 派发自定义事件，通知其他组件数据已更新
  window.dispatchEvent(new CustomEvent('readmind-data-updated'));
}

export function loadUserData(): UserData | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

export function clearUserData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(RECENT_OPENED_KEY);
  localStorage.removeItem(RECOMMENDATION_FEEDBACK_KEY);
  localStorage.removeItem(MANUAL_DRAFT_KEY);
  localStorage.removeItem(MANUAL_DATA_KEY);
  localStorage.removeItem(WEREAD_DATA_KEY);
}

export function isManualBook(book: Book): boolean {
  return book.dateSource === 'manual' || book.id.startsWith('manual_') || book.id.startsWith('manual_axis_');
}

export function loadManualBooksDraft(): Book[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(MANUAL_DRAFT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Book[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveManualBooksDraft(books: Book[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MANUAL_DRAFT_KEY, JSON.stringify(books));
}

export function clearManualBooksDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MANUAL_DRAFT_KEY);
}

function loadStoredData(key: string): UserData | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

export function loadManualData(): UserData | null {
  return loadStoredData(MANUAL_DATA_KEY);
}

export function saveManualData(data: UserData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MANUAL_DATA_KEY, JSON.stringify(data));
}

export function loadWereadData(): UserData | null {
  return loadStoredData(WEREAD_DATA_KEY);
}

export function saveWereadData(data: UserData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WEREAD_DATA_KEY, JSON.stringify(data));
}

export function updateStoredBook(book: Book): UserData | null {
  const current = loadUserData();
  if (!current) return null;
  const next = {
    ...current,
    books: current.books.map(item => item.id === book.id ? book : item),
    lastSyncTime: new Date().toISOString(),
  };
  saveUserData(next);
  return next;
}

export function addStoredBook(book: Book): UserData | null {
  const current = loadUserData();
  if (!current) return null;
  const next = {
    ...current,
    books: [book, ...current.books],
    lastSyncTime: new Date().toISOString(),
  };
  saveUserData(next);
  return next;
}

export function hasData(): boolean {
  return loadUserData() !== null;
}

export function recordBookOpened(bookId: string): void {
  if (typeof window === 'undefined') return;
  const recent = loadRecentOpenedBooks().filter(item => item.bookId !== bookId);
  recent.unshift({ bookId, openedAt: new Date().toISOString() });
  localStorage.setItem(RECENT_OPENED_KEY, JSON.stringify(recent.slice(0, 30)));
  window.dispatchEvent(new CustomEvent('readmind-recent-opened-updated'));
}

export function loadRecentOpenedBooks(): RecentOpenedBook[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(RECENT_OPENED_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RecentOpenedBook[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadRecommendationFeedback(): RecommendationFeedback[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(RECOMMENDATION_FEEDBACK_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RecommendationFeedback[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecommendationFeedback(feedback: RecommendationFeedback): void {
  if (typeof window === 'undefined') return;
  const current = loadRecommendationFeedback().filter(item => item.bookId !== feedback.bookId);
  localStorage.setItem(RECOMMENDATION_FEEDBACK_KEY, JSON.stringify([feedback, ...current].slice(0, 50)));
}
