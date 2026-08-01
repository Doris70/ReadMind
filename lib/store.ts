import { Book, UserData } from './adapters/types';

const STORAGE_KEY = 'readmind_data';
const USER_ID_KEY = 'readmind_user_id';
const RECENT_OPENED_KEY = 'readmind_recent_opened_books';
const RECOMMENDATION_FEEDBACK_KEY = 'readmind_recommendation_feedback';

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
