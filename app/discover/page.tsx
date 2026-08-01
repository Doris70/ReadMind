'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Compass, ExternalLink, EyeOff, Heart, RotateCcw, RefreshCw, Sparkles, X } from 'lucide-react';
import NavBar from '@/components/ui/NavBar';
import HighlightQuote from '@/components/insights/HighlightQuote';
import { UserData, Recommendation, Book, CATEGORY_COLORS } from '@/lib/adapters/types';
import {
  loadRecommendationFeedback,
  loadUserData,
  saveRecommendationFeedback,
  saveUserData,
} from '@/lib/store';
import { generateRecommendations } from '@/lib/ai';
import { getReadingGaps, getTopHighlights, getTopics } from '@/lib/insights';

const feedbackOptions = ['暂时不想读', '题材不合适', '已经读过了'];
const recommendationPageSize = 4;

function wereadSearchUrl(title: string) {
  return `https://weread.qq.com/web/search/books?keyword=${encodeURIComponent(title)}`;
}

function RecommendationCover({ recommendation }: { recommendation: Recommendation }) {
  if (recommendation.coverUrl) {
    return (
      <img
        src={recommendation.coverUrl}
        alt={`《${recommendation.title}》封面`}
        className="h-36 w-24 rounded-[4px] border border-line-soft/35 object-cover"
      />
    );
  }
  return (
    <div
      className="relative flex h-36 w-24 items-end overflow-hidden rounded-[4px] border border-line-soft/35 bg-paper-light p-3"
      style={{ backgroundColor: `${CATEGORY_COLORS[recommendation.category]}42` }}
    >
      <span className="relative z-10 text-lg leading-tight text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>
        {recommendation.title}
      </span>
      <span className="absolute -bottom-3 -right-4 h-16 w-16 rounded-full border border-white/50 bg-paper-light/30" />
    </div>
  );
}

