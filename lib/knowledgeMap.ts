import { Book, Highlight, UserData, Category, CATEGORY_COLORS } from './adapters/types';
import { parseLocalDate } from './insights';

export type KnowledgeNodeType = 'book' | 'theme' | 'idea';
export type KnowledgeEdgeType = 'contains' | 'shared' | 'supports' | 'from_book';
export type KnowledgeRange = '7d' | '30d' | 'year' | 'all';

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  weight: number;
  bookIds: string[];
  highlightIds: string[];
  x: number;
  y: number;
  color: string;
  description: string;
  category?: Category;
  origin?: 'thought' | 'highlight' | 'inferred';
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: KnowledgeEdgeType;
  label: string;
  weight: number;
}

export interface KnowledgeInsight {
  title: string;
  detail: string;
}

export interface KnowledgeMapData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  insights: KnowledgeInsight[];
  summary: string;
}

const themeAliases: Record<string, string> = {
  长期价值: '长期主义',
  长期游戏: '长期主义',
  复利: '长期主义',
  认知: '认知偏差',
  双系统: '认知偏差',
  人际关系: '社会影响',
  群体心理: '社会影响',
  政府: '制度',
  地方财政: '制度',
  经济行为: '财富与决策',
  财富: '财富与决策',
};

const keywordThemes: { theme: string; words: string[] }[] = [
  { theme: '长期主义', words: ['长期', '复利', '耐心', '积累', '成长'] },
  { theme: '认知偏差', words: ['认知', '判断', '选择', '理性', '偏差', '系统'] },
  { theme: '社会影响', words: ['社会', '群体', '人际', '情境', '态度'] },
  { theme: '制度', words: ['制度', '政府', '市场', '财政', '组织'] },
  { theme: '文明', words: ['文明', '历史', '人类', '演化', '世界'] },
  { theme: '生命意义', words: ['生命', '活着', '幸福', '孤独', '意义'] },
  { theme: '财富与决策', words: ['财富', '经济', '市场', '交易', '成本'] },
];

const categoryTheme: Record<string, string[]> = {
  文学: ['生命意义', '记忆与经验'],
  心理: ['认知偏差', '自我成长'],
  历史: ['制度', '文明'],
  社科: ['社会影响', '制度'],
  经济理财: ['财富与决策', '长期主义'],
  小说: ['文明', '命运选择'],
  计算机: ['系统思维', '技术实践'],
};

const aggregateThemes = new Set([
  ...keywordThemes.map(item => item.theme),
  ...Object.values(themeAliases),
  ...Object.values(categoryTheme).flat(),
]);

function normalizeTheme(tag: string): string {
  const clean = tag.trim().replace(/[“”"']/g, '');
  return themeAliases[clean] || clean;
}

function isAggregateTheme(theme: string): boolean {
  if (aggregateThemes.has(theme)) return true;
  if (/人物|朱元璋|刘慈欣|马尔克斯|戴维|章节|第一|第二|第三|第四/.test(theme)) return false;
  if (theme.length <= 2) return false;
  return keywordThemes.some(item => item.words.some(word => theme.includes(word) || word.includes(theme)));
}

function inferThemes(highlight: Highlight): string[] {
  const existing = highlight.topicTags.map(normalizeTheme).filter(Boolean).filter(isAggregateTheme);
  const inferred = keywordThemes
    .filter(item => item.words.some(word => highlight.content.includes(word) || highlight.thought?.includes(word)))
    .map(item => item.theme);
  return [...new Set([...existing, ...inferred])].slice(0, 3);
}

function inRange(highlight: Highlight, range: KnowledgeRange): boolean {
  if (range === 'all') return true;
  const date = parseLocalDate(highlight.createdAt);
  if (!date) return false;
  const anchor = new Date(2026, 7, 1);
  if (range === 'year') return date.getFullYear() === anchor.getFullYear();
  const days = range === '7d' ? 7 : 30;
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - days + 1);
  return date >= start && date <= anchor;
}

function ideaFromHighlight(highlight: Highlight): string {
  if (highlight.thought) return highlight.thought;
  const sentence = highlight.content.replace(/[。！？!?].*$/, '');
  return sentence.length > 28 ? `${sentence.slice(0, 28)}...` : sentence;
}

function circlePoint(index: number, total: number, radius: number, centerX = 50, centerY = 50, offset = 0) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) + offset;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

