'use client';

import { Highlight, Book } from '@/lib/adapters/types';
import { Check, Download, Palette, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import HighlightQuote from '@/components/insights/HighlightQuote';

interface Props {
  highlight: Highlight | null;
  book?: Book | null;
  onRefresh?: () => void;
}

type QuoteBackground = {
  id: string;
  label: string;
  src?: string;
  color: string;
  preview: string;
  position?: string;
};

const quoteBackgrounds: QuoteBackground[] = [
  {
    id: 'mist-paper',
    label: '青绿纸页',
    color: '#DCEDE7',
    preview: 'linear-gradient(135deg, #DCEDE7 0%, #F5F4E9 56%, #BFDCD0 100%)',
  },
  {
    id: 'rose-archive',
    label: '植物标本',
    src: '/dayquote/rose-archive.svg',
    color: '#E9E8D8',
    preview: 'url(/dayquote/rose-archive.svg)',
    position: 'center',
  },
  {
    id: 'ink-blue',
    label: '蓝灰墨色',
    src: '/dayquote/ink-blue.svg',
    color: '#C4D5DF',
    preview: 'url(/dayquote/ink-blue.svg)',
    position: 'center',
  },
  {
    id: 'night-library',
    label: '深夜书页',
    src: '/dayquote/night-library.svg',
    color: '#31535A',
    preview: 'url(/dayquote/night-library.svg)',
    position: 'center',
  },
  {
    id: 'paper-green',
    label: '纸上枝影',
    src: '/dayquote/paper-green.svg',
    color: '#DCEDE7',
    preview: 'url(/dayquote/paper-green.svg)',
    position: 'center',
  },
];

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function DailyQuoteCard({ highlight, book, onRefresh }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState(quoteBackgrounds[0].id);
  const [exporting, setExporting] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    onRefresh?.();
    setTimeout(() => setRefreshing(false), 500);
  };

  const exportAsImage = async () => {
    if (!highlight) return;
    setExporting(true);
    const selectedBackground = quoteBackgrounds.find(item => item.id === selectedBackgroundId) || quoteBackgrounds[0];
    const quote = highlight.content.replace(/[<>&]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] || char));
    const bookLine = `《${book?.title || '未知书籍'}》 · ${book?.author || '未知作者'}`.replace(/[<>&]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] || char));
    try {
      const backgroundDataUrl = selectedBackground.src
        ? await fetch(selectedBackground.src).then(response => {
          if (!response.ok) throw new Error('background-load-failed');
          return response.blob();
        }).then(blobToDataUrl)
        : null;
      const background = backgroundDataUrl
        ? `<image href="${backgroundDataUrl}" x="0" y="0" width="1200" height="760" preserveAspectRatio="xMidYMid slice" opacity="0.46" />`
        : `<rect width="1200" height="760" fill="${selectedBackground.color}" />`;
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
          ${background}
          <rect width="1200" height="760" fill="${selectedBackground.color}" opacity="0.2"/>
          <rect x="90" y="84" width="1020" height="592" fill="#FAF9F1" fill-opacity="0.87" stroke="#B8CEC4"/>
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
        setExporting(false);
        setShowBackgroundPicker(false);
      };
      image.onerror = () => setExporting(false);
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch {
      setExporting(false);
    }
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
    <>
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
            onClick={() => setShowBackgroundPicker(true)}
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
      </div>
      </div>

      {showBackgroundPicker && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-deep/35 p-4 backdrop-blur-sm" onClick={() => setShowBackgroundPicker(false)}>
          <div className="w-full max-w-2xl border border-line-soft/40 bg-paper-warm p-5 shadow-[0_24px_80px_rgba(38,59,53,0.24)] sm:p-7" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-line-soft/35 pb-4">
              <div>
                <span className="ink-label">EXPORT / DAILY QUOTE</span>
                <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>选一张文艺背景</h2>
                <p className="mt-2 text-sm leading-6 text-ink-soft">背景会铺在日话照片底层，文字区域仍保留清晰的纸页留白。</p>
              </div>
              <button onClick={() => setShowBackgroundPicker(false)} className="icon-button shrink-0" title="关闭背景选择" aria-label="关闭背景选择">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {quoteBackgrounds.map(backgroundOption => {
                const isSelected = selectedBackgroundId === backgroundOption.id;
                return (
                  <button
                    key={backgroundOption.id}
                    onClick={() => setSelectedBackgroundId(backgroundOption.id)}
                    className={`group relative overflow-hidden border text-left transition-all ${isSelected ? 'border-ink-deep ring-2 ring-sprout-green/35' : 'border-line-soft/40 hover:border-ink-soft'}`}
                  >
                    <span
                      className="block aspect-[1.55] bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: backgroundOption.preview, backgroundColor: backgroundOption.color, backgroundPosition: backgroundOption.position }}
                    />
                    <span className="flex items-center justify-between gap-2 border-t border-line-soft/25 bg-paper-light px-3 py-2 text-xs text-ink-deep">
                      {backgroundOption.label}
                      {isSelected && <Check className="h-3.5 w-3.5 text-sprout-green" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-line-soft/30 pt-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft"><Palette className="h-3.5 w-3.5" /> 已选择：{quoteBackgrounds.find(item => item.id === selectedBackgroundId)?.label}</span>
              <div className="flex gap-2">
                <button onClick={() => setShowBackgroundPicker(false)} className="border border-line-soft px-4 py-2 text-sm text-ink-soft hover:bg-paper-light">取消</button>
                <button onClick={exportAsImage} disabled={exporting} className="inline-flex items-center gap-2 bg-ink-deep px-4 py-2 text-sm text-white transition-colors hover:bg-ink-deep/90 disabled:cursor-wait disabled:opacity-60">
                  <Download className="h-3.5 w-3.5" /> {exporting ? '生成中…' : '导出图片'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