export default function DiscoverPage() {
  const [data, setData] = useState<UserData | null>(null);
  const [addedBooks, setAddedBooks] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const [interested, setInterested] = useState<Record<string, string>>({});
  const [reasonOpen, setReasonOpen] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [wave, setWave] = useState(0);

  useEffect(() => {
    const stored = loadUserData();
    if (!stored) return;
    setData(stored);
    const existingTitles = new Set(stored.books.map(book => book.title));
    const alreadyAdded = generateRecommendations(stored)
      .filter(recommendation => existingTitles.has(recommendation.title))
      .map(recommendation => recommendation.bookId);
    setAddedBooks(new Set(alreadyAdded));
    const feedback = loadRecommendationFeedback();
    setDismissed(Object.fromEntries(feedback.filter(item => item.reason !== '感兴趣').map(item => [item.bookId, item.reason])));
    setInterested(Object.fromEntries(feedback.filter(item => item.reason === '感兴趣').map(item => [item.bookId, item.createdAt])));
  }, []);

  const recommendations = useMemo(() => (data ? generateRecommendations(data) : []), [data]);
  const availableRecommendations = recommendations.filter(recommendation => !dismissed[recommendation.bookId]);
  const visibleRecommendations = (() => {
    if (availableRecommendations.length <= recommendationPageSize) return availableRecommendations;
    const start = (wave * recommendationPageSize) % availableRecommendations.length;
    return Array.from({ length: recommendationPageSize }, (_, index) => availableRecommendations[(start + index) % availableRecommendations.length])
      .sort((a, b) => Number(Boolean(interested[b.bookId])) - Number(Boolean(interested[a.bookId])));
  })();

  if (!data) return null;

  const topics = getTopics(data, 8);
  const gaps = getReadingGaps(data);
  const publicHighlights = data.highlights.filter(highlight => highlight.source === 'weread_public');
  const highlightPreview = getTopHighlights(publicHighlights.length > 0 ? publicHighlights : data.highlights, 2);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  const markInterested = (recommendation: Recommendation) => {
    saveRecommendationFeedback({
      bookId: recommendation.bookId,
      reason: '感兴趣',
      createdAt: new Date().toISOString(),
    });
    setInterested(current => ({ ...current, [recommendation.bookId]: new Date().toISOString() }));
    showToast(`已记录你对《${recommendation.title}》感兴趣`);
  };

  const handleAddToRead = (recommendation: Recommendation) => {
    const exists = data.books.some(book => book.title === recommendation.title);
    if (exists) {
      setAddedBooks(current => new Set(current).add(recommendation.bookId));
      showToast(`《${recommendation.title}》已经在你的书架中`);
      return;
    }
    const newBook: Book = {
      id: `interest_${recommendation.bookId}`,
      sourceBookId: recommendation.bookId,
      title: recommendation.title,
      author: recommendation.author,
      coverUrl: recommendation.coverUrl,
      category: recommendation.category,
      status: 'unstarted',
      startDate: null,
      endDate: null,
      lastReadDate: null,
      dateSource: 'manual',
      progress: 0,
      readingSeconds: 0,
      readingDays: 0,
      highlightCount: 0,
      thoughtCount: 0,
      isPinned: false,
    };
    const updatedData = { ...data, books: [...data.books, newBook] };
    saveUserData(updatedData);
    setData(updatedData);
    setAddedBooks(current => new Set(current).add(recommendation.bookId));
    showToast(`《${recommendation.title}》已存为感兴趣`);
  };

  const dismissRecommendation = (recommendation: Recommendation, reason: string) => {
    saveRecommendationFeedback({
      bookId: recommendation.bookId,
      reason,
      createdAt: new Date().toISOString(),
    });
    setDismissed(current => ({ ...current, [recommendation.bookId]: reason }));
    setReasonOpen(null);
    showToast(`已收起《${recommendation.title}》`);
  };

  const restoreDismissed = (bookId: string) => {
    const next = { ...dismissed };
    delete next[bookId];
    setDismissed(next);
    showToast('已恢复一条推荐');
  };

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-[1280px] px-5 pb-16 pt-8 sm:px-8">
        <header className="mb-8 flex flex-col justify-between gap-6 border-b border-line-soft/40 pb-8 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="ink-label">READMIND / DISCOVER</span>
              <span className="text-xs text-ink-soft">从已有阅读痕迹出发</span>
            </div>
            <h1 className="mt-4 text-4xl text-ink-deep sm:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>下一本，从哪里接上？</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-ink-soft">推荐不是一个陌生书单，而是从你反复停留的主题、已经读过的书和还没有走到的方向里长出来。</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-soft">
            <Compass className="h-5 w-5 text-sprout-green" />
            {visibleRecommendations.length} 条当前推荐
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <div className="section-rule pt-7">
            <span className="ink-label">CURRENT THEMES</span>
            <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>你最近反复经过的主题</h2>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
              {topics.map(topic => <span key={topic} className="text-sm text-ink-deep">#{topic}</span>)}
              {topics.length === 0 && <span className="text-sm text-ink-soft">还没有足够的主题数据。</span>}
            </div>
          </div>
          <div className="section-rule pt-7">
            <span className="ink-label">READING GAPS</span>
            <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>地图上的空白</h2>
            <div className="mt-5 space-y-4">
              {gaps.map(gap => (
                <div key={gap.label} className="border-l-2 pl-4" style={{ borderColor: gap.color }}>
                  <p className="text-sm text-ink-deep">{gap.label}</p>
                  <p className="mt-1 text-xs leading-6 text-ink-soft">{gap.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-rule mt-14 pt-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="ink-label">HIGHLIGHT PREVIEW</span>
              <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>先听见一句话，再决定要不要靠近</h2>
            </div>
            <span className="text-xs text-ink-soft">{publicHighlights.length > 0 ? '公开划线' : '我的划线'}</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {highlightPreview.map(highlight => {
              const book = data.books.find(item => item.id === highlight.bookId);
              return (
                <a key={highlight.id} href={book?.deepLink || wereadSearchUrl(book?.title || highlight.content.slice(0, 12))} target="_blank" rel="noopener noreferrer" className="block transition-transform hover:-translate-y-1">
                  <HighlightQuote highlight={highlight} book={book} compact />
                </a>
              );
            })}
          </div>
        </section>

        <section className="section-rule mt-14 pt-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="ink-label">EDITORIAL RECOMMENDATIONS</span>
              <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>给此刻的推荐</h2>
            </div>
            <button onClick={() => setWave(value => value + 1)} className="inline-flex items-center gap-2 border border-line-soft px-3 py-2 text-sm text-ink-soft hover:text-ink-deep">
              <RefreshCw className="h-4 w-4" /> 换一波
            </button>
          </div>

          <div className="mt-7 space-y-10">
            {visibleRecommendations.map((recommendation, index) => (
              <article key={recommendation.bookId} className="border-b border-line-soft/35 pb-10 last:border-b-0">
                <div className="grid gap-6 md:grid-cols-[96px_minmax(0,1fr)]">
                  <RecommendationCover recommendation={recommendation} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <span className="ink-label">RECOMMENDATION / {String(index + 1).padStart(2, '0')}</span>
                        <a href={wereadSearchUrl(recommendation.title)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-2xl text-ink-deep hover:text-sprout-green" style={{ fontFamily: 'var(--font-display)' }}>
                          {recommendation.title} <ExternalLink className="h-4 w-4" />
                        </a>
                        <p className="mt-1 text-sm text-ink-soft">{recommendation.author} · {recommendation.category}</p>
                      </div>
                      <span className="text-xs text-ink-soft" style={{ fontFamily: 'var(--font-number)' }}>证据匹配 {Math.round(recommendation.confidence * 100)}%</span>
                    </div>
                    <p className="mt-5 max-w-3xl text-sm leading-7 text-ink-deep">{recommendation.reason}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {recommendation.evidence.map((evidence, evidenceIndex) => (
                        <span key={`${evidence.type}-${evidenceIndex}`} className="text-xs text-ink-soft">
                          {evidence.type === 'book' ? `《${evidence.value}》` : `#${evidence.value}`}
                        </span>
                      ))}
                    </div>
                    {recommendation.quote && (
                      <p className="mt-5 max-w-2xl border-l-2 border-sun-yellow pl-4 text-sm italic leading-7 text-ink-deep">
                        内容预览：“{recommendation.quote}”
                      </p>
                    )}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          markInterested(recommendation);
                          handleAddToRead(recommendation);
                        }}
                        disabled={Boolean(interested[recommendation.bookId]) || addedBooks.has(recommendation.bookId)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${interested[recommendation.bookId] || addedBooks.has(recommendation.bookId) ? 'bg-moss-green/15 text-moss-green' : 'bg-ink-deep text-white hover:bg-ink-deep/90'}`}
                      >
                        {interested[recommendation.bookId] || addedBooks.has(recommendation.bookId) ? <Check className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                        {interested[recommendation.bookId] || addedBooks.has(recommendation.bookId) ? '已感兴趣' : '感兴趣'}
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setReasonOpen(reasonOpen === recommendation.bookId ? null : recommendation.bookId)}
                          className="inline-flex items-center gap-2 border border-line-soft px-4 py-2.5 text-sm text-ink-soft hover:text-ink-deep"
                        >
                          <EyeOff className="h-4 w-4" /> 不感兴趣
                        </button>
                        {reasonOpen === recommendation.bookId && (
                          <div className="absolute bottom-12 left-0 z-10 w-48 border border-line-soft/50 bg-paper-warm p-2 shadow-lg">
                            <div className="flex items-center justify-between px-2 py-1 text-[11px] text-ink-soft">
                              收起原因
                              <button onClick={() => setReasonOpen(null)} title="关闭原因菜单" aria-label="关闭原因菜单"><X className="h-3.5 w-3.5" /></button>
                            </div>
                            {feedbackOptions.map(reason => (
                              <button key={reason} onClick={() => dismissRecommendation(recommendation, reason)} className="block w-full px-2 py-2 text-left text-xs text-ink-deep hover:bg-paper-light">
                                {reason}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {visibleRecommendations.length === 0 && Object.keys(dismissed).length > 0 && (
            <div className="border-l-2 border-line-soft px-4 py-7">
              <p className="text-sm text-ink-deep">当前推荐都被你收起了。</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(dismissed).map(([bookId, reason]) => {
                  const recommendation = recommendations.find(item => item.bookId === bookId);
                  if (!recommendation) return null;
                  return (
                    <button key={bookId} onClick={() => restoreDismissed(bookId)} className="inline-flex items-center gap-2 border border-line-soft px-3 py-2 text-xs text-ink-soft hover:text-ink-deep">
                      <RotateCcw className="h-3.5 w-3.5" /> 恢复《{recommendation.title}》· {reason}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="mt-10 flex items-center gap-2 border-t border-line-soft/35 pt-6 text-xs text-ink-soft">
          <Sparkles className="h-4 w-4 text-sprout-green" />
          推荐理由只使用你已经留下的阅读证据，不把推测写成事实。
          <ArrowRight className="ml-auto h-4 w-4" />
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-7 left-1/2 z-50 -translate-x-1/2 border border-line-soft/40 bg-ink-deep px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
