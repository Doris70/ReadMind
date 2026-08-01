import { CalendarDays, Quote } from 'lucide-react';
import { Book, Highlight } from '@/lib/adapters/types';

interface Props {
  highlight: Highlight;
  book?: Book;
  compact?: boolean;
  featured?: boolean;
}

function formatHighlightDate(value: string): string {
  if (!value) return '日期未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export default function HighlightQuote({ highlight, book, compact = false, featured = false }: Props) {
  const isPublic = highlight.source === 'weread_public';

  return (
    <article className={`relative overflow-hidden border border-line-soft/35 bg-paper-light ${compact ? 'p-4' : 'p-5'} ${featured ? 'quote-featured' : ''}`}>
      <div className="absolute left-0 top-0 h-full w-1 bg-sun-yellow/70" />
      <div className="flex items-start justify-between gap-4">
        <Quote className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} mt-0.5 shrink-0 text-sun-yellow`} />
        <span className="ink-label ml-auto">
          {isPublic ? '公开划线' : '我的划线'}
        </span>
      </div>
      <p
        className={`${compact ? 'mt-3 text-base' : 'mt-4 text-lg'} leading-relaxed text-ink-deep`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        “{highlight.content}”
      </p>
      {highlight.thought && !compact && (
        <p className="mt-4 border-l border-line-soft pl-3 text-sm leading-relaxed text-ink-soft">
          {highlight.thought}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-soft">
        {book && <span className="text-ink-deep">《{book.title}》 · {book.author}</span>}
        {highlight.chapter && <span>{highlight.chapter}</span>}
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {formatHighlightDate(highlight.createdAt)}
        </span>
      </div>
      {!compact && highlight.topicTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {highlight.topicTags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[10px] text-ink-soft">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
