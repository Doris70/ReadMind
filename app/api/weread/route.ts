import { NextRequest, NextResponse } from 'next/server';
import { Book, Highlight, UserData, Category, ReadingPersona } from '@/lib/adapters/types';

const WEREAD_API = 'https://i.weread.qq.com/api/agent/gateway';
const SKILL_VERSION = '1.0.4';
const READING_TIME_KEYS = [
  'recordReadingTime',
  'readingTime',
  'totalReadingTime',
  'totalReadTime',
  'readTime',
  'readTimeSeconds',
  'readSeconds',
  'readingSeconds',
  'totalReadingSeconds',
  'totalReadSeconds',
  'bookReadTime',
  'readingDuration',
  'readDuration',
  'duration',
];

async function callWeReadAPI(apiKey: string, apiName: string, params: Record<string, unknown> = {}) {
  const res = await fetch(WEREAD_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ api_name: apiName, skill_version: SKILL_VERSION, ...params }),
  });
  return res.json();
}

function normalizeCategory(cat: string): Category {
  if (!cat) return '文学';
  const c = cat.toLowerCase();
  if (c.includes('文学') || c.includes('散文') || c.includes('诗歌')) return '文学';
  if (c.includes('小说')) return '小说';
  if (c.includes('心理')) return '心理';
  if (c.includes('历史') || c.includes('传记')) return '历史';
  if (c.includes('社科') || c.includes('社会') || c.includes('哲学')) return '社科';
  if (c.includes('经济') || c.includes('理财') || c.includes('商业') || c.includes('管理') || c.includes('金融')) return '经济理财';
  if (c.includes('计算机') || c.includes('编程') || c.includes('技术') || c.includes('互联网')) return '计算机';
  return '文学';
}

function timestampToDate(ts: number | undefined | null): string | null {
  if (!ts) return null;
  const normalized = ts > 100000000000 ? ts : ts * 1000;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function firstDateFromFields(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'number') {
      const date = timestampToDate(value);
      if (date) return date;
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
  }
  return null;
}

function normalizeReadingSeconds(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  // Some WeRead gateway responses use milliseconds for accumulated reading time.
  return Math.round(value > 10000000 ? value / 1000 : value);
}

function numberFromFields(data: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function deepNumberFromFields(data: unknown, keys: string[], depth = 0): number | undefined {
  if (!data || typeof data !== 'object' || depth > 3) return undefined;
  const direct = numberFromFields(data as Record<string, unknown>, keys);
  if (direct !== undefined) return direct;
  for (const value of Object.values(data as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const nested = deepNumberFromFields(value, keys, depth + 1);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function nestedObjectFromFields(data: unknown, keys: string[], depth = 0): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || depth > 4) return null;
  const record = data as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  for (const value of Object.values(record)) {
    const nested = nestedObjectFromFields(value, keys, depth + 1);
    if (nested) return nested;
  }
  return null;
}

function getProgressPayload(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  return nestedObjectFromFields(data, ['book', 'progress', 'data']) || data as Record<string, unknown>;
}

function buildReadLongestMap(...statsList: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const stats of statsList) {
    if (!stats || typeof stats !== 'object') continue;
    const readLongest = (stats as Record<string, unknown>).readLongest;
    if (!Array.isArray(readLongest)) continue;
    for (const item of readLongest) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const bookInfo = (record.book || record.albumInfo) as Record<string, unknown> | undefined;
      const bookId = bookInfo ? String(bookInfo.bookId || bookInfo.albumId || '') : '';
      const seconds = normalizeReadingSeconds(record.readTime ?? record.recordReadingTime);
      if (bookId && seconds > (map.get(bookId) || 0)) {
        map.set(bookId, seconds);
      }
    }
  }
  return map;
}

function timestampForYear(year: number): number {
  return Math.floor(new Date(`${year}-07-01T00:00:00+08:00`).getTime() / 1000);
}

function timestampForMonth(year: number, month: number): number {
  return Math.floor(new Date(`${year}-${String(month).padStart(2, '0')}-15T00:00:00+08:00`).getTime() / 1000);
}

