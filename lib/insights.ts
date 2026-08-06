import { Book, Category, Highlight, UserData, CATEGORY_COLORS } from './adapters/types';

export interface CategoryInsight {
  category: Category;
  count: number;
  seconds: number;
  percentage: number;
  color: string;
}

export interface TopicInsight {
  label: string;
  highlightCount: number;
  thoughtCount: number;
  bookCount: number;
  books: string[];
  percentage: number;
  source: 'highlight' | 'category';
  color: string;
}

export interface ReadingStats {
  books: Book[];
  totalSeconds: number;
  totalDays: number;
  finishedCount: number;
  pausedCount: number;
  readingCount: number;
  highlightCount: number;
  thoughtCount: number;
}

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function getYearBooks(data: UserData, year: number): Book[] {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  return data.books.filter(book => {
    if (book.status === 'unstarted') return false;
    const start = parseLocalDate(book.startDate || book.lastReadDate);
    const end = parseLocalDate(book.endDate || book.lastReadDate) || new Date();
    if (!start) return false;
    return start <= yearEnd && end >= yearStart;
  });
}

export function getMonthBooks(data: UserData, year: number, month: number): Book[] {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  return data.books.filter(book => {
    if (book.status === 'unstarted') return false;
    const start = parseLocalDate(book.startDate || book.lastReadDate);
    const end = parseLocalDate(book.endDate || book.lastReadDate) || new Date();
    if (!start) return false;
    return start <= monthEnd && end >= monthStart;
  });
}

export function getBookMonthReadingSeconds(book: Book, year: number, month: number): number {
  if (book.status === 'unstarted' || book.readingSeconds <= 0) return 0;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const start = parseLocalDate(book.startDate || book.lastReadDate);
  const end = parseLocalDate(book.endDate || book.lastReadDate) || new Date();
  if (!start || start > monthEnd || end < monthStart) return 0;

  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const overlapStart = start > monthStart ? start : monthStart;
  const overlapEnd = end < monthEnd ? end : monthEnd;
  const overlapDays = Math.max(0, Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1);
  return Math.round(book.readingSeconds * (overlapDays / totalDays));
}

export function getMonthLabel(month: number): string {
  return MONTHS[month - 1] || `${month}月`;
}

export function getReadingStats(books: Book[]): ReadingStats {
  return {
    books,
    totalSeconds: books.reduce((sum, book) => sum + book.readingSeconds, 0),
    totalDays: books.reduce((sum, book) => sum + book.readingDays, 0),
    finishedCount: books.filter(book => book.status === 'finished').length,
    pausedCount: books.filter(book => book.status === 'paused' || book.status === 'abandoned').length,
    readingCount: books.filter(book => book.status === 'reading').length,
    highlightCount: books.reduce((sum, book) => sum + book.highlightCount, 0),
    thoughtCount: books.reduce((sum, book) => sum + book.thoughtCount, 0),
  };
}

export function getCategoryInsights(books: Book[]): CategoryInsight[] {
  const counts = new Map<Category, { count: number; seconds: number }>();
  books.forEach(book => {
    const current = counts.get(book.category) || { count: 0, seconds: 0 };
    counts.set(book.category, {
      count: current.count + 1,
      seconds: current.seconds + book.readingSeconds,
    });
  });

  const total = books.length || 1;
  return Array.from(counts.entries())
    .map(([category, value]) => ({
      category,
      count: value.count,
      seconds: value.seconds,
      percentage: Math.round((value.count / total) * 100),
      color: CATEGORY_COLORS[category],
    }))
    .sort((a, b) => b.seconds - a.seconds || b.count - a.count);
}

