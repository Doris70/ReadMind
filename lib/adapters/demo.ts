import { Book, CATEGORY_COLORS, Highlight, Recommendation, ReadingPersona, UserData } from './types';

const demoBooks: Book[] = [
  { id: 'b1', sourceBookId: 'wr1', title: '社会心理学', author: '戴维·迈尔斯', category: '心理', status: 'reading', startDate: '2026-03-15', endDate: null, lastReadDate: '2026-07-28', dateSource: 'real', progress: 0.42, readingSeconds: 28800, readingDays: 35, highlightCount: 18, thoughtCount: 5, isPinned: false },
  { id: 'b2', sourceBookId: 'wr2', title: '银河帝国：基地', author: '艾萨克·阿西莫夫', category: '小说', status: 'reading', startDate: '2026-05-20', endDate: null, lastReadDate: '2026-07-30', dateSource: 'real', progress: 0.35, readingSeconds: 21600, readingDays: 28, highlightCount: 12, thoughtCount: 3, isPinned: false },
  { id: 'b3', sourceBookId: 'wr3', title: '明朝那些事儿', author: '当年明月', category: '历史', status: 'reading', startDate: '2026-06-01', endDate: null, lastReadDate: '2026-07-25', dateSource: 'real', progress: 0.28, readingSeconds: 18000, readingDays: 22, highlightCount: 8, thoughtCount: 2, isPinned: false },
  { id: 'b4', sourceBookId: 'wr4', title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', status: 'finished', startDate: '2026-01-10', endDate: '2026-02-28', lastReadDate: '2026-02-28', dateSource: 'real', progress: 1, readingSeconds: 43200, readingDays: 48, highlightCount: 32, thoughtCount: 8, isPinned: true },
  { id: 'b5', sourceBookId: 'wr5', title: '思考，快与慢', author: '丹尼尔·卡尼曼', category: '心理', status: 'finished', startDate: '2025-11-01', endDate: '2026-01-05', lastReadDate: '2026-01-05', dateSource: 'real', progress: 1, readingSeconds: 54000, readingDays: 65, highlightCount: 45, thoughtCount: 12, isPinned: false },
  { id: 'b6', sourceBookId: 'wr6', title: '人类简史', author: '尤瓦尔·赫拉利', category: '历史', status: 'finished', startDate: '2025-09-15', endDate: '2025-11-20', lastReadDate: '2025-11-20', dateSource: 'real', progress: 1, readingSeconds: 46800, readingDays: 55, highlightCount: 28, thoughtCount: 7, isPinned: false },
  { id: 'b7', sourceBookId: 'wr7', title: '代码大全', author: '史蒂夫·麦康奈尔', category: '计算机', status: 'paused', startDate: '2026-02-01', endDate: null, lastReadDate: '2026-04-15', dateSource: 'real', progress: 0.55, readingSeconds: 36000, readingDays: 40, highlightCount: 22, thoughtCount: 6, isPinned: false },
  { id: 'b8', sourceBookId: 'wr8', title: '贫穷的本质', author: '阿比吉特·班纳吉', category: '经济理财', status: 'finished', startDate: '2025-08-01', endDate: '2025-09-10', lastReadDate: '2025-09-10', dateSource: 'real', progress: 1, readingSeconds: 25200, readingDays: 30, highlightCount: 15, thoughtCount: 4, isPinned: false },
  { id: 'b9', sourceBookId: 'wr9', title: '三体', author: '刘慈欣', category: '小说', status: 'finished', startDate: '2025-06-01', endDate: '2025-07-20', lastReadDate: '2025-07-20', dateSource: 'real', progress: 1, readingSeconds: 39600, readingDays: 45, highlightCount: 38, thoughtCount: 10, isPinned: true },
  { id: 'b10', sourceBookId: 'wr10', title: '被讨厌的勇气', author: '岸见一郎', category: '心理', status: 'finished', startDate: '2025-04-10', endDate: '2025-05-15', lastReadDate: '2025-05-15', dateSource: 'real', progress: 1, readingSeconds: 21600, readingDays: 25, highlightCount: 20, thoughtCount: 6, isPinned: false },
  { id: 'b11', sourceBookId: 'wr11', title: '活着', author: '余华', category: '文学', status: 'finished', startDate: '2025-03-01', endDate: '2025-03-15', lastReadDate: '2025-03-15', dateSource: 'real', progress: 1, readingSeconds: 10800, readingDays: 14, highlightCount: 16, thoughtCount: 4, isPinned: false },
  { id: 'b12', sourceBookId: 'wr12', title: '原则', author: '瑞·达利欧', category: '经济理财', status: 'abandoned', startDate: '2026-01-20', endDate: null, lastReadDate: '2026-02-10', dateSource: 'real', progress: 0.2, readingSeconds: 7200, readingDays: 8, highlightCount: 5, thoughtCount: 1, isPinned: false },
  { id: 'b13', sourceBookId: 'wr13', title: '刻意练习', author: '安德斯·艾利克森', category: '心理', status: 'paused', startDate: '2026-04-01', endDate: null, lastReadDate: '2026-05-20', dateSource: 'real', progress: 0.38, readingSeconds: 14400, readingDays: 18, highlightCount: 10, thoughtCount: 3, isPinned: false },
  { id: 'b14', sourceBookId: 'wr14', title: '万历十五年', author: '黄仁宇', category: '历史', status: 'finished', startDate: '2025-12-01', endDate: '2026-01-10', lastReadDate: '2026-01-10', dateSource: 'real', progress: 1, readingSeconds: 28800, readingDays: 32, highlightCount: 24, thoughtCount: 7, isPinned: false },
  { id: 'b15', sourceBookId: 'wr15', title: '设计模式', author: 'Erich Gamma', category: '计算机', status: 'abandoned', startDate: '2025-10-01', endDate: null, lastReadDate: '2025-11-05', dateSource: 'real', progress: 0.15, readingSeconds: 10800, readingDays: 12, highlightCount: 8, thoughtCount: 2, isPinned: false },
  { id: 'b16', sourceBookId: 'wr16', title: '追风筝的人', author: '卡勒德·胡赛尼', category: '小说', status: 'finished', startDate: '2025-07-25', endDate: '2025-08-15', lastReadDate: '2025-08-15', dateSource: 'real', progress: 1, readingSeconds: 18000, readingDays: 20, highlightCount: 14, thoughtCount: 4, isPinned: false },
  { id: 'b17', sourceBookId: 'wr17', title: '乌合之众', author: '古斯塔夫·勒庞', category: '社科', status: 'finished', startDate: '2025-05-20', endDate: '2025-06-25', lastReadDate: '2025-06-25', dateSource: 'real', progress: 1, readingSeconds: 16200, readingDays: 18, highlightCount: 18, thoughtCount: 5, isPinned: false },
  { id: 'b18', sourceBookId: 'wr18', title: '房思琪的初恋乐园', author: '林奕含', category: '文学', status: 'finished', startDate: '2026-04-20', endDate: '2026-05-30', lastReadDate: '2026-05-30', dateSource: 'real', progress: 1, readingSeconds: 25200, readingDays: 30, highlightCount: 28, thoughtCount: 9, isPinned: false },
  { id: 'b19', sourceBookId: 'wr19', title: '深入理解计算机系统', author: 'Randal E. Bryant', category: '计算机', status: 'reading', startDate: '2026-07-01', endDate: null, lastReadDate: '2026-07-31', dateSource: 'real', progress: 0.18, readingSeconds: 14400, readingDays: 16, highlightCount: 6, thoughtCount: 2, isPinned: false },
  { id: 'b20', sourceBookId: 'wr20', title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', category: '社科', status: 'paused', startDate: '2026-05-01', endDate: null, lastReadDate: '2026-06-15', dateSource: 'real', progress: 0.32, readingSeconds: 19800, readingDays: 24, highlightCount: 11, thoughtCount: 3, isPinned: false },
  { id: 'b21', sourceBookId: 'wr21', title: '1984', author: '乔治·奥威尔', category: '小说', status: 'finished', startDate: '2024-11-01', endDate: '2024-12-10', lastReadDate: '2024-12-10', dateSource: 'real', progress: 1, readingSeconds: 21600, readingDays: 25, highlightCount: 22, thoughtCount: 6, isPinned: false },
  { id: 'b22', sourceBookId: 'wr22', title: '置身事内', author: '兰小欢', category: '经济理财', status: 'finished', startDate: '2026-02-15', endDate: '2026-04-01', lastReadDate: '2026-04-01', dateSource: 'real', progress: 1, readingSeconds: 32400, readingDays: 38, highlightCount: 26, thoughtCount: 8, isPinned: false },
];

function createDemoCover(book: Book): string {
  const color = CATEGORY_COLORS[book.category];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 240 360">
      <rect width="240" height="360" rx="8" fill="#FAF9F1"/>
      <rect x="18" y="18" width="204" height="324" rx="4" fill="${color}" opacity="0.72"/>
      <path d="M43 67 C77 43, 113 54, 137 34 C152 63, 129 89, 101 93 C78 97, 58 88, 43 67Z" fill="#F4F4E9" opacity="0.58"/>
      <path d="M158 244 C184 224, 212 238, 213 267 C190 271, 165 267, 158 244Z" fill="#263B35" opacity="0.13"/>
      <text x="120" y="74" text-anchor="middle" font-family="Noto Serif SC, serif" font-size="14" fill="#263B35" opacity="0.72">${book.category}</text>
      <foreignObject x="34" y="112" width="172" height="104">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:'Noto Serif SC',serif;font-size:26px;line-height:1.25;color:#263B35;text-align:center;font-weight:600;">${book.title}</div>
      </foreignObject>
      <text x="120" y="276" text-anchor="middle" font-family="Noto Sans SC, sans-serif" font-size="14" fill="#263B35" opacity="0.70">${book.author}</text>
      <line x1="72" y1="300" x2="168" y2="300" stroke="#263B35" stroke-opacity="0.22"/>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const demoHighlights: Highlight[] = [
  { id: 'h1', bookId: 'b1', chapter: '第二章', content: '我们对自己的判断和选择，往往比我们愿意承认的更受情境的影响。', thought: '这和日常经验完全吻合，很多时候我们以为的理性决策其实都是事后合理化。', createdAt: '2026-07-20', source: 'weread_personal', isFeatured: true, topicTags: ['认知偏差', '社会影响'] },
  { id: 'h2', bookId: 'b1', chapter: '第四章', content: '态度并不总是能预测行为，但行为可以改变态度。', thought: '认知失调的力量。', createdAt: '2026-07-15', source: 'weread_personal', isFeatured: false, topicTags: ['态度行为关系'] },
  { id: 'h3', bookId: 'b2', chapter: '第一部分', content: '在银河系的西旋臂端，有一颗不起眼的黄色恒星，它的第三颗行星上，生命正在缓慢地演化。', createdAt: '2026-07-10', source: 'weread_personal', isFeatured: true, topicTags: ['宇宙', '文明'] },
  { id: 'h4', bookId: 'b4', chapter: '第六章', content: '过去都是假的，回忆是一条没有归途的路，以往的一切春天都无法复原。', thought: '马尔克斯写尽了时间的不可逆。', createdAt: '2026-02-15', source: 'weread_personal', isFeatured: true, topicTags: ['时间', '记忆', '孤独'] },
  { id: 'h5', bookId: 'b4', chapter: '第二章', content: '生命中曾经有过的所有灿烂，终究都需要用寂寞来偿还。', createdAt: '2026-02-01', source: 'weread_personal', isFeatured: true, topicTags: ['孤独', '生命'] },
  { id: 'h6', bookId: 'b5', chapter: '前言', content: '我们的大脑有两个系统：快速直觉的系统1和缓慢理性的系统2。', thought: '理解这两个系统是理解一切认知偏差的基础。', createdAt: '2025-12-20', source: 'weread_personal', isFeatured: true, topicTags: ['双系统', '认知'] },
  { id: 'h7', bookId: 'b6', chapter: '第一章', content: '大约7万年前，智人的认知能力发生了革命性的变化，我们称之为认知革命。', createdAt: '2025-10-05', source: 'weread_personal', isFeatured: false, topicTags: ['认知革命', '人类演化'] },
  { id: 'h8', bookId: 'b9', chapter: '第一部', content: '给岁月以文明，而不是给文明以岁月。', thought: '这句话是整个三体的灵魂。', createdAt: '2025-07-01', source: 'weread_personal', isFeatured: true, topicTags: ['文明', '生存'] },
  { id: 'h9', bookId: 'b9', chapter: '第二部', content: '失去人性，失去很多；失去兽性，失去一切。', createdAt: '2025-07-10', source: 'weread_personal', isFeatured: true, topicTags: ['人性', '选择'] },
  { id: 'h10', bookId: 'b10', chapter: '第三章', content: '不是我们的朋友决定了我们的幸福，而是我们对朋友的态度决定了我们的幸福。', thought: '阿德勒心理学的核心：一切烦恼都来自人际关系。', createdAt: '2025-05-01', source: 'weread_personal', isFeatured: true, topicTags: ['人际关系', '幸福'] },
  { id: 'h11', bookId: 'b11', chapter: '第七章', content: '人是为活着本身而活着的，而不是为了活着之外的任何事物所活着。', thought: '余华用最朴素的句子写出了最沉重的真相。', createdAt: '2025-03-10', source: 'weread_personal', isFeatured: true, topicTags: ['活着', '生命意义'] },
  { id: 'h12', bookId: 'b14', chapter: '第三章', content: '当一个制度已经失去了自我更新的能力，它就只能等待崩溃。', createdAt: '2025-12-20', source: 'weread_personal', isFeatured: false, topicTags: ['制度', '历史'] },
  { id: 'h13', bookId: 'b17', chapter: '第二章', content: '个人一旦进入群体中，他的个性便湮没了，群体的思想占据了他的统治地位。', createdAt: '2025-06-10', source: 'weread_personal', isFeatured: true, topicTags: ['群体心理', '个性'] },
  { id: 'h14', bookId: 'b18', chapter: '第五章', content: '他发现，社会对性的审视和禁忌，才是造成痛苦的根源，而不是性本身。', thought: '林奕含用生命写就的文字，每一句都让人窒息。', createdAt: '2026-05-15', source: 'weread_personal', isFeatured: true, topicTags: ['社会', '痛苦'] },
  { id: 'h15', bookId: 'b22', chapter: '第四章', content: '地方政府在经济发展中扮演的角色远比我们想象的更加积极和复杂。', createdAt: '2026-03-10', source: 'weread_personal', isFeatured: false, topicTags: ['政府', '经济'] },
  { id: 'h16', bookId: 'b3', chapter: '第三章', content: '朱元璋从一个放牛娃成长为开国皇帝，靠的不是运气，而是他对人心的洞察。', createdAt: '2026-07-05', source: 'weread_personal', isFeatured: false, topicTags: ['朱元璋', '历史人物'] },
  { id: 'h17', bookId: 'b20', chapter: '序言', content: '文明的发展不是由种族的天赋决定的，而是由地理和生态环境塑造的。', createdAt: '2026-06-01', source: 'weread_personal', isFeatured: false, topicTags: ['文明', '地理'] },
  { id: 'h18', bookId: 'b13', chapter: '第四章', content: '天才不是天生的，而是通过刻意练习造就的。', thought: '但刻意练习的关键是有效的反馈，没有反馈的重复只是机械劳动。', createdAt: '2026-05-10', source: 'weread_personal', isFeatured: true, topicTags: ['刻意练习', '成长'] },
  { id: 'h19', bookId: 'b21', chapter: '第一部', content: '战争即和平，自由即奴役，无知即力量。', createdAt: '2024-11-20', source: 'weread_personal', isFeatured: true, topicTags: ['极权', '语言'] },
  { id: 'h20', bookId: 'b16', chapter: '第十章', content: '许多人的幸福，就是建立在不许多人的不幸之上的。', createdAt: '2025-08-05', source: 'weread_personal', isFeatured: false, topicTags: ['命运', '选择'] },
];

const demoRecommendations: Recommendation[] = [
  { bookId: 'rec1', title: '心流', author: '米哈里·契克森米哈赖', category: '心理', reason: '你最近在《社会心理学》和《被讨厌的勇气》中反复关注"人际关系与自我认知"，这本书从积极心理学角度探讨了最优体验的本质，可以补充你对内在动机的理解。', evidence: [{ type: 'topic', value: '自我认知' }, { type: 'book', value: '社会心理学' }, { type: 'book', value: '被讨厌的勇气' }], confidence: 0.85, quote: '幸福不是运气，而是一种能力。' },
  { bookId: 'rec2', title: '天朝的崩溃', author: '茅海建', category: '历史', reason: '你刚读完《万历十五年》并对制度衰败感兴趣，这本书从鸦片战争切入，展示了另一个制度崩溃的时刻，与你的历史阅读轨迹高度吻合。', evidence: [{ type: 'topic', value: '制度衰败' }, { type: 'book', value: '万历十五年' }], confidence: 0.82, quote: '历史的意义在于，它曾经是可以选择的。' },
  { bookId: 'rec3', title: '克莱因壶', author: '冈的武士', category: '小说', reason: '你在《三体》和《1984》中都关注了"现实与虚幻的边界"这个主题，这本日本科幻小说从虚拟现实的角度探讨了同样的问题。', evidence: [{ type: 'topic', value: '现实与虚幻' }, { type: 'book', value: '三体' }, { type: 'book', value: '1984' }], confidence: 0.78, quote: '当你无法分辨现实与虚拟时，你该相信什么？' },
  { bookId: 'rec4', title: '行为经济学', author: '丹·艾瑞里', category: '经济理财', reason: '你正在读《置身事内》并且之前读过《贫穷的本质》，这本书从个人决策角度补充了你对经济行为的理解。', evidence: [{ type: 'topic', value: '经济行为' }, { type: 'book', value: '贫穷的本质' }, { type: 'book', value: '置身事内' }], confidence: 0.80, quote: '我们总是高估自己的理性，低估环境的影响。' },
];

const demoPersonas: ReadingPersona[] = [
  { year: 2026, name: '沉浸式漫游者', description: '你会同时打开许多入口，但真正被吸引时，会在一部作品里长时间停留。你的阅读在文学、心理和现实议题之间来回摆动。', topCategories: ['心理', '文学', '历史'], longestBook: '思考，快与慢', topTopic: '自我认知与社会', peakMonth: '三月', totalSeconds: 270000, finishedCount: 4, highlightCount: 220, representativeHighlight: '过去都是假的，回忆是一条没有归途的路。', suggestion: '尝试在一个月内只专注一本书，体验深度沉浸的不同层次。' },
  { year: 2025, name: '主题猎人', description: '你在这一年像猎人一样追踪感兴趣的主题，从人类演化到认知科学，从科幻到现实主义文学，每本书都是你认知地图上的一块拼图。', topCategories: ['小说', '心理', '历史'], longestBook: '人类简史', topTopic: '文明与认知', peakMonth: '七月', totalSeconds: 420000, finishedCount: 10, highlightCount: 350, representativeHighlight: '给岁月以文明，而不是给文明以岁月。', suggestion: '你读完了很多好书，试试把划线整理成笔记，让阅读成果形成复利。' },
  { year: 2024, name: '安静探索者', description: '这一年你读的书不多，但每一本都留下了思考的痕迹。你更偏好有深度的作品，在少量阅读中追求质量。', topCategories: ['小说', '社科'], longestBook: '1984', topTopic: '权力与自由', peakMonth: '十一月', totalSeconds: 86400, finishedCount: 2, highlightCount: 60, representativeHighlight: '战争即和平，自由即奴役，无知即力量。', suggestion: '可以尝试增加一些轻松愉快的阅读，平衡深度和广度。' },
];

export function loadDemoData(): UserData {
  const books = demoBooks.map(book => ({ ...book, coverUrl: book.coverUrl || createDemoCover(book) }));
  return {
    userId: 'demo-user',
    books,
    highlights: demoHighlights,
    readingEvents: [],
    recommendations: demoRecommendations,
    personas: demoPersonas,
    lastSyncTime: '2026-08-01T00:00:00.000Z',
    source: 'demo',
  };
}
