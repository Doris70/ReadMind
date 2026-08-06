'use client';

import { Book, Highlight } from '@/lib/adapters/types';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import HighlightQuote from '@/components/insights/HighlightQuote';

interface Props {
  highlight: Highlight | null;
  book?: Book | null;
  onRefresh?: () => void;
}

export default function DailyQuoteCard({ highlight, book, onRefresh }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    onRefresh?.();
    window.setTimeout(() => setRefreshing(false), 500);
  };

  if (!highlight) {
    return (
      <div className="paper-wash border-y border-line-soft/30 px-6 py-14 text-center">
        <span className="ink-label">TODAY / 01</span>
        <p className="mt-4 text-lg text-ink-soft" style={{ fontFamily: 'var(--font-display)' }}>
          还没有划线记录，先让一本书经过你
        </p>
      </div>
    );
  }

  return (
    <div className="paper-wash relative border-y border-line-soft/30 px-5 py-6 sm:px-8 sm:py-8">
      <div className="absolute right-5 top-5 text-[10px] tracking-[0.2em] text-ink-soft/60">
        READMIND / DAILY
      </div>
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
          <span className="ink-label">日话</span>
          <p className="mt-2 text-sm text-ink-soft">一句来自你自己的阅读证据</p>
        </div>
        <button
          onClick={handleRefresh}
          className="icon-button"
          title="换一句日话"
          aria-label="换一句日话"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <HighlightQuote highlight={highlight} book={book || undefined} featured />
      <p className="mt-5 text-xs text-ink-soft">每一次刷新，都是重新进入一本书。</p>
    </div>
  );
}
