'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Clock3, Info, Leaf, PenLine, Sparkles } from 'lucide-react';
import NavBar from '@/components/ui/NavBar';
import HighlightQuote from '@/components/insights/HighlightQuote';
import BookCover from '@/components/ui/BookCover';
import { UserData, formatReadingTime } from '@/lib/adapters/types';
import { loadUserData } from '@/lib/store';
import { calculateMonthlyPersona } from '@/lib/ai';
import { getBookMonthReadingSeconds, getCategoryInsights, getMonthBooks, getMonthLabel, getMonthlyPersonaEvidence, getReadingStats, getTopHighlights, parseLocalDate } from '@/lib/insights';

const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 8;

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getMonthHighlights(data: UserData, year: number, month: number) {
  return data.highlights.filter(highlight => {
    const date = parseLocalDate(highlight.createdAt);
    return highlight.source === 'weread_personal'
      && Boolean(date && date.getFullYear() === year && date.getMonth() === month - 1);
  });
}

function buildMonthOptions(data: UserData) {
  const keys = new Set<string>();
  data.books.forEach(book => {
    [book.startDate, book.lastReadDate, book.endDate].forEach(value => {
      const date = parseLocalDate(value);
      if (date) keys.add(monthKey(date.getFullYear(), date.getMonth() + 1));
    });
  });
  data.highlights.forEach(highlight => {
    const date = parseLocalDate(highlight.createdAt);
    if (date) keys.add(monthKey(date.getFullYear(), date.getMonth() + 1));
  });
  data.personas.filter(persona => persona.period === 'month' && persona.month).forEach(persona => {
    keys.add(monthKey(persona.year, persona.month || 1));
  });
  if (keys.size === 0) keys.add(monthKey(DEFAULT_YEAR, DEFAULT_MONTH));
  return [...keys].sort((a, b) => b.localeCompare(a)).map(key => {
    const [year, month] = key.split('-').map(Number);
    return { key, year, month };
  });
}