export function buildKnowledgeMap(data: UserData, range: KnowledgeRange = 'all'): KnowledgeMapData {
  const highlights = data.highlights.filter(highlight => highlight.content && inRange(highlight, range));
  const booksById = new Map(data.books.map(book => [book.id, book]));
  const themeBuckets = new Map<string, Highlight[]>();
  const fallbackThemeBooks = new Map<string, Book[]>();

  for (const highlight of highlights) {
    for (const theme of inferThemes(highlight)) {
      const current = themeBuckets.get(theme) || [];
      current.push(highlight);
      themeBuckets.set(theme, current);
    }
  }

  for (const book of data.books.filter(book => book.status !== 'unstarted').slice(0, 24)) {
    for (const theme of categoryTheme[book.category] || [book.category]) {
      const current = fallbackThemeBooks.get(theme) || [];
      current.push(book);
      fallbackThemeBooks.set(theme, current);
    }
  }

  const topThemes = [...new Set([...themeBuckets.keys(), ...fallbackThemeBooks.keys()])]
    .map(theme => [theme, themeBuckets.get(theme) || []] as [string, Highlight[]])
    .filter(([theme, items]) => items.length > 0 || (fallbackThemeBooks.get(theme) || []).length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 14);

  const involvedBookIds = new Set([
    ...topThemes.flatMap(([, items]) => items.map(item => item.bookId)),
    ...topThemes.flatMap(([theme]) => (fallbackThemeBooks.get(theme) || []).map(book => book.id)),
  ]);
  const involvedBooks = [...involvedBookIds]
    .map(id => booksById.get(id))
    .filter((book): book is Book => Boolean(book))
    .slice(0, 16);

  const nodes: KnowledgeNode[] = [];
  const edges: KnowledgeEdge[] = [];
  const booksByCategory = new Map<Category, Book[]>();
  for (const book of involvedBooks) {
    const current = booksByCategory.get(book.category) || [];
    current.push(book);
    booksByCategory.set(book.category, current);
  }
  const categoryGroups = [...booksByCategory.entries()];

  topThemes.forEach(([theme, items], index) => {
    const point = circlePoint(index, topThemes.length, 18, 50, 50, -Math.PI / 2);
    const bookIds = [...new Set([...items.map(item => item.bookId), ...(fallbackThemeBooks.get(theme) || []).map(book => book.id)])];
    nodes.push({
      id: `theme:${theme}`,
      type: 'theme',
      label: theme,
      weight: Math.max(items.length, bookIds.length),
      bookIds,
      highlightIds: items.map(item => item.id),
      x: point.x,
      y: point.y,
      color: '#9CCED0',
      description: items.length > 0 ? `你在 ${bookIds.length} 本书、${items.length} 条划线中反复碰到「${theme}」。` : `根据书籍类别与推荐证据，「${theme}」是当前书架里的潜在主题。`,
    });
  });

  involvedBooks.forEach(book => {
    const categoryIndex = categoryGroups.findIndex(([category]) => category === book.category);
    const categoryBooks = booksByCategory.get(book.category) || [book];
    const bookIndex = categoryBooks.findIndex(item => item.id === book.id);
    const cluster = circlePoint(categoryIndex, categoryGroups.length, 36, 50, 50, Math.PI / 7);
    const point = circlePoint(bookIndex, categoryBooks.length, Math.min(5.8, 2.5 + categoryBooks.length * 0.45), cluster.x, cluster.y, Math.PI / 6);
    const bookHighlights = highlights.filter(highlight => highlight.bookId === book.id);
    nodes.push({
      id: `book:${book.id}`,
      type: 'book',
      label: book.title,
      weight: Math.max(bookHighlights.length, 1),
      bookIds: [book.id],
      highlightIds: bookHighlights.map(item => item.id),
      x: point.x,
      y: point.y,
      color: CATEGORY_COLORS[book.category],
      description: `《${book.title}》贡献了 ${bookHighlights.length} 条可进入地图的划线。`,
      category: book.category,
    });
  });

  const ideaHighlights = highlights
    .filter(highlight => highlight.source === 'weread_personal' && Boolean(highlight.thought))
    .sort((a, b) => inferThemes(b).length - inferThemes(a).length || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  ideaHighlights.forEach((highlight, index) => {
    const point = circlePoint(index, ideaHighlights.length, 29, 50, 50, Math.PI / 3);
    nodes.push({
      id: `idea:${highlight.id}`,
      type: 'idea',
      label: ideaFromHighlight(highlight),
      weight: highlight.thought ? 3 : 2,
      bookIds: [highlight.bookId],
      highlightIds: [highlight.id],
      x: point.x,
      y: point.y,
      color: '#E5D58A',
      description: highlight.thought || highlight.content,
      origin: highlight.thought ? 'thought' : 'highlight',
    });
  });

  for (const [theme, items] of topThemes) {
    const themeId = `theme:${theme}`;
    for (const bookId of [...new Set([...items.map(item => item.bookId), ...(fallbackThemeBooks.get(theme) || []).map(book => book.id)])]) {
      edges.push({
        id: `contains:${bookId}:${theme}`,
        source: `book:${bookId}`,
        target: themeId,
        type: 'contains',
        label: '包含主题',
        weight: Math.max(items.filter(item => item.bookId === bookId).length, 1),
      });
    }
    for (const highlight of ideaHighlights.filter(item => inferThemes(item).includes(theme))) {
      edges.push({
        id: `supports:${highlight.id}:${theme}`,
        source: `idea:${highlight.id}`,
        target: themeId,
        type: 'supports',
        label: '观点属于主题',
        weight: 1,
      });
    }
  }

  for (const ideaNode of nodes.filter(node => node.type === 'idea')) {
    for (const bookId of ideaNode.bookIds) {
      if (!nodes.some(node => node.id === `book:${bookId}`)) continue;
      edges.push({
        id: `from_book:${ideaNode.id}:${bookId}`,
        source: ideaNode.id,
        target: `book:${bookId}`,
        type: 'from_book',
        label: '观点来自书籍',
        weight: 1,
      });
    }
  }

  const sharedPairs = topThemes.flatMap(([theme, items]) => {
    const bookIds = [...new Set([...items.map(item => item.bookId), ...(fallbackThemeBooks.get(theme) || []).map(book => book.id)])].slice(0, 5);
    const pairs: KnowledgeEdge[] = [];
    for (let i = 0; i < bookIds.length; i += 1) {
      for (let j = i + 1; j < bookIds.length; j += 1) {
        pairs.push({
          id: `shared:${bookIds[i]}:${bookIds[j]}:${theme}`,
          source: `book:${bookIds[i]}`,
          target: `book:${bookIds[j]}`,
          type: 'shared',
          label: theme,
          weight: 1,
        });
      }
    }
    return pairs;
  }).slice(0, 18);
  edges.push(...sharedPairs);

  const topThemeLabels = topThemes.slice(0, 3).map(([theme]) => theme);
  const categoryCounts = data.books.reduce<Record<string, number>>((acc, book) => {
    acc[book.category] = (acc[book.category] || 0) + 1;
    return acc;
  }, {});
  const weakCategories = ['心理', '历史', '计算机', '社科'].filter(category => !categoryCounts[category] || categoryCounts[category] < 2).slice(0, 3);
  const bridge = topThemes.find(([, items]) => new Set(items.map(item => item.bookId)).size > 1);

  const insights: KnowledgeInsight[] = [
    {
      title: '高频主题',
      detail: topThemeLabels.length > 0 ? `最近最密集出现的是：${topThemeLabels.join('、')}。` : '还需要更多划线来形成稳定主题。',
    },
    {
      title: '跨书连接',
      detail: bridge ? `「${bridge[0]}」把 ${new Set(bridge[1].map(item => booksById.get(item.bookId)?.title).filter(Boolean)).size} 本书连在了一起。` : '目前跨书共现还不明显。',
    },
    {
      title: '认知盲区',
      detail: weakCategories.length > 0 ? `你的地图里 ${weakCategories.join('、')} 较少出现，可以作为下一轮探索方向。` : '当前类别覆盖比较均衡。',
    },
  ];

  const summary = topThemes.length > 0
    ? `你的个人知识地图正在围绕「${topThemeLabels.join('、')}」生长。这些主题通过 ${involvedBooks.length} 本书和 ${ideaHighlights.length} 个观点互相连接，显示你不仅在读书，也在反复追问同一组问题。`
    : '暂时还没有足够的划线生成知识地图。导入微信读书划线或手动补充笔记后，这里会长出你的主题网络。';

  return { nodes, edges, insights, summary };
}
