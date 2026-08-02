'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CircleHelp, Key, PenLine, Sparkles, Loader2, Plus, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { loadDemoData } from '@/lib/adapters/demo';
import { clearManualBooksDraft, isManualBook, loadManualBooksDraft, loadManualData, loadUserData, saveManualBooksDraft, saveManualData, saveUserData, saveWereadData } from '@/lib/store';
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
  const [existingData, setExistingData] = useState<UserData | null>(null);
  const [hasManualData, setHasManualData] = useState(false);
  const [setupHydrated, setSetupHydrated] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<{ bookCount: number; highlightCount: number } | null>(null);
  const [importedData, setImportedData] = useState<unknown>(null);
  const [manualBooks, setManualBooks] = useState<Book[]>([createManualBook(0)]);
  const [showApiGuide, setShowApiGuide] = useState(false);

  useEffect(() => {
    const stored = loadUserData();
    const draft = loadManualBooksDraft();
    const storedManualData = loadManualData();
    const savedManualBooks = storedManualData?.books || stored?.books.filter(isManualBook) || [];
    if (!storedManualData && stored && savedManualBooks.length > 0) {
      const manualIds = new Set(savedManualBooks.map(book => book.id));
      saveManualData({
        ...stored,
        books: savedManualBooks,
        highlights: stored.highlights.filter(highlight => manualIds.has(highlight.bookId)),
        readingEvents: stored.readingEvents.filter(event => manualIds.has(event.bookId)),
        source: 'manual',
      });
    }
    setExistingData(stored);
    setHasManualData(savedManualBooks.length > 0);
    if (draft.length > 0) {
      setManualBooks(draft);
    } else if (savedManualBooks.length > 0) {
      setManualBooks(savedManualBooks);
    }
    setSetupHydrated(true);
  }, []);

  useEffect(() => {
    if (!setupHydrated || step !== 'manual') return;
    saveManualBooksDraft(manualBooks);
  }, [manualBooks, setupHydrated, step]);

  const handleDemo = () => {
    const data = loadDemoData();
    saveUserData(data);
    clearManualBooksDraft();
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
      const incoming = importedData as UserData;
      const current = existingData || loadUserData();
      saveWereadData(incoming);
      const currentManualBooks = current?.books.filter(isManualBook) || [];
      const incomingTitleKeys = new Set(incoming.books.map(book => `${book.title.trim()}::${book.author.trim()}`));
      const preservedManualBooks = currentManualBooks.filter(book => !incomingTitleKeys.has(`${book.title.trim()}::${book.author.trim()}`));
      const preservedManualIds = new Set(preservedManualBooks.map(book => book.id));
      const next: UserData = {
        ...incoming,
        books: [...incoming.books, ...preservedManualBooks],
        highlights: [...incoming.highlights, ...(current?.highlights.filter(highlight => preservedManualIds.has(highlight.bookId)) || [])],
        readingEvents: [...incoming.readingEvents, ...(current?.readingEvents.filter(event => preservedManualIds.has(event.bookId)) || [])],
      };
      saveUserData(next);
      clearManualBooksDraft();
      setExistingData(next);
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

    const current = existingData || loadUserData();
    const preservedBooks = current?.books.filter(book => !isManualBook(book)) || [];
    const data: UserData = {
      userId: current?.userId || 'manual-user',
      books: [...preservedBooks, ...validBooks],
      highlights: current?.highlights || [],
      readingEvents: current?.readingEvents || [],
      recommendations: current?.recommendations || [],
      personas: current?.personas || [],
      lastSyncTime: new Date().toISOString(),
      source: current?.source === 'weread' ? 'weread' : 'manual',
    };
    const manualIds = new Set(validBooks.map(book => book.id));
    const currentManualData = loadManualData();
    saveManualData({
      ...data,
      books: validBooks,
      highlights: currentManualData?.highlights || data.highlights.filter(highlight => manualIds.has(highlight.bookId)),
      readingEvents: currentManualData?.readingEvents || data.readingEvents.filter(event => manualIds.has(event.bookId)),
      recommendations: currentManualData?.recommendations || [],
      personas: currentManualData?.personas || [],
      source: 'manual',
    });
    setHasManualData(true);
    saveUserData(data);
    clearManualBooksDraft();
    setExistingData(data);
    router.push('/');
  };

  const handleDirectManualEntry = () => {
    const manualData = loadManualData();
    if (!manualData || manualData.books.length === 0) return;
    saveUserData(manualData);
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
              <button
                type="button"
                onClick={() => setShowApiGuide(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-ink-deep"
              >
                <CircleHelp className="h-3.5 w-3.5 text-sprout-green" />
                如何找到微信读书 API Key？
              </button>
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => setStep('manual')}
                  className="flex-1 px-4 py-2.5 bg-paper-light border border-line-soft text-ink-deep rounded-md text-sm font-medium hover:bg-paper-mist transition-colors"
                >
                  {existingData && manualBooks.some(book => book.title.trim()) ? '继续编辑我的书籍' : '添加我的书籍'}
                </button>
                {hasManualData && (
                  <button
                    onClick={handleDirectManualEntry}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 border border-line-soft/70 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-paper-light hover:text-ink-deep"
                  >
                    直接进入 <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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

      {showApiGuide && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-deep/35 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setShowApiGuide(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-paper-warm p-5 shadow-[0_24px_80px_rgba(38,59,53,0.24)] sm:p-8"
            onClick={event => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line-soft/35 bg-paper-warm pb-4">
              <div>
                <span className="ink-label">API KEY GUIDE</span>
                <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>如何找到微信读书 API Key</h2>
                <p className="mt-2 text-sm leading-6 text-ink-soft">请按照下面的顺序操作：先进入设置，再打开微信读书 Skill，最后复制 API Key。</p>
              </div>
              <button
                type="button"
                onClick={() => setShowApiGuide(false)}
                className="icon-button shrink-0"
                title="关闭说明"
                aria-label="关闭说明"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 space-y-6">
              {[
                { step: '01', title: '进入设置', src: '/sticker/a.jpg' },
                { step: '02', title: '打开微信读书 Skill', src: '/sticker/b.jpg' },
                { step: '03', title: '复制 API Key', src: '/sticker/c.jpg' },
              ].map(item => (
                <figure key={item.src} className="border border-line-soft/35 bg-paper-light p-3 sm:p-4">
                  <figcaption className="mb-3 flex items-center gap-3 text-sm text-ink-deep">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sprout-green/20 text-xs text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>
                      {item.step}
                    </span>
                    {item.title}
                  </figcaption>
                  <Image
                    src={item.src}
                    alt={`${item.step} ${item.title}`}
                    width={1206}
                    height={2436}
                    className="h-auto max-h-[68vh] w-full object-contain"
                  />
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
