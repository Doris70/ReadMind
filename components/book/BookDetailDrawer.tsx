'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Leaf,
  PenLine,
  Quote,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import BookCover from '@/components/ui/BookCover';
import HighlightQuote from '@/components/insights/HighlightQuote';
import { Book, Highlight, Recommendation, CATEGORY_COLORS, STATUS_LABELS, formatReadingTime, formatDate } from '@/lib/adapters/types';
import { generateBookSummary } from '@/lib/ai';
import { getBookHighlights, getHighlightScore, getTopHighlights } from '@/lib/insights';

interface Props {
  book: Book;
  highlights: Highlight[];
  nextRecommendation?: Recommendation | null;
  onBookUpdate?: (book: Book) => void;
  onClose: () => void;
}

type HighlightFilter = 'all' | 'thoughts' | 'featured';

const statusColors: Record<Book['status'], string> = {
  reading: '#A8C98B',
  finished: '#7FAE8F',
  paused: '#E5D58A',
  abandoned: '#C98D82',
  unstarted: '#B8CEC4',
};

function dateSourceLabel(source: Book['dateSource']): string {
  if (source === 'real') return '来自阅读记录';
  if (source === 'manual') return '手动记录';
  return '根据阅读痕迹推断';
}

export default function BookDetailDrawer({ book, highlights, nextRecommendation, onBookUpdate, onClose }: Props) {
  const [highlightFilter, setHighlightFilter] = useState<HighlightFilter>('all');
  const [draftBook, setDraftBook] = useState(book);
  const bookHighlights = useMemo(() => getBookHighlights(highlights, book.id), [book.id, highlights]);
  const featuredHighlights = useMemo(() => getTopHighlights(bookHighlights, 3), [bookHighlights]);
  const summary = useMemo(() => generateBookSummary(book, bookHighlights), [book, bookHighlights]);
  const topics = [...new Set(bookHighlights.flatMap(highlight => highlight.topicTags))].slice(0, 8);
  const filteredHighlights = bookHighlights.filter(highlight => {
    if (highlightFilter === 'thoughts') return Boolean(highlight.thought);
    if (highlightFilter === 'featured') return highlight.isFeatured || getHighlightScore(highlight) >= 7;
    return true;
  });
  const canEditDates = Boolean(onBookUpdate);

  const saveTrace = () => {
    const start = draftBook.startDate || null;
    const end = draftBook.endDate || null;
    const lastRead = draftBook.lastReadDate || end || start;
    const startDate = start ? new Date(start) : null;
    const endDate = end || lastRead ? new Date(end || lastRead || '') : null;
    const readingDays = startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())
      ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1)
      : draftBook.readingDays;
    const updatedBook: Book = {
      ...draftBook,
      startDate: start,
      endDate: end,
      lastReadDate: lastRead,
      readingDays,
      dateSource: 'manual',
      status: end ? 'finished' : draftBook.status,
      progress: end ? 1 : draftBook.progress,
    };
    setDraftBook(updatedBook);
    onBookUpdate?.(updatedBook);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-deep/20 backdrop-blur-[2px]" />
      <aside
        className="relative flex h-full w-full max-w-3xl flex-col overflow-y-auto bg-paper-warm shadow-[-12px_0_36px_rgba(38,59,53,0.12)] animate-slide-in-right"
        onClick={event => event.stopPropagation()}
      >
        <header className="sticky top-0 z-20 flex items-start justify-between gap-5 border-b border-line-soft/30 bg-paper-warm/95 px-5 py-4 backdrop-blur-sm sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="ink-label">BOOK TRACE / {book.category}</span>
            <span className="hidden text-xs text-ink-soft sm:inline">阅读档案</span>
          </div>
          <button className="icon-button shrink-0" onClick={onClose} title="关闭详情" aria-label="关闭详情">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-5 py-7 sm:px-8">
          <section className="grid gap-6 border-b border-line-soft/35 pb-8 sm:grid-cols-[112px_1fr]">
            <BookCover book={book} size="lg" className="mx-auto sm:mx-0" />
            <div className="min-w-0">
              <p className="text-xs tracking-[0.12em] text-ink-soft">这本书，曾经在你的哪一段时间里？</p>
              <h1 className="mt-3 text-3xl leading-tight text-ink-deep sm:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
                {book.title}
              </h1>
              <p className="mt-2 text-sm text-ink-soft">{book.author}</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
                <span className="inline-flex items-center gap-1.5" style={{ color: statusColors[book.status] }}>
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {STATUS_LABELS[book.status]}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[book.category] }} />
                  {book.category}
                </span>
                {book.deepLink && (
                  <a href={book.deepLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-water-blue hover:text-ink-deep">
                    在微信读书中打开 <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {topics.slice(0, 4).map(topic => (
                  <span key={topic} className="inline-flex items-center gap-1 text-xs text-ink-soft">
                    <Tag className="h-3 w-3" /> {topic}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="border-b border-line-soft/35 py-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="ink-label">READING TRACE</span>
                <h2 className="mt-2 text-xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>它如何经过你</h2>
              </div>
              <span className="text-[11px] text-ink-soft">{dateSourceLabel(book.dateSource)}</span>
            </div>
            {canEditDates && (
              <div className="mt-5 grid gap-3 border border-line-soft/35 bg-paper-light p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <label className="text-[11px] text-ink-soft">开始日期
                  <input
                    type="date"
                    value={draftBook.startDate || ''}
                    onChange={event => setDraftBook(current => ({ ...current, startDate: event.target.value || null }))}
                    className="mt-1 w-full border border-line-soft/60 bg-paper-warm px-2.5 py-2 text-sm text-ink-deep outline-none focus:border-sprout-green"
                  />
                </label>
                <label className="text-[11px] text-ink-soft">结束日期
                  <input
                    type="date"
                    value={draftBook.endDate || ''}
                    onChange={event => setDraftBook(current => ({ ...current, endDate: event.target.value || null }))}
                    className="mt-1 w-full border border-line-soft/60 bg-paper-warm px-2.5 py-2 text-sm text-ink-deep outline-none focus:border-sprout-green"
                  />
                </label>
                <label className="text-[11px] text-ink-soft">最近阅读
                  <input
                    type="date"
                    value={draftBook.lastReadDate || ''}
                    onChange={event => setDraftBook(current => ({ ...current, lastReadDate: event.target.value || null }))}
                    className="mt-1 w-full border border-line-soft/60 bg-paper-warm px-2.5 py-2 text-sm text-ink-deep outline-none focus:border-sprout-green"
                  />
                </label>
                <button onClick={saveTrace} className="self-end bg-ink-deep px-4 py-2 text-sm text-white hover:bg-ink-deep/90">保存</button>
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden border border-line-soft/25 bg-line-soft/25 sm:grid-cols-3">
              {[
                { label: '开始日期', value: formatDate(book.startDate), icon: CalendarDays },
                { label: '最近阅读', value: formatDate(book.lastReadDate), icon: Clock3 },
                { label: '结束日期', value: formatDate(book.endDate), icon: CheckCircle2 },
                { label: '阅读时长', value: formatReadingTime(book.readingSeconds), icon: Clock3 },
                { label: '阅读天数', value: `${book.readingDays} 天`, icon: CalendarDays },
                { label: '划线 / 想法', value: `${book.highlightCount} / ${book.thoughtCount}`, icon: PenLine },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-paper-light p-3.5 sm:p-4">
                    <div className="flex items-center gap-1.5 text-[10px] text-ink-soft">
                      <Icon className="h-3.5 w-3.5" /> {item.label}
                    </div>
                    <p className="mt-2 text-sm text-ink-deep sm:text-base" style={{ fontFamily: 'var(--font-number)' }}>{item.value}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="text-xs text-ink-soft">阅读进度</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft/35">
                <div className="h-full rounded-full bg-sprout-green transition-all" style={{ width: `${Math.round(book.progress * 100)}%` }} />
              </div>
              <span className="text-sm text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{Math.round(book.progress * 100)}%</span>
            </div>
          </section>

          <section className="border-b border-line-soft/35 py-7">
            <div className="flex items-center gap-2">
              <Quote className="h-5 w-5 text-sun-yellow" />
              <div>
                <span className="ink-label">HIGHLIGHTED LINES</span>
                <h2 className="mt-2 text-xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>高划线金句</h2>
              </div>
            </div>
            <p className="mt-2 text-sm text-ink-soft">根据重点标记、想法和时间痕迹整理。每条都可以回到章节上下文。</p>
            <div className="mt-5 space-y-4">
              {featuredHighlights.length > 0 ? featuredHighlights.map(highlight => (
                <HighlightQuote key={highlight.id} highlight={highlight} book={book} compact featured />
              )) : (
                <p className="border-l-2 border-line-soft px-4 py-3 text-sm text-ink-soft">暂时还没有足够的重点划线。</p>
              )}
            </div>
          </section>

          <section className="border-b border-line-soft/35 py-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="ink-label">MARGINALIA</span>
                <h2 className="mt-2 text-xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>划线与想法</h2>
              </div>
              <div className="flex items-center gap-1 border-b border-line-soft/35">
                {([
                  ['all', '全部'],
                  ['thoughts', '有想法'],
                  ['featured', '重点'],
                ] as [HighlightFilter, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setHighlightFilter(value)}
                    className={`border-b-2 px-2.5 py-2 text-xs transition-colors ${highlightFilter === value ? 'border-ink-deep text-ink-deep' : 'border-transparent text-ink-soft hover:text-ink-deep'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 space-y-5">
              {highlightFilter === 'featured' && (
                <p className="border-l-2 border-line-soft bg-paper-light px-3 py-2 text-xs leading-6 text-ink-soft">
                  重点逻辑：优先展示微信读书重点标记；没有标记时，会把“有想法、来自我的划线、句子较短更适合回看”的内容加权，综合分达到 7 分以上进入重点。
                </p>
              )}
              {filteredHighlights.length === 0 ? (
                <p className="py-6 text-sm text-ink-soft">这个筛选下暂时没有内容。</p>
              ) : filteredHighlights.map(highlight => (
                <article key={highlight.id} className="border-l-2 pl-4" style={{ borderColor: CATEGORY_COLORS[book.category] }}>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
                    <span>{highlight.chapter || '未分类章节'}</span>
                    <span>·</span>
                    <span>{highlight.createdAt.slice(0, 10)}</span>
                    <span className="ink-label">{highlight.source === 'weread_public' ? '公开划线' : '我的划线'}</span>
                  </div>
                  {highlightFilter === 'thoughts' && highlight.thought && (
                    <div className="mt-3 bg-paper-light px-4 py-3 shadow-[inset_3px_0_0_rgba(201,141,130,0.65)]">
                      <p className="text-[11px] text-dust-rose">我的想法</p>
                      <p className="mt-1 text-sm leading-7 text-ink-deep">{highlight.thought}</p>
                    </div>
                  )}
                  <p className="mt-2 text-base leading-relaxed text-ink-deep">“{highlight.content}”</p>
                  {highlightFilter !== 'thoughts' && highlight.thought && (
                    <p className="mt-2 text-sm italic leading-relaxed text-ink-soft">我的想法：{highlight.thought}</p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="border-b border-line-soft/35 py-7">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-water-blue" />
              <div>
                <span className="ink-label">READING NOTE</span>
                <h2 className="mt-2 text-xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>这本书在你的地图里</h2>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-base leading-8 text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>{summary}</p>
            {topics.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-soft">
                {topics.map(topic => <span key={topic}>#{topic}</span>)}
              </div>
            )}
          </section>

          {nextRecommendation && (
            <section className="py-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="ink-label">NEXT TRACE</span>
                  <h2 className="mt-2 text-xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>下一本可以怎样接上</h2>
                </div>
                <ArrowUpRight className="h-5 w-5 text-sprout-green" />
              </div>
              <div className="mt-4 border-l-2 border-sprout-green pl-4">
                <p className="text-lg text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>{nextRecommendation.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{nextRecommendation.author} · {nextRecommendation.category}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{nextRecommendation.reason}</p>
              </div>
            </section>
          )}
        </div>
        <div className="mt-auto flex items-center gap-2 px-5 pb-6 text-[11px] text-ink-soft sm:px-8">
          <Leaf className="h-3.5 w-3.5 text-sprout-green" />
          <span>这是一份基于阅读记录的私人档案，不替代原书内容。</span>
        </div>
      </aside>
    </div>
  );
}