function countFinishedFromStats(stats: unknown): number {
  if (!stats || typeof stats !== 'object') return 0;
  const readStat = (stats as Record<string, unknown>).readStat;
  if (!Array.isArray(readStat)) return 0;
  const finished = readStat.find(item => {
    if (!item || typeof item !== 'object') return false;
    return String((item as Record<string, unknown>).stat || '').includes('读完');
  }) as Record<string, unknown> | undefined;
  const counts = String(finished?.counts || '');
  return Number(counts.match(/\d+/)?.[0] || 0);
}

function buildAnnualPersonas(statsByYear: Map<number, unknown>, highlights: Highlight[]): ReadingPersona[] {
  return [...statsByYear.entries()].map(([year, stats]) => {
    const record = stats && typeof stats === 'object' ? stats as Record<string, unknown> : {};
    const longest = Array.isArray(record.readLongest) ? record.readLongest[0] as Record<string, unknown> | undefined : undefined;
    const longestBook = longest?.book as Record<string, unknown> | undefined;
    const preferCategory = Array.isArray(record.preferCategory) ? record.preferCategory.slice(0, 3) as Record<string, unknown>[] : [];
    const topCategories: Category[] = preferCategory
      .map(item => normalizeCategory(String(item.categoryTitle || item.parentCategoryTitle || '')))
      .filter((category, index, arr) => arr.indexOf(category) === index)
      .slice(0, 3);
    const yearHighlights = highlights.filter(highlight => highlight.createdAt.startsWith(String(year)));
    const representativeHighlight = yearHighlights[0]?.content || '';
    const totalSeconds = normalizeReadingSeconds(record.totalReadTime);
    const readDays = Number(record.readDays || 0);
    const topTopic = topCategories[0] || '阅读兴趣';
    const name = totalSeconds > 180000 ? '深度沉浸者' : totalSeconds > 72000 ? '稳定阅读者' : '安静探索者';

    return {
      year,
      period: 'year' as const,
      name,
      description: `这一年你把最多时间交给了「${String(longestBook?.title || '未命名作品')}」，阅读重心集中在${topCategories.join('、') || '多元主题'}。`,
      topCategories: topCategories.length > 0 ? topCategories : ['文学' as Category],
      longestBook: String(longestBook?.title || ''),
      topTopic,
      peakMonth: '年度统计',
      totalSeconds,
      finishedCount: countFinishedFromStats(stats),
      highlightCount: yearHighlights.length,
      representativeHighlight,
      suggestion: `下一年可以沿着「${topTopic}」继续深读，同时挑一本相邻领域的书做对照。你已经积累了 ${readDays} 个有效阅读日，接下来更值得关注的是：哪些问题反复把你带回同一类书，以及哪些主题还缺少另一种视角。`,
    };
  }).filter(persona => persona.totalSeconds > 0 || persona.longestBook);
}

function buildMonthlyPersonas(statsByMonth: Map<string, unknown>, highlights: Highlight[]): ReadingPersona[] {
  return [...statsByMonth.entries()].map(([key, stats]) => {
    const [yearText, monthText] = key.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const record = stats && typeof stats === 'object' ? stats as Record<string, unknown> : {};
    const longest = Array.isArray(record.readLongest) ? record.readLongest[0] as Record<string, unknown> | undefined : undefined;
    const longestBook = longest?.book as Record<string, unknown> | undefined;
    const preferCategory = Array.isArray(record.preferCategory) ? record.preferCategory.slice(0, 3) as Record<string, unknown>[] : [];
    const topCategories: Category[] = preferCategory
      .map(item => normalizeCategory(String(item.categoryTitle || item.parentCategoryTitle || '')))
      .filter((category, index, arr) => arr.indexOf(category) === index)
      .slice(0, 3);
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthHighlights = highlights.filter(highlight => highlight.createdAt.startsWith(monthPrefix));
    const representativeHighlight = monthHighlights[0]?.content || '';
    const totalSeconds = normalizeReadingSeconds(record.totalReadTime);
    const readDays = Number(record.readDays || 0);
    const topTopic = topCategories[0] || '阅读兴趣';
    const name = totalSeconds > 90000 ? '深度沉浸者' : totalSeconds > 36000 ? '稳定阅读者' : monthHighlights.length > 8 ? '边读边想者' : '安静观察者';
    const longestTitle = String(longestBook?.title || '未命名作品');
    const categoryText = topCategories.join('、') || '多元主题';

    return {
      year,
      month,
      period: 'month' as const,
      name,
      description: `${month} 月你把最多时间交给了「${longestTitle}」，阅读重心集中在${categoryText}。这个月累计阅读 ${formatSecondsForText(totalSeconds)}，有效阅读 ${readDays} 天；如果把阅读看成一条思考线，这个月的线索更像是在为「${topTopic}」寻找证据，而不是随意翻过。`,
      topCategories: topCategories.length > 0 ? topCategories : ['文学' as Category],
      longestBook: longestTitle,
      topTopic,
      peakMonth: `${month}月`,
      totalSeconds,
      finishedCount: countFinishedFromStats(stats),
      highlightCount: monthHighlights.length,
      representativeHighlight,
      suggestion: `下个月可以继续保留「${topTopic}」这条线，但建议把它变成一个更具体的问题：我到底想理解什么？先选一本主书深入，再找一本不同类别的书形成对照，月底用 3 条划线和 1 段自己的话收束。这样推荐和知识地图会更容易长出真正属于你的连接。`,
    };
  }).filter(persona => persona.totalSeconds > 0 || persona.longestBook);
}

