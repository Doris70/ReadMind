'use client';

/* eslint-disable @next/next/no-img-element */

import { Book, CATEGORY_COLORS } from '@/lib/adapters/types';

interface Props {
  book: Pick<Book, 'title' | 'author' | 'category' | 'coverUrl'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-11 h-16',
  md: 'w-16 h-24',
  lg: 'w-28 h-40',
};

export default function BookCover({ book, size = 'md', className = '' }: Props) {
  const coverClass = `${sizes[size]} ${className}`;

  if (book.coverUrl) {
    return (
      <img
        src={book.coverUrl}
        alt={`《${book.title}》封面`}
        className={`${coverClass} object-cover rounded-[4px] border border-ink-deep/10 bg-paper-light shadow-[2px_3px_0_rgba(38,59,53,0.08)]`}
      />
    );
  }

  return (
    <div
      className={`${coverClass} relative overflow-hidden rounded-[4px] border border-ink-deep/10 bg-paper-light p-2.5 flex flex-col justify-between shadow-[2px_3px_0_rgba(38,59,53,0.08)]`}
      style={{ backgroundColor: `${CATEGORY_COLORS[book.category]}42` }}
      aria-label={`《${book.title}》封面`}
    >
      <span className="text-[9px] tracking-[0.08em] text-ink-soft">{book.category}</span>
      <span className="relative z-10 text-xs leading-snug text-ink-deep line-clamp-4" style={{ fontFamily: 'var(--font-display)' }}>
        {book.title}
      </span>
      <span className="relative z-10 text-[9px] text-ink-soft truncate">{book.author}</span>
      <span className="absolute -right-3 -bottom-5 h-16 w-16 rounded-full border border-white/50 bg-paper-light/35" />
      <span className="absolute -left-5 bottom-3 h-12 w-12 rounded-full border border-white/40 bg-white/20" />
    </div>
  );
}
