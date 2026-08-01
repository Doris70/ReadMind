import { Book, Highlight, UserData, Recommendation, ReadingPersona, Category } from './adapters/types';
import { getMonthBooks, getMonthLabel, getPeakMonth, getYearBooks, getHighlightScore } from './insights';

// 每日摘抄选择
export function selectDailyQuote(highlights: Highlight[]): Highlight | null {
  if (highlights.length === 0) return null;
  const candidates = [...highlights]
    .sort((a, b) => getHighlightScore(b) - getHighlightScore(a) || b.createdAt.localeCompare(a.createdAt));
  const dayIndex = Math.floor((Date.now() / 86400000)) % candidates.length;
  return candidates[dayIndex];
}

// 书籍 AI 摘要
export function generateBookSummary(book: Book, highlights: Highlight[]): string {
  if (highlights.length === 0) {
    return `这本《${book.title}》你读了${book.readingDays}天，暂时还没有划线记录。也许值得重新翻开，看看哪些句子曾让你停下目光。`;
  }
  const topics = [...new Set(highlights.flatMap(h => h.topicTags))].slice(0, 3);
  const topicStr = topics.length > 0 ? topics.join('、') : book.category;
  const thoughts = highlights.filter(h => h.thought);
  if (thoughts.length > 0) {
    return `你在《${book.title}》中关注了${topicStr}，留下了${thoughts.length}条想法。这本书在你的阅读地图中代表了一段关于${topics[0] || '自我探索'}的思考旅程。`;
  }
  return `你在《${book.title}》中留下了${highlights.length}条划线，主要集中在${topicStr}方向。这本书为你提供了关于${topics[0] || '生活'}的新视角。`;
}