function formatSecondsForText(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes} 分钟`;
  return `${hours} 小时 ${minutes} 分钟`;
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey) {
      return NextResponse.json({ error: '缺少 API Key' }, { status: 400 });
    }

    // 1. 获取书架
    const shelfData = await callWeReadAPI(apiKey, '/shelf/sync');
    if (!shelfData.books && !shelfData.albums) {
      return NextResponse.json({ error: '书架同步失败', detail: JSON.stringify(shelfData).slice(0, 200) }, { status: 400 });
    }

    const shelfBooks: Record<string, unknown>[] = shelfData.books || [];

    // 2. 获取笔记本概览
    const notesData = await callWeReadAPI(apiKey, '/user/notebooks', { count: 100 });
    const noteBooks: Record<string, unknown>[] = notesData.books || [];

    const noteStatsMap = new Map<string, { noteCount: number; reviewCount: number }>();
    for (const nb of noteBooks) {
      const bid = String((nb as Record<string, unknown>).bookId || '');
      noteStatsMap.set(bid, {
        noteCount: ((nb as Record<string, unknown>).noteCount as number) || 0,
        reviewCount: ((nb as Record<string, unknown>).reviewCount as number) || 0,
      });
    }

    const [monthlyStats, overallStats] = await Promise.all([
      callWeReadAPI(apiKey, '/readdata/detail', { mode: 'monthly' }).catch(() => null),
      callWeReadAPI(apiKey, '/readdata/detail', { mode: 'overall' }).catch(() => null),
    ]);
    const currentYear = new Date().getFullYear();
    const registYear = overallStats && typeof overallStats === 'object'
      ? new Date((((overallStats as Record<string, unknown>).registTime as number) || timestampForYear(currentYear)) * 1000).getFullYear()
      : currentYear;
    const yearsToFetch = Array.from({ length: Math.max(1, currentYear - registYear + 1) }, (_, index) => registYear + index);
    const annualStatsEntries = await Promise.all(yearsToFetch.map(async year => {
      const stats = await callWeReadAPI(apiKey, '/readdata/detail', { mode: 'annually', baseTime: timestampForYear(year) }).catch(() => null);
      return [year, stats] as const;
    }));
    const annualStatsByYear = new Map<number, unknown>(annualStatsEntries);
    const currentMonthIndex = new Date().getMonth();
    const monthsToFetch = Array.from({ length: 24 }, (_, index) => {
      const date = new Date(currentYear, currentMonthIndex - index, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    }).filter(item => item.year >= registYear);
    const monthlyStatsEntries = await Promise.all(monthsToFetch.map(async item => {
      const stats = await callWeReadAPI(apiKey, '/readdata/detail', { mode: 'monthly', baseTime: timestampForMonth(item.year, item.month) }).catch(() => null);
      return [`${item.year}-${String(item.month).padStart(2, '0')}`, stats] as const;
    }));
    const monthlyStatsByMonth = new Map<string, unknown>(monthlyStatsEntries);
    const rankedReadingTimeMap = buildReadLongestMap(monthlyStats, overallStats, ...annualStatsEntries.map(([, stats]) => stats), ...monthlyStatsEntries.map(([, stats]) => stats));

    // 3. 为每本书获取阅读进度和累计阅读秒数
    const progressMap = new Map<string, { progress: number; readingTime: number; finishTime?: number; firstReadTime?: number; readingDays?: number }>();
    const bookIdsToFetch = shelfBooks
      .map(sb => String((sb as Record<string, unknown>).bookId || ''))
      .filter(Boolean);
    const batchSize = 8;
    for (let index = 0; index < bookIdsToFetch.length; index += batchSize) {
      const batch = bookIdsToFetch.slice(index, index + batchSize);
      const progressResults = await Promise.all(batch.map(async bookId => {
        try {
          const pd = await callWeReadAPI(apiKey, '/book/getprogress', { bookId });
          return { bookId, data: getProgressPayload(pd) };
        } catch {
          return { bookId, data: null };
        }
      }));
      for (const result of progressResults) {
        const progressBook = result.data;
        if (!progressBook) continue;
        const progressValue = deepNumberFromFields(progressBook, ['progress', 'readingProgress']) || 0;
        const readingTimeValue = deepNumberFromFields(progressBook, READING_TIME_KEYS);
        progressMap.set(result.bookId, {
          progress: Math.min(progressValue / 100, 1),
          readingTime: normalizeReadingSeconds(readingTimeValue),
          finishTime: deepNumberFromFields(progressBook, ['finishTime', 'finishedTime', 'finishReadTime']),
          firstReadTime: deepNumberFromFields(progressBook, ['firstReadTime', 'firstReadingTime', 'startReadingTime', 'startReadTime', 'isStartReadingTime']),
          readingDays: deepNumberFromFields(progressBook, ['readingDays', 'readDays', 'totalReadDays']),
        });
      }
    }

    // 4. 标准化书籍
    const books: Book[] = shelfBooks.map((b: Record<string, unknown>, i: number) => {
      const bookId = String((b as Record<string, unknown>).bookId || i);
      const finishReading = (b as Record<string, unknown>).finishReading === 1;
      const readUpdateTime = (b as Record<string, unknown>).readUpdateTime as number;
      const pi = progressMap.get(bookId);
      const ns = noteStatsMap.get(bookId);
      const progress = pi?.progress ?? (finishReading ? 1 : 0);
      const shelfReadingSeconds = normalizeReadingSeconds(deepNumberFromFields(b, READING_TIME_KEYS));
      const rankedReadingSeconds = rankedReadingTimeMap.get(bookId) || 0;
      const hasRealTrace = Boolean(pi?.firstReadTime || pi?.finishTime || pi?.readingTime || readUpdateTime || progress > 0 || finishReading);
      const startDate = firstDateFromFields(b, [
        'firstReadTime',
        'firstReadingTime',
        'startReadingTime',
        'startReadTime',
      ]) || timestampToDate(pi?.firstReadTime) || null;

      let status: Book['status'] = 'unstarted';
      if (finishReading || progress >= 1) status = 'finished';
      else if (progress > 0) status = 'reading';

      return {
        id: `wr_${bookId}`,
        sourceBookId: bookId,
        title: ((b as Record<string, unknown>).title as string) || '未知书名',
        author: ((b as Record<string, unknown>).author as string) || '未知作者',
        coverUrl: ((b as Record<string, unknown>).cover as string) || undefined,
        category: normalizeCategory(((b as Record<string, unknown>).category as string) || ''),
        status,
        startDate,
        endDate: pi?.finishTime ? timestampToDate(pi.finishTime) : null,
        lastReadDate: timestampToDate(readUpdateTime),
        dateSource: hasRealTrace ? 'real' as const : 'manual' as const,
        progress: Math.min(progress, 1),
        readingSeconds: Math.max(pi?.readingTime || 0, shelfReadingSeconds, rankedReadingSeconds),
        readingDays: pi?.readingDays || 0,
        highlightCount: ns?.noteCount || 0,
        thoughtCount: ns?.reviewCount || 0,
        isPinned: ((b as Record<string, unknown>).isTop as number) === 1,
        deepLink: ((b as Record<string, unknown>).deepLink as string) || undefined,
      };
    });

    // 5. 获取划线内容（前10本有笔记的书）
    const highlights: Highlight[] = [];
    const booksWithNotes = noteBooks.filter(nb => ((nb as Record<string, unknown>).noteCount as number) > 0).slice(0, 10);

    for (const nb of booksWithNotes) {
      const bookId = String((nb as Record<string, unknown>).bookId || '');
      if (!bookId) continue;
      try {
        const bd = await callWeReadAPI(apiKey, '/book/bookmarklist', { bookId });
        const updated: Record<string, unknown>[] = bd.updated || [];
        const chapters: Record<string, unknown>[] = bd.chapters || [];
        const chapterMap = new Map<number, string>();
        for (const ch of chapters) {
          chapterMap.set((ch as Record<string, unknown>).chapterUid as number, (ch as Record<string, unknown>).title as string);
        }
        for (const h of updated.slice(0, 20)) {
          const chUid = (h as Record<string, unknown>).chapterUid as number;
          highlights.push({
            id: `wh_${(h as Record<string, unknown>).bookmarkId || highlights.length}`,
            bookId: `wr_${bookId}`,
            chapter: chapterMap.get(chUid) || '',
            content: ((h as Record<string, unknown>).markText as string) || '',
            createdAt: timestampToDate((h as Record<string, unknown>).createTime as number) || '',
            source: 'weread_personal' as const,
            isFeatured: false,
            topicTags: [],
          });
        }
      } catch { /* skip */ }
    }

    const earliestHighlightByBook = new Map<string, string>();
    for (const h of highlights) {
      const current = earliestHighlightByBook.get(h.bookId);
      if (h.createdAt && (!current || h.createdAt < current)) {
        earliestHighlightByBook.set(h.bookId, h.createdAt.slice(0, 10));
      }
    }

    for (const book of books) {
      const earliestHighlight = earliestHighlightByBook.get(book.id);
      if (!book.startDate && earliestHighlight) {
        book.startDate = earliestHighlight;
      }
      if (!book.startDate && book.lastReadDate && book.progress > 0) {
        book.startDate = book.lastReadDate;
      }
      if (!book.readingDays && book.startDate && book.lastReadDate) {
        const start = new Date(book.startDate);
        const end = new Date(book.endDate || book.lastReadDate);
        const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
        book.readingDays = days;
      }
    }

    // 6. 获取想法（前5本）
    const booksWithThoughts = noteBooks.filter(nb => ((nb as Record<string, unknown>).reviewCount as number) > 0).slice(0, 5);
    for (const nb of booksWithThoughts) {
      const bookId = String((nb as Record<string, unknown>).bookId || '');
      if (!bookId) continue;
      try {
        const rd = await callWeReadAPI(apiKey, '/review/list/mine', { bookid: bookId, count: 10 });
        const reviews: Record<string, unknown>[] = rd.reviews || [];
        for (const r of reviews) {
          const review = (r as Record<string, unknown>).review as Record<string, unknown>;
          if (!review) continue;
          const abstract = (review.abstract as string) || '';
          const content = (review.content as string) || '';
          if (!content) continue;
          const mh = highlights.find(h => h.bookId === `wr_${bookId}` && h.content === abstract);
          if (mh) mh.thought = content;
        }
      } catch { /* skip */ }
    }

    const personas = [
      ...buildMonthlyPersonas(monthlyStatsByMonth, highlights),
      ...buildAnnualPersonas(annualStatsByYear, highlights),
    ];

    const userData: UserData = {
      userId: 'weread-user',
      books,
      highlights,
      readingEvents: [],
      recommendations: [],
      personas,
      lastSyncTime: new Date().toISOString(),
      source: 'weread',
    };

    return NextResponse.json({ success: true, data: userData, bookCount: books.length, highlightCount: highlights.length });
  } catch (error) {
    return NextResponse.json({ error: '同步失败', detail: String(error) }, { status: 500 });
  }
}