export function getBookHighlights(highlights: Highlight[], bookId: string): Highlight[] {
  return highlights
    .filter(highlight => highlight.bookId === bookId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getHighlightScore(highlight: Highlight): number {
  return (highlight.isFeatured ? 5 : 0)
    + (highlight.thought ? 3 : 0)
    + (highlight.source === 'weread_personal' ? 1 : 0)
    + (highlight.content.length < 90 ? 1 : 0);
}

export function getTopHighlights(highlights: Highlight[], limit = 5): Highlight[] {
  return [...highlights]
    .sort((a, b) => getHighlightScore(b) - getHighlightScore(a) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getTopics(data: UserData, limit = 8): string[] {
  return getTopicInsights(data, limit).map(topic => topic.label);
}

const TOPIC_COLORS = ['#7FAE8F', '#93B8C6', '#C98D82', '#B9A8C5', '#D7C68C', '#86A99A', '#A8BE8A'];

export function getTopicInsights(data: UserData, limit = 8): TopicInsight[] {
  const bookMap = new Map(data.books.map(book => [book.id, book]));
  const entries = new Map<string, {
    highlightCount: number;
    thoughtCount: number;
    books: Set<string>;
    source: 'highlight' | 'category';
  }>();

  data.highlights
    .filter(highlight => highlight.source !== 'weread_public')
    .forEach(highlight => {
      const book = bookMap.get(highlight.bookId);
      const inferredTopics = getHighlightTopics(highlight);
      const topics = inferredTopics.length > 0
        ? inferredTopics
        : (book?.category ? [book.category] : []);

      topics.forEach(topic => {
        const current = entries.get(topic) || {
          highlightCount: 0,
          thoughtCount: 0,
          books: new Set<string>(),
          source: inferredTopics.length > 0 ? 'highlight' : 'category',
        };
        current.highlightCount += 1;
        current.thoughtCount += highlight.thought ? 1 : 0;
        if (book?.title) current.books.add(book.title);
        if (inferredTopics.length > 0) current.source = 'highlight';
        entries.set(topic, current);
      });
    });

  const sorted = [...entries.entries()]
    .map(([label, value]) => ({
      label,
      ...value,
      bookCount: value.books.size,
      books: [...value.books].slice(0, 3),
      score: value.highlightCount + value.books.size * 1.8 + value.thoughtCount * 0.7,
    }))
    .sort((a, b) => b.score - a.score || b.bookCount - a.bookCount || a.label.localeCompare(b.label))
    .slice(0, limit);
  const maxScore = sorted[0]?.score || 1;

  return sorted.map((topic, index) => ({
    label: topic.label,
    highlightCount: topic.highlightCount,
    thoughtCount: topic.thoughtCount,
    bookCount: topic.bookCount,
    books: topic.books,
    percentage: Math.max(12, Math.round((topic.score / maxScore) * 100)),
    source: topic.source,
    color: TOPIC_COLORS[index % TOPIC_COLORS.length],
  }));
}

export function getHighlightTopics(highlight: Highlight): string[] {
  const text = `${highlight.content} ${highlight.thought || ''}`;
  return [...new Set([
    ...highlight.topicTags.map(canonicalTopic),
    ...inferTextTopics(text),
  ])].filter(Boolean);
}

export function getBookEvidenceTopics(book: Book, highlights: Highlight[], limit = 5): string[] {
  const counts = new Map<string, number>();
  highlights
    .filter(highlight => highlight.bookId === book.id)
    .forEach(highlight => {
      getHighlightTopics(highlight).forEach(topic => counts.set(topic, (counts.get(topic) || 0) + 1));
    });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([topic]) => topic);
}

const aggregateTopicRules: { label: string; keywords: string[] }[] = [
  { label: '长期主义', keywords: ['长期', '复利', '耐心', '积累', '延迟满足', '时间', '坚持', '未来'] },
  { label: '认知偏差', keywords: ['认知', '偏见', '偏差', '判断', '选择', '理性', '决策', '思维', '直觉'] },
  { label: '组织与制度', keywords: ['制度', '组织', '政府', '市场', '财政', '激励', '治理', '权力', '规则', '管理'] },
  { label: '关系与自我', keywords: ['关系', '自我', '情绪', '孤独', '幸福', '成长', '边界', '身份', '人格', '亲密'] },
  { label: '文明与历史', keywords: ['文明', '历史', '社会', '人类', '地理', '传统', '时代', '国家', '战争', '文化'] },
  { label: '财富与决策', keywords: ['财富', '经济', '金钱', '风险', '投资', '成本', '贫穷', '收入', '资本', '消费'] },
  { label: '技术与系统', keywords: ['技术', '计算机', '系统', '工程', '代码', '软件', '设计', '科学', '网络', '机器'] },
  { label: '学习与成长', keywords: ['学习', '练习', '反馈', '能力', '技能', '教育', '训练', '方法', '习惯'] },
  { label: '注意力与媒介', keywords: ['注意力', '专注', '媒介', '信息', '娱乐', '阅读', '拖延', '屏幕', '传播'] },
];

function canonicalTopic(topic: string): string {
  const clean = topic.trim().replace(/[“”"'「」《》]/g, '');
  if (!clean || /人物|章节|朱元璋|历史人物|作者/.test(clean)) return '';
  const matched = aggregateTopicRules.find(rule => rule.keywords.some(keyword => clean.includes(keyword) || keyword.includes(clean)));
  return matched?.label || (clean.length >= 3 ? clean : '');
}

function inferTextTopics(text: string): string[] {
  return aggregateTopicRules.filter(rule => rule.keywords.some(keyword => text.includes(keyword))).map(rule => rule.label);
}

export function getReadingGaps(data: UserData): { label: string; detail: string; color: string }[] {
  const categoryInsights = getCategoryInsights(data.books.filter(book => book.status !== 'unstarted'));
  const seen = new Set(categoryInsights.map(item => item.category));
  const allCategories: Category[] = ['文学', '心理', '历史', '社科', '经济理财', '小说', '计算机'];
  const missing = allCategories.filter(category => !seen.has(category));

  if (missing.length > 0) {
    return missing.slice(0, 4).map(category => ({
      label: `${category}还没有留下足迹`,
      detail: '可以作为下一次阅读的轻微偏航，给地图留一个新入口。',
      color: CATEGORY_COLORS[category],
    }));
  }

  const lightest = [...categoryInsights].sort((a, b) => a.seconds - b.seconds)[0];
  if (!lightest) return [];
  return categoryInsights.length > 2 ? [
    {
      label: `${lightest.category}的阅读停留较少`,
      detail: '你的阅读重心已经很清晰，也可以偶尔为这个方向留出一小段时间，让地图出现新的入口。',
      color: lightest.color,
    },
    {
      label: '跨类别连接还可以增加',
      detail: `目前主要集中在${categoryInsights.slice(0, 2).map(item => item.category).join('与')}，可以选一本相邻类别的书做一次交叉阅读。`,
      color: '#93B8C6',
    },
  ] : [{
    label: `${lightest.category}的阅读停留较少`,
    detail: '你的阅读重心很清晰，也可以偶尔为这个方向留出一小段时间。',
    color: lightest.color,
  }];
}

export function getPeakMonth(books: Book[]): string {
  const monthCounts = new Array(12).fill(0);
  books.forEach(book => {
    const date = parseLocalDate(book.lastReadDate || book.startDate);
    if (date) monthCounts[date.getMonth()] += Math.max(book.readingDays, 1);
  });
  const peak = monthCounts.indexOf(Math.max(...monthCounts));
  return peak >= 0 && monthCounts[peak] > 0 ? MONTHS[peak] : '—';
}

export function getPersonaEvidence(data: UserData, year: number): string[] {
  const books = getYearBooks(data, year);
  const stats = getReadingStats(books);
  const topics = getTopics({
    ...data,
    highlights: data.highlights.filter(highlight => {
      const book = books.find(item => item.id === highlight.bookId);
      return Boolean(book);
    }),
  }, 1);
  return [
    `打开过 ${books.length} 本书`,
    `累计阅读 ${stats.totalDays} 天`,
    topics[0] ? `反复关注「${topics[0]}」` : `留下 ${stats.highlightCount} 条划线`,
  ];
}

export function getMonthlyPersonaEvidence(data: UserData, year: number, month: number): string[] {
  const books = getMonthBooks(data, year, month);
  const stats = getReadingStats(books);
  const highlights = data.highlights.filter(highlight => {
    const date = parseLocalDate(highlight.createdAt);
    return Boolean(date && date.getFullYear() === year && date.getMonth() === month - 1);
  });
  const topics = getTopics({ ...data, highlights }, 1);
  return [
    `打开过 ${books.length} 本书`,
    `累计阅读 ${stats.totalDays} 天`,
    topics[0] ? `反复关注「${topics[0]}」` : `留下 ${highlights.length || stats.highlightCount} 条划线`,
  ];
}