export default function PersonaPage() {
  const [data, setData] = useState<UserData | null>(null);
  const [selectedKey, setSelectedKey] = useState(monthKey(DEFAULT_YEAR, DEFAULT_MONTH));

  useEffect(() => {
    const stored = loadUserData();
    if (!stored) return;
    setData(stored);
    const latest = buildMonthOptions(stored)[0];
    setSelectedKey(latest.key);
  }, []);

  if (!data) return null;

  const monthOptions = buildMonthOptions(data);
  const selectedIndex = Math.max(0, monthOptions.findIndex(option => option.key === selectedKey));
  const selected = monthOptions[selectedIndex] || monthOptions[0];
  const { year, month } = selected;
  const monthLabel = `${year} · ${getMonthLabel(month)}`;
  const persona = calculateMonthlyPersona(data, year, month);
  const monthBooks = getMonthBooks(data, year, month);
  const stats = getReadingStats(monthBooks);
  const categoryInsights = getCategoryInsights(monthBooks).slice(0, 5);
  const evidence = getMonthlyPersonaEvidence(data, year, month);
  const monthHighlights = getMonthHighlights(data, year, month);
  const representativeHighlight = monthHighlights.find(highlight => highlight.content === persona?.representativeHighlight)
    || getTopHighlights(monthHighlights, 1)[0];
  const longestByMonthSeconds = [...monthBooks].sort((a, b) => getBookMonthReadingSeconds(b, year, month) - getBookMonthReadingSeconds(a, year, month))[0] || monthBooks[0];
  const personaBook = monthBooks.find(book => book.title === persona?.longestBook);
  const representativeBook = data.source === 'weread' && personaBook ? personaBook : longestByMonthSeconds;
  const representativeBookMonthlySeconds = persona?.monthlyReadingSeconds
    || (representativeBook ? getBookMonthReadingSeconds(representativeBook, year, month) : 0);
  const hasSyncedMonthlyReadingSeconds = Boolean(persona?.monthlyReadingSeconds);
  const topCategory = categoryInsights[0]?.category || persona?.topCategories[0] || '当前主线';
  const finishedRate = monthBooks.length ? Math.round((stats.finishedCount / monthBooks.length) * 100) : 0;
  const thoughtDensity = monthHighlights.length ? Math.round((monthHighlights.filter(highlight => highlight.thought).length / monthHighlights.length) * 100) : 0;
  const totalSeconds = persona?.totalSeconds || stats.totalSeconds;
  const monthlyAdvice = persona ? [
    persona.suggestion,
    ` 具体到 ${monthLabel}，你的阅读重心落在「${topCategory}」，这不是简单的类别偏好，而是在提示：这个月你可能一直在用不同文本回答同一个隐含问题。下个月可以把这个问题写出来，再决定书单，而不是先堆书。`,
    ` 从行为上看，你这个月打开 ${monthBooks.length} 本书，完成率约 ${finishedRate}%，划线里有想法的比例约 ${thoughtDensity}%。如果完成率低但想法密度高，说明这些书更像材料库；如果完成率高但想法密度低，则适合补一次复盘，把读完变成真的留下。`,
  ].join('') : '';

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-[1280px] px-5 pb-16 pt-8 sm:px-8">
        <header className="mb-8 flex flex-col justify-between gap-6 border-b border-line-soft/40 pb-8 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="ink-label">READMIND / MONTHLY PERSONA</span>
              <span className="text-xs text-ink-soft">行为描述，不是心理诊断</span>
            </div>
            <h1 className="mt-4 text-4xl text-ink-deep sm:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>这个月，你在被什么问题吸引？</h1>
          </div>
          <div className="inline-flex w-fit items-center gap-2 border border-line-soft/45 bg-paper-warm p-1">
            <button
              onClick={() => setSelectedKey(monthOptions[Math.min(selectedIndex + 1, monthOptions.length - 1)]?.key || selectedKey)}
              className="icon-button border-0"
              disabled={selectedIndex >= monthOptions.length - 1}
              title="上个月"
              aria-label="上个月"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-28 text-center text-xl text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{monthLabel}</span>
            <button
              onClick={() => setSelectedKey(monthOptions[Math.max(selectedIndex - 1, 0)]?.key || selectedKey)}
              className="icon-button border-0"
              disabled={selectedIndex <= 0}
              title="下个月"
              aria-label="下个月"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {persona ? (
          <>
            <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="paper-wash relative overflow-hidden border-y border-line-soft/35 px-6 py-10 sm:px-10">
                <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-soft/45" />
                <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-soft/35" />
                <div className="relative z-10 mx-auto max-w-3xl text-center">
                  <span className="ink-label">MONTH RING / {monthLabel}</span>
                  <h2 className="mt-5 text-5xl leading-tight text-ink-deep sm:text-6xl" style={{ fontFamily: 'var(--font-display)' }}>{persona.name}</h2>
                  <p className="mx-auto mt-6 max-w-2xl text-lg leading-10 text-ink-soft" style={{ fontFamily: 'var(--font-display)' }}>
                    {persona.description}
                  </p>
                  <div className="mt-9 flex flex-wrap justify-center gap-3">
                    {evidence.map(item => (
                      <span key={item} className="border border-line-soft/50 bg-paper-light/70 px-3 py-1.5 text-xs text-ink-soft">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                {categoryInsights.map((item, index) => (
                  <div
                    key={item.category}
                    className="absolute hidden items-center gap-2 text-xs text-ink-soft lg:flex"
                    style={{ left: `${10 + (index % 2) * 74}%`, top: `${16 + index * 15}%` }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.category} · {item.percentage}%
                  </div>
                ))}
              </div>

              <aside className="border-y border-line-soft/35 py-7">
                <span className="ink-label">MONTHLY EVIDENCE</span>
                <h3 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>这个判断从哪里来</h3>
                <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6">
                  {[
                    { label: '月度时长', value: formatReadingTime(totalSeconds), icon: Clock3 },
                    { label: '打开书籍', value: `${monthBooks.length} 本`, icon: BookOpen },
                    { label: '本月划线', value: `${persona.highlightCount || monthHighlights.length} 条`, icon: PenLine },
                    { label: '核心主题', value: persona.topTopic, icon: Sparkles },
                    { label: '读完比例', value: `${finishedRate}%`, icon: Leaf },
                    { label: '想法密度', value: `${thoughtDensity}%`, icon: Info },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label}>
                        <Icon className="h-4 w-4 text-sprout-green" />
                        <p className="mt-2 text-[11px] text-ink-soft">{item.label}</p>
                        <p className="mt-1 text-base text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{item.value}</p>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </section>

            <section className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
              <div className="section-rule pt-7">
                <span className="ink-label">MONTHLY IMMERSION</span>
                <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>本月最长沉浸作品</h2>
                {representativeBook ? (
                  <div className="mt-6 flex items-start gap-5">
                    <BookCover book={representativeBook} size="lg" />
                    <div>
                      <p className="text-xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>{representativeBook.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">{representativeBook.author}</p>
                      <p className="mt-5 text-sm leading-7 text-ink-soft">
                        {data.source === 'weread' && hasSyncedMonthlyReadingSeconds
                          ? `微信读书月度统计显示，你这个月在这本书里阅读了 ${formatReadingTime(representativeBookMonthlySeconds)}。`
                          : `按本月阅读区间估算，你这个月在这本书里停留了 ${formatReadingTime(representativeBookMonthlySeconds)}，留下 ${representativeBook.highlightCount} 条划线。`}
                      </p>
                    </div>
                  </div>
                ) : <p className="mt-6 text-sm text-ink-soft">这个月还没有代表书籍。</p>}
              </div>

              <div className="section-rule pt-7">
                <span className="ink-label">DEEPER READING ANALYSIS</span>
                <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>这个月的阅读结构</h2>
                <div className="mt-6 space-y-4 text-sm leading-7 text-ink-soft">
                  <p>你的本月阅读不是孤立书名的排列，而是由「{topCategory}」牵引出的注意力分布。{categoryInsights.length > 1 ? `第二、第三类别分别是「${categoryInsights[1]?.category}」「${categoryInsights[2]?.category || categoryInsights[1]?.category}」，说明你在主线之外也有横向取样。` : '类别集中度较高，适合做一次主题深读。'}</p>
                  <p>从划线看，{monthHighlights.length > 0 ? `你留下了 ${monthHighlights.length} 条本月文本痕迹，其中 ${monthHighlights.filter(highlight => highlight.thought).length} 条带有自己的想法。` : '这个月的划线数据还不多，系统更多依赖阅读行为判断。'}真正值得关注的不是数量，而是这些句子是否反复指向同一个问题。</p>
                </div>
              </div>
            </section>

            <section className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
              <div className="section-rule pt-7">
                <span className="ink-label">MONTHLY LINE</span>
                <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>月度代表摘抄</h2>
                <p className="mt-3 text-xs leading-6 text-ink-soft">
                  选择逻辑：优先使用本月内被标为重点的划线；若没有重点标记，则按“有想法、来自我的划线、适合回看、时间较新”的综合分选出最能代表这个月的一句。
                </p>
                {representativeHighlight ? (
                  <div className="mt-6">
                    <HighlightQuote
                      highlight={representativeHighlight}
                      book={data.books.find(book => book.id === representativeHighlight.bookId)}
                      featured
                    />
                  </div>
                ) : <p className="mt-6 text-sm text-ink-soft">还没有能代表这个月的摘抄。</p>}
              </div>
              <div className="section-rule pt-7">
                <span className="ink-label">NEXT MONTH</span>
                <h2 className="mt-2 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>下个月阅读建议</h2>
                <p className="mt-6 border-l-2 border-sprout-green pl-4 text-base leading-8 text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>
                  {monthlyAdvice}
                </p>
              </div>
            </section>

            <section className="mt-12 flex items-center justify-center gap-2 border-t border-line-soft/35 pt-6 text-xs text-ink-soft">
              <Info className="h-4 w-4" />
              这是基于月度阅读行为生成的描述，不是心理诊断。
            </section>
          </>
        ) : (
          <div className="py-20 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-line-soft" />
            <p className="mt-4 text-ink-soft" style={{ fontFamily: 'var(--font-display)' }}>{monthLabel} 还没有足够的阅读记录。</p>
          </div>
        )}
      </main>
    </div>
  );
}
