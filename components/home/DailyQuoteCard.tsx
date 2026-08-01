'use client';

import { Highlight, Book } from '@/lib/adapters/types';
import { ArrowUpRight, Download, RefreshCw } from 'lucide-react';
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
    setTimeout(() => setRefreshing(false), 500);
  };

  const exportAsImage = () => {
    if (!highlight) return;
    const quote = highlight.content.replace(/[<>&]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] || char));
    const bookLine = `《${book?.title || '未知书籍'}》 · ${book?.author || '未知作者'}`.replace(/[<>&]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] || char));
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
        <rect width="1200" height="760" fill="#DCEDE7"/>
        <rect x="90" y="84" width="1020" height="592" fill="#FAF9F1" stroke="#B8CEC4"/>
        <text x="132" y="150" fill="#64766F" font-family="Inter, sans-serif" font-size="24" letter-spacing="8">READMIND / 日话</text>
        <foreignObject x="132" y="214" width="936" height="260">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:'Noto Serif SC',serif;font-size:48px;line-height:1.55;color:#263B35;">“${quote}”</div>
        </foreignObject>
        <line x1="132" y1="534" x2="1068" y2="534" stroke="#B8CEC4"/>
        <text x="132" y="594" fill="#64766F" font-family="Noto Sans SC, sans-serif" font-size="26">${bookLine}</text>
        <text x="132" y="638" fill="#64766F" font-family="Inter, sans-serif" font-size="20">${highlight.createdAt.slice(0, 10)}</text>
      </svg>
    `;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 760;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0);
      const link = document.createElement('a');
      link.download = `readmind-dayquote-${highlight.createdAt.slice(0, 10) || 'today'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
          <p className="mt-2 text-sm text-ink-soft">一条来自你自己的阅读证据</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportAsImage}
            className="icon-button"
            title="导出日话图片"
            aria-label="导出日话图片"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="icon-button"
            title="换一句日话"
            aria-label="换一句日话"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <HighlightQuote highlight={highlight} book={book || undefined} featured />
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs text-ink-soft">每一次刷新，都是重新进入一本书</span>
        <span className="inline-flex items-center gap-1 text-xs text-ink-deep">
          回到书迹 <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