// 推荐理由生成
export function generateRecommendations(data: UserData): Recommendation[] {
  const readingBooks = data.books.filter(b => b.status === 'reading');
  const categoryCount: Record<string, number> = {};
  data.books.forEach(b => { categoryCount[b.category] = (categoryCount[b.category] || 0) + 1; });
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  const allTags = data.highlights.flatMap(h => h.topicTags);
  const tagCount: Record<string, number> = {};
  allTags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

  // 基于阅读主题扩展候选池，供发现页按批次刷新。
  const templates = [
    { title: '认知觉醒', author: '周岭', category: '心理' as Category, reason: `你最近在${readingBooks[0]?.title || '阅读'}中关注了${topTags[0] || '认知'}，这本书从实践角度探讨了同样的主题。`, quote: '真正的成长，是从认知觉醒开始。' },
    { title: '苏菲的世界', author: '乔斯坦·贾德', category: '小说' as Category, reason: `你的阅读在${topCategories[0] || '文学'}和哲学之间摆动，这本书用小说的形式带你经历一次哲学之旅。`, quote: '你是谁？世界从哪里来？' },
    { title: '大转型', author: '卡尔·波兰尼', category: '社科' as Category, reason: `你读完了《置身事内》和《贫穷的本质》，对市场与社会的关系有了基础认知，这本书可以补充更宏观的视角。`, quote: '市场不是自然的，而是被创造的。' },
    { title: '复杂', author: '梅拉妮·米歇尔', category: '社科' as Category, reason: `你在${topTags[1] || '系统'}相关划线里多次碰到“相互作用”，这本书适合把零散现象连接成复杂系统视角。`, quote: '秩序常常从相互作用中浮现。' },
    { title: '事实', author: '汉斯·罗斯林', category: '社科' as Category, reason: `你的阅读里有不少关于社会、历史和经济的判断，这本书能帮你校准直觉和真实世界数据之间的距离。`, quote: '先看数据，再相信感觉。' },
    { title: '金钱心理学', author: '摩根·豪泽尔', category: '经济理财' as Category, reason: `如果你关注${topTags[2] || '选择'}，这本书会把财富、风险和人生叙事放在同一张桌面上讨论。`, quote: '财富更像行为习惯，而不只是数字。' },
    { title: '纳瓦尔宝典', author: '埃里克·乔根森', category: '经济理财' as Category, reason: `你对长期主义、成长和判断力的痕迹已经出现，这本书适合作为个人策略层面的下一块拼图。`, quote: '长期游戏奖励清醒和耐心。' },
    { title: '穷查理宝典', author: '彼得·考夫曼', category: '经济理财' as Category, reason: `你读过的书里已经有认知、商业和历史线索，这本书用多元思维模型把这些线索编在一起。`, quote: '跨学科思考能减少盲点。' },
    { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', category: '历史' as Category, reason: `你在文明、制度和环境主题上留下过痕迹，这本书能提供更长时段的解释框架。`, quote: '地理塑造了许多历史路径。' },
    { title: '万物发明指南', author: '瑞安·诺思', category: '计算机' as Category, reason: `如果你想给严肃阅读换一种轻盈入口，这本书用技术史和想象力连接科学、工程与生活。`, quote: '理解一件事，也可以从重新发明它开始。' },
    { title: '编码', author: '查尔斯·佩措尔德', category: '计算机' as Category, reason: `你的阅读地图里若出现技术或系统主题，这本书适合作为从概念走向底层机制的桥。`, quote: '复杂机器也从简单符号开始。' },
    { title: '局外人', author: '阿尔贝·加缪', category: '小说' as Category, reason: `你在生命意义、孤独或社会规训上的划线，可以接到这本更冷峻的文学入口。`, quote: '荒诞感有时来自过于清醒。' },
    { title: '献给阿尔吉侬的花束', author: '丹尼尔·凯斯', category: '小说' as Category, reason: `你对认知、成长和人的脆弱性有持续关注，这本小说会把这些主题变成一段具体命运。`, quote: '变聪明不一定更接近幸福。' },
    { title: '也许你该找个人聊聊', author: '洛莉·戈特利布', category: '心理' as Category, reason: `你在想法里常把阅读和自我观察连起来，这本书能把心理主题落到关系与叙事上。`, quote: '理解自己常常从讲述开始。' },
    { title: '亲密关系', author: '罗兰·米勒', category: '心理' as Category, reason: `如果你近期关注人际关系、幸福或自我边界，这本书会提供更系统的心理学视角。`, quote: '关系是一面慢慢显影的镜子。' },
    { title: '中国历代政治得失', author: '钱穆', category: '历史' as Category, reason: `你读历史时不只是看人物，也在看制度如何运转，这本书能把制度线索讲得更清楚。`, quote: '制度背后，总有人与时代的拉扯。' },
    { title: '叫魂', author: '孔飞力', category: '历史' as Category, reason: `你对历史人物和社会心理都有兴趣，这本书正好展示恐惧如何在制度与人群之间传播。`, quote: '谣言也是观察社会结构的入口。' },
  ];

  const generated = templates.map((t, i) => ({
    bookId: `gen_rec_${i}`,
    ...t,
    evidence: [{ type: 'topic' as const, value: topTags[i % Math.max(topTags.length, 1)] || '认知' }, { type: 'book' as const, value: readingBooks[i % Math.max(readingBooks.length, 1)]?.title || data.books[i % Math.max(data.books.length, 1)]?.title || '阅读' }],
    confidence: Math.max(0.58, 0.82 - i * 0.015),
  }));

  const seen = new Set<string>();
  return [...data.recommendations, ...generated].filter(recommendation => {
    const key = `${recommendation.title}-${recommendation.author}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function selectRecommendationForBook(book: Book, data: UserData): Recommendation | null {
  const recommendations = generateRecommendations(data);
  if (recommendations.length === 0) return null;

  const bookHighlights = data.highlights.filter(highlight => highlight.bookId === book.id);
  const bookTopics = new Set(bookHighlights.flatMap(highlight => highlight.topicTags));
  const scored = recommendations.map((recommendation, index) => {
    const evidenceScore = recommendation.evidence.reduce((score, evidence) => {
      if (evidence.type === 'book' && (evidence.value.includes(book.title) || book.title.includes(evidence.value))) return score + 8;
      if (evidence.type === 'topic' && bookTopics.has(evidence.value)) return score + 5;
      return score;
    }, 0);
    const categoryScore = recommendation.category === book.category ? 3 : 0;
    return { recommendation, score: evidenceScore + categoryScore + recommendation.confidence - index * 0.01 };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored[0].score > scored[scored.length - 1].score) return scored[0].recommendation;

  const hash = [...book.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return recommendations[hash % recommendations.length];
}

// 年度阅读人格计算
export function calculatePersona(data: UserData, year: number): ReadingPersona | null {
  if (data.personas.length > 0) {
    const found = data.personas.find(p => p.year === year);
    if (found) return found;
  }

  const yearBooks = getYearBooks(data, year);
  if (yearBooks.length === 0) return null;

  const totalSeconds = yearBooks.reduce((s, b) => s + b.readingSeconds, 0);
  const finishedBooks = yearBooks.filter(b => b.status === 'finished');
  const categoryCount: Record<string, number> = {};
  yearBooks.forEach(b => { categoryCount[b.category] = (categoryCount[b.category] || 0) + 1; });
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0] as Category);
  const longestBook = yearBooks.reduce((max, b) => b.readingSeconds > max.readingSeconds ? b : max, yearBooks[0]);
  const highlightCount = yearBooks.reduce((s, b) => s + b.highlightCount, 0);

  // 人格类型判定
  const avgSeconds = totalSeconds / Math.max(yearBooks.length, 1);
  const finishRate = finishedBooks.length / Math.max(yearBooks.length, 1);
  let personaName = '安静探索者';
  let description = '你在这一年用稳定的节奏阅读，每一本书都留下了思考的痕迹。';
  if (avgSeconds > 30000 && finishRate > 0.6) {
    personaName = '沉浸式漫游者';
    description = '你会同时打开许多入口，但真正被吸引时，会在一部作品里长时间停留。';
  } else if (yearBooks.length > 8 && finishRate > 0.5) {
    personaName = '主题猎人';
    description = '你像猎人一样追踪感兴趣的主题，每本书都是认知地图上的一块拼图。';
  } else if (yearBooks.length <= 3) {
    personaName = '安静探索者';
    description = '你读的书不多，但每一本都留下了思考的痕迹。你更偏好有深度的作品。';
  }

  const yearHighlights = data.highlights.filter(h => yearBooks.some(book => book.id === h.bookId));
  const repHighlight = yearHighlights.find(h => h.isFeatured)?.content || yearHighlights[0]?.content || '';

  return {
    year,
    name: personaName,
    description,
    topCategories,
    longestBook: longestBook.title,
    topTopic: [...new Set(yearHighlights.flatMap(h => h.topicTags))][0] || topCategories[0],
    peakMonth: getPeakMonth(yearBooks),
    totalSeconds,
    finishedCount: finishedBooks.length,
    highlightCount,
    representativeHighlight: repHighlight,
    suggestion: finishRate > 0.7 ? '尝试同时打开一本不同类别的书，拓展阅读边界。' : '试着把读完的书的划线整理成笔记，让阅读成果形成复利。',
  };
}

export function calculateMonthlyPersona(data: UserData, year: number, month: number): ReadingPersona | null {
  const synced = data.personas.find(persona => persona.period === 'month' && persona.year === year && persona.month === month);
  if (synced) return synced;

  const monthBooks = getMonthBooks(data, year, month);
  if (monthBooks.length === 0) return null;

  const monthHighlights = data.highlights.filter(highlight => {
    const createdAt = new Date(highlight.createdAt);
    return !Number.isNaN(createdAt.getTime()) && createdAt.getFullYear() === year && createdAt.getMonth() === month - 1;
  });
  const totalSeconds = monthBooks.reduce((sum, book) => sum + book.readingSeconds, 0);
  const finishedBooks = monthBooks.filter(book => book.status === 'finished');
  const highlightCount = monthHighlights.length || monthBooks.reduce((sum, book) => sum + book.highlightCount, 0);
  const categoryCount: Record<string, number> = {};
  monthBooks.forEach(book => { categoryCount[book.category] = (categoryCount[book.category] || 0) + 1; });
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(item => item[0] as Category);
  const longestBook = monthBooks.reduce((max, book) => book.readingSeconds > max.readingSeconds ? book : max, monthBooks[0]);
  const topics = [...new Set(monthHighlights.flatMap(highlight => highlight.topicTags))];
  const thoughtCount = monthHighlights.filter(highlight => highlight.thought).length;
  const avgSeconds = totalSeconds / Math.max(monthBooks.length, 1);

  let personaName = '安静观察者';
  if (avgSeconds > 36000 || totalSeconds > 108000) personaName = '深度沉浸者';
  else if (monthBooks.length >= 6 && topCategories.length >= 3) personaName = '多线漫游者';
  else if (thoughtCount >= 3) personaName = '边读边想者';

  const topTopic = topics[0] || topCategories[0] || '阅读兴趣';
  const monthLabel = getMonthLabel(month);
  const description = `这个${monthLabel}，你最明显的阅读动作是围绕「${topTopic}」反复停留。你打开了 ${monthBooks.length} 本书，读完 ${finishedBooks.length} 本，留下 ${highlightCount} 条可回看的痕迹；${longestBook ? `其中《${longestBook.title}》占据了最长的沉浸时间，` : ''}说明这个月的阅读不是简单浏览，而是在为一个更具体的问题寻找材料。`;

  return {
    year,
    month,
    period: 'month',
    name: personaName,
    description,
    topCategories: topCategories.length > 0 ? topCategories : ['文学'],
    longestBook: longestBook.title,
    topTopic,
    peakMonth: monthLabel,
    totalSeconds,
    finishedCount: finishedBooks.length,
    highlightCount,
    representativeHighlight: getTopMonthlyHighlight(monthHighlights)?.content || '',
    suggestion: `下个月可以继续沿着「${topTopic}」往前走，但建议把阅读目标从“多看几本”改成“回答一个问题”。先选一本主书深读，再选一本相邻类别的书做交叉验证，最后用一页笔记收束：这个问题我原来怎么想，现在哪些判断变了。这样月度人格会从阅读偏好，进一步变成可积累的个人知识线索。`,
  };
}

function getTopMonthlyHighlight(highlights: Highlight[]): Highlight | null {
  return [...highlights].sort((a, b) => getHighlightScore(b) - getHighlightScore(a) || b.createdAt.localeCompare(a.createdAt))[0] || null;
}
