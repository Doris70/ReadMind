'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Key, PenLine, Sparkles, Loader2, Plus, Trash2 } from 'lucide-react';
import { loadDemoData } from '@/lib/adapters/demo';
import { saveUserData } from '@/lib/store';
import { Book, BookStatus, Category, UserData } from '@/lib/adapters/types';

const categories: Category[] = ['文学', '心理', '历史', '社科', '经济理财', '小说', '计算机'];
const statuses: { value: BookStatus; label: string }[] = [
  { value: 'reading', label: '进行中' },
  { value: 'finished', label: '已读完' },
  { value: 'paused', label: '已暂停' },
  { value: 'abandoned', label: '已搁置' },
  { value: 'unstarted', label: '未开始' },
];

function createManualBook(index: number): Book {
  return {
    id: `manual_${Date.now()}_${index}`,
    title: '',
    author: '',
    category: '文学',
    status: 'reading',
    startDate: '',
    endDate: null,
    lastReadDate: '',
    dateSource: 'manual',
    progress: 0.1,
    readingSeconds: 0,
    readingDays: 0,
    highlightCount: 0,
    thoughtCount: 0,
    isPinned: false,
  };
}

function daysBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'choose' | 'connecting' | 'preview' | 'manual'>('choose');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<{ bookCount: number; highlightCount: number } | null>(null);
  const [importedData, setImportedData] = useState<unknown>(null);
  const [manualBooks, setManualBooks] = useState<Book[]>([createManualBook(0)]);

  const handleDemo = () => {
    const data = loadDemoData();
    saveUserData(data);
    router.push('/');
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) { setError('请输入 API Key'); return; }
    setStep('connecting');
    setError('');
    try {
      const res = await fetch('/api/weread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const result = await res.json();
      if (!res.ok || result.error) { setError(`${result.error || '连接失败'}${result.detail ? '：' + result.detail : ''}`); setStep('choose'); return; }
      setPreviewData({ bookCount: result.bookCount, highlightCount: result.highlightCount });
      setImportedData(result.data);
      setStep('preview');
    } catch {
      setError('连接失败，请检查网络或 API Key');
      setStep('choose');
    }
  };

  const handleConfirmImport = () => {
    if (importedData) {
      saveUserData(importedData as Parameters<typeof saveUserData>[0]);
      router.push('/');
    }
  };

  const updateManualBook = <K extends keyof Book>(id: string, key: K, value: Book[K]) => {
    setManualBooks(current => current.map(book => {
      if (book.id !== id) return book;
      const next = { ...book, [key]: value };
      if (key === 'startDate' || key === 'endDate' || key === 'lastReadDate') {
        const end = next.endDate || next.lastReadDate || next.startDate;
        next.readingDays = daysBetween(next.startDate, end);
      }
      if (key === 'status' && value === 'finished' && !next.endDate) {
        next.endDate = next.lastReadDate || next.startDate || new Date().toISOString().slice(0, 10);
        next.progress = 1;
      }
      return next;
    }));
  };

  const handleManualImport = () => {
    const validBooks = manualBooks
      .filter(book => book.title.trim())
      .map((book, index) => {
        const startDate = book.startDate || null;
        const endDate = book.endDate || null;
        const lastReadDate = book.lastReadDate || endDate || startDate;
        return {
          ...book,
          id: book.id || `manual_${Date.now()}_${index}`,
          title: book.title.trim(),
          author: book.author.trim() || '未知作者',
          startDate,
          endDate,
          lastReadDate,
          progress: book.status === 'finished' ? 1 : Math.max(0, Math.min(book.progress, 0.99)),
          readingDays: book.readingDays || daysBetween(startDate, endDate || lastReadDate),
        };
      });

    if (validBooks.length === 0) {
      setError('至少添加一本书名完整的书');
      return;
    }

    const data: UserData = {
      userId: 'manual-user',
      books: validBooks,
      highlights: [],
      readingEvents: [],
      recommendations: [],
      personas: [],
      lastSyncTime: new Date().toISOString(),
      source: 'manual',
    };
    saveUserData(data);
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold text-ink-deep mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            ReadMind
          </h1>
          <p className="text-ink-soft text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            建立我的书迹地图
          </p>
          <p className="text-ink-soft text-sm mt-2 opacity-70">
            一条时间轴，记录那些经过我、留下来、最后成为我的书。
          </p>
        </div>

        {step === 'choose' && (
          <div className="space-y-4 animate-fade-in">
            {/* 连接微信读书 */}
            <div className="bg-paper-warm rounded-lg p-6 border border-line-soft/30">
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5 text-sprout-green" />
                <h2 className="text-lg font-medium text-ink-deep">连接微信读书</h2>
              </div>
              <p className="text-sm text-ink-soft mb-4">输入你的微信读书 API Key，同步书架、划线和阅读数据。</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="wrk-xxxxxxxx"
                  className="flex-1 px-3 py-2 rounded-md border border-line-soft bg-paper-light text-sm text-ink-deep placeholder:text-ink-soft/50 focus:outline-none focus:border-sprout-green"
                />
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 bg-sprout-green text-white rounded-md text-sm font-medium hover:bg-sprout-green/90 transition-colors"
                >
                  连接
                </button>
              </div>
              {error && <p className="text-dust-rose text-sm mt-2">{error}</p>}
            </div>

            {/* 使用 Demo */}
            <div className="bg-paper-warm rounded-lg p-6 border border-line-soft/30">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-sun-yellow" />
                <h2 className="text-lg font-medium text-ink-deep">使用演示数据</h2>
              </div>
              <p className="text-sm text-ink-soft mb-4">体验完整功能，使用预设的阅读数据（22本书、20条划线）。</p>
              <button
                onClick={handleDemo}
                className="w-full px-4 py-2.5 bg-paper-light border border-line-soft text-ink-deep rounded-md text-sm font-medium hover:bg-paper-mist transition-colors"
              >
                开始体验
              </button>
            </div>

            {/* 手动创建 */}
            <div className="bg-paper-warm rounded-lg p-6 border border-line-soft/30">
              <div className="flex items-center gap-3 mb-3">
                <PenLine className="w-5 h-5 text-dust-rose" />
                <h2 className="text-lg font-medium text-ink-deep">手动创建 / 自主导入</h2>
              </div>
              <p className="text-sm text-ink-soft mb-4">手动添加书籍，并自行修改开始日期、结束日期、进度和阅读时长。</p>
              <button
                onClick={() => setStep('manual')}
                className="w-full px-4 py-2.5 bg-paper-light border border-line-soft text-ink-deep rounded-md text-sm font-medium hover:bg-paper-mist transition-colors"
              >
                添加我的书籍
              </button>
            </div>
          </div>
        )}

        {step === 'manual' && (
          <div className="bg-paper-warm rounded-lg border border-line-soft/30 p-5 animate-fade-in">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-medium text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>自主导入书籍</h2>
                <p className="mt-1 text-sm text-ink-soft">日期后续也会进入书迹轴计算。结束日期可以留空，表示仍在阅读。</p>
              </div>
              <button
                onClick={() => setManualBooks(current => [...current, createManualBook(current.length)])}
                className="inline-flex items-center gap-1 rounded-md border border-line-soft bg-paper-light px-3 py-2 text-xs text-ink-deep hover:bg-paper-mist"
              >
                <Plus className="h-3.5 w-3.5" /> 添加
              </button>
            </div>
            <div className="max-h-[56vh] space-y-4 overflow-y-auto pr-1">
              {manualBooks.map((book, index) => (
                <div key={book.id} className="border border-line-soft/35 bg-paper-light p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="ink-label">BOOK {index + 1}</span>
                    {manualBooks.length > 1 && (
                      <button
                        onClick={() => setManualBooks(current => current.filter(item => item.id !== book.id))}
                        className="text-ink-soft hover:text-dust-rose"
                        title="删除这本书"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={book.title} onChange={event => updateManualBook(book.id, 'title', event.target.value)} placeholder="书名" className="rounded-md border border-line-soft bg-paper-warm px-3 py-2 text-sm outline-none focus:border-sprout-green" />
                    <input value={book.author} onChange={event => updateManualBook(book.id, 'author', event.target.value)} placeholder="作者" className="rounded-md border border-line-soft bg-paper-warm px-3 py-2 text-sm outline-none focus:border-sprout-green" />
                    <select value={book.category} onChange={event => updateManualBook(book.id, 'category', event.target.value as Category)} className="rounded-md border border-line-soft bg-paper-warm px-3 py-2 text-sm outline-none focus:border-sprout-green">
                      {categories.map(category => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <select value={book.status} onChange={event => updateManualBook(book.id, 'status', event.target.value as BookStatus)} className="rounded-md border border-line-soft bg-paper-warm px-3 py-2 text-sm outline-none focus:border-sprout-green">
                      {statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                    <label className="text-xs text-ink-soft">开始日期
                      <input type="date" value={book.startDate || ''} onChange={event => updateManualBook(book.id, 'startDate', event.target.value)} className="mt-1 w-full rounded-md border border-line-soft bg-paper-warm px-3 py-2 text-sm text-ink-deep outline-none focus:border-sprout-green" />
                    </label>
                    <label className="text-xs text-ink-soft">结束日期
                      <input type="date" value={book.endDate || ''} onChange={event => updateManualBook(book.id, 'endDate', event.target.value || null)} className="mt-1 w-full rounded-md border border-line-soft bg-paper-warm px-3 py-2 text-sm text-ink-deep outline-none focus:border-sprout-green" />
                    </label>
                    <label className="text-xs text-ink-soft">最近阅读
                      <input type="date" value={book.lastReadDate || ''} onChange={event => updateManualBook(book.id, 'lastReadDate', event.target.value)} className="mt-1 w-full rounded-md border border-line-soft bg-paper-warm px-3 py-2 text-sm text-ink-deep outline-none focus:border-sprout-green" />
                    </label>
                    <label className="text-xs text-ink-soft">阅读时长（小时）
                      <input type="number" min="0" step="0.5" value={Math.round(book.readingSeconds / 1800) / 2} onChange={event => updateManualBook(book.id, 'readingSeconds', Math.round(Number(event.target.value || 0) * 3600))} className="mt-1 w-full rounded-md border border-line-soft bg-paper-warm px-3 py-2 text-sm text-ink-deep outline-none focus:border-sprout-green" />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-dust-rose">{error}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setStep('choose')} className="flex-1 rounded-md border border-line-soft px-4 py-2.5 text-sm text-ink-soft hover:bg-paper-light">返回</button>
              <button onClick={handleManualImport} className="flex-1 rounded-md bg-sprout-green px-4 py-2.5 text-sm font-medium text-white hover:bg-sprout-green/90">生成书迹地图</button>
            </div>
          </div>
        )}

        {step === 'connecting' && (
          <div className="text-center py-12 animate-fade-in">
            <Loader2 className="w-8 h-8 text-sprout-green animate-spin mx-auto mb-4" />
            <p className="text-ink-soft">正在同步你的阅读数据...</p>
          </div>
        )}

        {step === 'preview' && previewData && (
          <div className="bg-paper-warm rounded-lg p-8 border border-line-soft/30 text-center animate-fade-in">
            <BookOpen className="w-10 h-10 text-sprout-green mx-auto mb-4" />
            <h2 className="text-xl font-medium text-ink-deep mb-2">同步成功</h2>
            <p className="text-ink-soft mb-6">
              发现 <span className="text-ink-deep font-medium">{previewData.bookCount}</span> 本书，
              <span className="text-ink-deep font-medium">{previewData.highlightCount}</span> 条划线
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('choose')}
                className="flex-1 px-4 py-2.5 border border-line-soft text-ink-soft rounded-md text-sm hover:bg-paper-light transition-colors"
              >
                返回
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 px-4 py-2.5 bg-sprout-green text-white rounded-md text-sm font-medium hover:bg-sprout-green/90 transition-colors"
              >
                生成书迹地图
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
