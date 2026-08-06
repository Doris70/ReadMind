import { Book, Highlight, UserData, Recommendation, ReadingPersona, Category } from './adapters/types';
import { getBookMonthReadingSeconds, getMonthBooks, getMonthLabel, getPeakMonth, getYearBooks, getHighlightScore } from './insights';

type RecommendationTemplate = {
  title: string;
  author: string;
  category: Category;
  themes: string[];
  bridge: string;
  quote: string;
};

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
  const recentBooks = data.books
    .filter(book => book.status !== 'unstarted')
    .sort((a, b) => (b.lastReadDate || '').localeCompare(a.lastReadDate || ''));
  const currentBook = readingBooks[0] || recentBooks[0];
  const categoryCount: Record<string, number> = {};
  data.books.forEach(b => { categoryCount[b.category] = (categoryCount[b.category] || 0) + 1; });
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  const allTags = data.highlights.flatMap(h => h.topicTags);
  const tagCount: Record<string, number> = {};
  allTags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

  const templates: RecommendationTemplate[] = [
    { title: '认知觉醒', author: '周岭', category: '心理', themes: ['认知', '成长', '注意力'], bridge: '从自我观察走向可执行的成长方法', quote: '真正的成长，是从认知觉醒开始。' },
    { title: '苏菲的世界', author: '乔斯坦·贾德', category: '小说', themes: ['哲学', '世界观', '自我追问'], bridge: '用小说形式承接抽象问题', quote: '你是谁？世界从哪里来？' },
    { title: '大转型', author: '卡尔·波兰尼', category: '社科', themes: ['市场', '社会', '制度'], bridge: '把经济问题放回社会结构里理解', quote: '市场不是自然的，而是被创造的。' },
    { title: '复杂', author: '梅拉妮·米歇尔', category: '社科', themes: ['系统', '复杂性', '相互作用'], bridge: '把零散现象连接成复杂系统视角', quote: '秩序常常从相互作用中浮现。' },
    { title: '事实', author: '汉斯·罗斯林', category: '社科', themes: ['数据', '认知偏差', '世界理解'], bridge: '用数据校准直觉判断', quote: '先看数据，再相信感觉。' },
    { title: '金钱心理学', author: '摩根·豪泽尔', category: '经济理财', themes: ['财富', '风险', '选择'], bridge: '把财富、风险和人生叙事放在一起讨论', quote: '财富更像行为习惯，而不只是数字。' },
    { title: '纳瓦尔宝典', author: '埃里克·乔根森', category: '经济理财', themes: ['长期主义', '判断力', '财富'], bridge: '从阅读兴趣接到个人策略', quote: '长期游戏奖励清醒和耐心。' },
    { title: '穷查理宝典', author: '彼得·考夫曼', category: '经济理财', themes: ['多元思维', '决策', '认知'], bridge: '用跨学科模型减少判断盲点', quote: '跨学科思考能减少盲点。' },
    { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', category: '历史', themes: ['文明', '地理', '历史结构'], bridge: '给文明与制度问题一个更长的解释框架', quote: '地理塑造了许多历史路径。' },
    { title: '万物发明指南', author: '瑞安·诺思', category: '计算机', themes: ['技术史', '工程', '想象力'], bridge: '用轻盈方式连接科学、工程与生活', quote: '理解一件事，也可以从重新发明它开始。' },
    { title: '编码', author: '查尔斯·佩措尔德', category: '计算机', themes: ['计算机', '系统', '底层机制'], bridge: '从概念走向底层机制', quote: '复杂机器也从简单符号开始。' },
    { title: '局外人', author: '阿尔贝·加缪', category: '小说', themes: ['荒诞', '孤独', '社会规训'], bridge: '把生命意义推向更冷峻的文学入口', quote: '荒诞感有时来自过于清醒。' },
    { title: '献给阿尔吉侬的花束', author: '丹尼尔·凯斯', category: '小说', themes: ['认知', '成长', '脆弱'], bridge: '把认知和人的脆弱性变成具体命运', quote: '变聪明不一定更接近幸福。' },
    { title: '也许你该找个人聊聊', author: '洛莉·戈特利布', category: '心理', themes: ['自我观察', '关系', '叙事'], bridge: '把心理主题落到关系与叙事上', quote: '理解自己常常从讲述开始。' },
    { title: '亲密关系', author: '罗兰·米勒', category: '心理', themes: ['人际关系', '幸福', '边界'], bridge: '系统梳理亲密关系中的心理机制', quote: '关系是一面慢慢显影的镜子。' },
    { title: '中国历代政治得失', author: '钱穆', category: '历史', themes: ['制度', '政治', '历史'], bridge: '把历史人物背后的制度线索讲清楚', quote: '制度背后，总有人与时代的拉扯。' },
    { title: '叫魂', author: '孔飞力', category: '历史', themes: ['社会心理', '制度', '恐惧'], bridge: '观察恐惧如何在制度与人群之间传播', quote: '谣言也是观察社会结构的入口。' },
    { title: '置身事内', author: '兰小欢', category: '经济理财', themes: ['地方财政', '制度', '经济'], bridge: '从宏观制度进入现实经济运行', quote: '很多经济问题，最后都会回到制度安排。' },
    { title: '乡土中国', author: '费孝通', category: '社科', themes: ['社会结构', '关系', '传统'], bridge: '把社会关系的底层结构补上', quote: '关系不是背景，而是结构本身。' },
    { title: '娱乐至死', author: '尼尔·波兹曼', category: '社科', themes: ['媒介', '注意力', '公共讨论'], bridge: '把注意力问题延展到媒介与公共生活', quote: '媒介改变的不只是表达，也改变思考。' },
    { title: '技术与文明', author: '刘易斯·芒福德', category: '社科', themes: ['技术', '文明', '社会'], bridge: '从工具看文明形态如何改变', quote: '技术从来不只是机器。' },
    { title: '自私的基因', author: '理查德·道金斯', category: '社科', themes: ['演化', '生命', '行为'], bridge: '把人的行为放进演化尺度里理解', quote: '个体之外，还有更长的复制逻辑。' },
    { title: '自控力', author: '凯利·麦格尼格尔', category: '心理', themes: ['自控', '习惯', '行为改变'], bridge: '把认知转成具体的行为训练', quote: '意志力也需要被照顾。' },
    { title: '蛤蟆先生去看心理医生', author: '罗伯特·戴博德', category: '心理', themes: ['情绪', '自我理解', '关系'], bridge: '用温和故事进入情绪与自我理解', quote: '看见自己，是改变的开始。' },
    { title: '影响力', author: '罗伯特·西奥迪尼', category: '心理', themes: ['说服', '决策', '社会影响'], bridge: '把社会心理学接到真实决策场景', quote: '人们常在不知不觉中被推动。' },
    { title: '思维，快与慢', author: '丹尼尔·卡尼曼', category: '心理', themes: ['认知偏差', '判断', '决策'], bridge: '系统补齐直觉与理性之间的差异', quote: '我们相信自己的判断，但判断常常偷懒。' },
    { title: '原则', author: '瑞·达利欧', category: '经济理财', themes: ['原则', '决策', '组织'], bridge: '把个人经验沉淀成可复用原则', quote: '清晰原则让复杂选择变得可处理。' },
    { title: '反脆弱', author: '纳西姆·塔勒布', category: '经济理财', themes: ['风险', '不确定性', '系统'], bridge: '从风险管理走向不确定性中的成长', quote: '有些系统会从波动中获益。' },
    { title: '贫穷的本质', author: '阿比吉特·班纳吉', category: '经济理财', themes: ['贫困', '选择', '制度'], bridge: '用微观证据理解宏观问题', quote: '贫困不只是缺钱，也会改变选择空间。' },
    { title: '小岛经济学', author: '彼得·希夫', category: '经济理财', themes: ['经济原理', '货币', '生产'], bridge: '用轻故事补经济学基础直觉', quote: '经济并不神秘，它从生产和交换开始。' },
    { title: '万历十五年', author: '黄仁宇', category: '历史', themes: ['制度', '历史人物', '治理'], bridge: '从一个年份看制度惯性', quote: '历史的细节里藏着系统的裂纹。' },
    { title: '人类简史', author: '尤瓦尔·赫拉利', category: '历史', themes: ['文明', '认知革命', '人类演化'], bridge: '把个体问题放到人类长史里观察', quote: '想象共同体改变了人类命运。' },
    { title: '明朝那些事儿', author: '当年明月', category: '历史', themes: ['权力', '人物', '历史叙事'], bridge: '用叙事重新进入历史人物与权力结构', quote: '历史不是答案，而是一组选择。' },
    { title: '月亮与六便士', author: '毛姆', category: '文学', themes: ['自我', '欲望', '人生选择'], bridge: '把自我追问放进文学命运里', quote: '人有时会被一种不可解释的东西召唤。' },
    { title: '悉达多', author: '赫尔曼·黑塞', category: '文学', themes: ['自我追寻', '生命意义', '精神成长'], bridge: '让成长主题变得更内在、更安静', quote: '智慧无法被给予，只能被经历。' },
    { title: '树上的男爵', author: '伊塔洛·卡尔维诺', category: '文学', themes: ['自由', '距离', '选择'], bridge: '用轻盈小说处理自由与自我边界', quote: '保持距离，也是一种参与。' },
    { title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', themes: ['记忆', '孤独', '时间'], bridge: '把时间与孤独的主题推到文学深处', quote: '回忆是一条没有归途的路。' },
    { title: '三体', author: '刘慈欣', category: '小说', themes: ['文明', '选择', '生存'], bridge: '把文明问题带入科幻尺度', quote: '给岁月以文明，而不是给文明以岁月。' },
    { title: '1984', author: '乔治·奥威尔', category: '小说', themes: ['权力', '语言', '自由'], bridge: '把制度与语言问题变成极端寓言', quote: '语言改变现实的边界。' },
    { title: '克莱因壶', author: '冈嶋二人', category: '小说', themes: ['现实', '虚拟', '认知'], bridge: '从现实与虚拟的边界继续追问', quote: '当边界消失，判断会变得困难。' },
    { title: '深入理解计算机系统', author: 'Randal E. Bryant', category: '计算机', themes: ['系统', '底层机制', '计算机'], bridge: '把技术兴趣推进到底层结构', quote: '理解系统，才能理解表象。' },
    { title: '程序员修炼之道', author: 'Andrew Hunt', category: '计算机', themes: ['实践', '工程', '成长'], bridge: '把技术阅读接到日常实践', quote: '好的工程习惯会慢慢复利。' },
    { title: '人月神话', author: 'Frederick P. Brooks', category: '计算机', themes: ['组织效率', '软件工程', '复杂性'], bridge: '从代码问题进入组织协作问题', quote: '软件项目也是人的系统。' },
    { title: '设计心理学', author: '唐纳德·诺曼', category: '计算机', themes: ['设计', '认知', '用户体验'], bridge: '把认知理解接到产品和设计', quote: '好的设计让意图自然显现。' },
    { title: '人性的弱点', author: '戴尔·卡耐基', category: '心理', themes: ['沟通', '关系', '自我成长'], bridge: '从日常互动理解他人与自己', quote: '真诚的兴趣是关系的开始。' },
    { title: '非暴力沟通', author: '马歇尔·卢森堡', category: '心理', themes: ['沟通', '需求', '关系'], bridge: '把情绪背后的需求说得更清楚', quote: '每一种表达背后都有未被看见的需要。' },
    { title: '少有人走的路', author: 'M. 斯科特·派克', category: '心理', themes: ['成长', '自律', '爱'], bridge: '从自律与责任进入个人成长', quote: '人生苦难重重。' },
    { title: '当下的力量', author: '埃克哈特·托利', category: '心理', themes: ['注意力', '情绪', '自我观察'], bridge: '练习把注意力从反刍带回当下', quote: '你拥有的只有当下。' },
    { title: '依恋', author: '阿米尔·莱文', category: '心理', themes: ['亲密关系', '边界', '依恋'], bridge: '用依恋模式理解关系里的靠近与退后', quote: '亲密关系会唤起我们最早的联结经验。' },
    { title: '终身成长', author: '卡罗尔·德韦克', category: '心理', themes: ['成长型思维', '学习', '反馈'], bridge: '把能力焦虑转成可练习的成长视角', quote: '重要的不是你现在在哪里，而是你相信自己能走向哪里。' },
    { title: '习惯的力量', author: '查尔斯·都希格', category: '心理', themes: ['习惯', '行为改变', '自控'], bridge: '从线索、惯常行为和奖励拆解改变', quote: '习惯可以被理解，也可以被重写。' },
    { title: '掌控习惯', author: '詹姆斯·克利尔', category: '心理', themes: ['习惯', '复利', '行动'], bridge: '把抽象目标落成微小且可持续的行动', quote: '每天进步一点点，长期会形成惊人的差距。' },
    { title: '随机漫步的傻瓜', author: '纳西姆·塔勒布', category: '经济理财', themes: ['风险', '概率', '不确定性'], bridge: '校准结果与运气之间的关系', quote: '随机性比我们愿意承认的更重要。' },
    { title: '黑天鹅', author: '纳西姆·塔勒布', category: '经济理财', themes: ['不确定性', '风险', '预测'], bridge: '从不可预测事件反观自己的判断', quote: '我们总在事后为意外编造解释。' },
    { title: '投资最重要的事', author: '霍华德·马克斯', category: '经济理财', themes: ['风险', '周期', '决策'], bridge: '把投资视为风险判断而非收益猜测', quote: '风险控制是优秀投资的核心。' },
    { title: '穷爸爸富爸爸', author: '罗伯特·清崎', category: '经济理财', themes: ['财富', '现金流', '教育'], bridge: '从资产与现金流建立财富的基础直觉', quote: '让钱为你工作。' },
    { title: '思考致富', author: '拿破仑·希尔', category: '经济理财', themes: ['目标', '财富', '行动'], bridge: '把愿望转成长期行动与反馈', quote: '目标需要被清晰地写下来。' },
    { title: '经济学原理', author: 'N. 格里高利·曼昆', category: '经济理财', themes: ['经济原理', '选择', '市场'], bridge: '补齐个人判断背后的经济学基本框架', quote: '人们面临取舍。' },
    { title: '国富论', author: '亚当·斯密', category: '经济理财', themes: ['市场', '分工', '制度'], bridge: '回到市场、分工与交换的经典源头', quote: '分工提高了生产率。' },
    { title: '激荡三十年', author: '吴晓波', category: '经济理财', themes: ['商业', '企业', '制度'], bridge: '从企业史理解中国商业与制度变迁', quote: '商业变化总发生在时代的缝隙里。' },
    { title: '全球通史', author: '斯塔夫里阿诺斯', category: '历史', themes: ['文明', '世界史', '连接'], bridge: '把局部事件放进全球历史网络', quote: '历史从来不是彼此隔绝的故事。' },
    { title: '历史的温度', author: '张玮', category: '历史', themes: ['历史叙事', '人物', '选择'], bridge: '从人物选择重新进入历史现场', quote: '历史由无数具体的人构成。' },
    { title: '显微镜下的大明', author: '马伯庸', category: '历史', themes: ['制度', '治理', '社会'], bridge: '用细小案件照见制度如何运转', quote: '制度的纹理藏在具体事务里。' },
    { title: '中国历代政治得失', author: '钱穆', category: '历史', themes: ['制度', '政治', '历史'], bridge: '比较不同朝代的制度选择', quote: '制度需要放在时代里看。' },
    { title: '大明王朝的七张面孔', author: '张宏杰', category: '历史', themes: ['权力', '人物', '制度'], bridge: '从人物性格与制度条件交叉理解历史', quote: '个人选择总在制度边界中发生。' },
    { title: '古代人的日常生活', author: '王磊', category: '历史', themes: ['日常史', '社会', '文化'], bridge: '把宏大历史落回普通人的生活细节', quote: '日常生活也是历史的一部分。' },
    { title: '社会契约论', author: '让-雅克·卢梭', category: '社科', themes: ['制度', '自由', '公共生活'], bridge: '从权利与共同体追问制度正当性', quote: '人是生而自由的。' },
    { title: '规训与惩罚', author: '米歇尔·福柯', category: '社科', themes: ['权力', '制度', '社会'], bridge: '观察权力如何进入日常秩序', quote: '权力并不只存在于显眼的地方。' },
    { title: '乌合之众', author: '古斯塔夫·勒庞', category: '社科', themes: ['群体心理', '社会影响', '行为'], bridge: '理解个体在群体中的判断变化', quote: '群体有自己的心理。' },
    { title: '景观社会', author: '居伊·德波', category: '社科', themes: ['媒介', '消费', '社会'], bridge: '从媒介与消费重新看现代生活', quote: '景观不是图像的集合，而是社会关系。' },
    { title: '倦怠社会', author: '韩炳哲', category: '社科', themes: ['效率', '自我', '现代生活'], bridge: '为效率焦虑提供一条批判性视角', quote: '过度积极也会让人疲惫。' },
    { title: '变量', author: '何帆', category: '社科', themes: ['社会变迁', '经济', '未来'], bridge: '从中国社会的微小变化理解长期趋势', quote: '真正重要的变化常从细处开始。' },
    { title: '工作的未来', author: '达尼埃尔·苏斯金德', category: '社科', themes: ['技术', '劳动', '社会'], bridge: '把技术变化接到劳动与制度问题', quote: '技术改变的不只是工作岗位。' },
    { title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', themes: ['记忆', '时间', '家族'], bridge: '从家族命运进入时间与记忆的循环', quote: '过去都是假的，回忆没有归路。' },
    { title: '额尔古纳河右岸', author: '迟子建', category: '文学', themes: ['自然', '记忆', '生命'], bridge: '在自然与族群记忆中理解生命经验', quote: '时间会带走许多事，也会留下痕迹。' },
    { title: '我与地坛', author: '史铁生', category: '文学', themes: ['生命意义', '自我', '时间'], bridge: '以安静的方式靠近生命与命运', quote: '一个人出生了，这就不再是一个可以辩论的问题。' },
    { title: '平凡的世界', author: '路遥', category: '文学', themes: ['成长', '命运', '生活'], bridge: '在普通人的生活里理解坚持和选择', quote: '生活不能等待别人来安排。' },
    { title: '活着', author: '余华', category: '文学', themes: ['生命', '命运', '家庭'], bridge: '从极简叙事触碰生命韧性', quote: '活着本身就是意义。' },
    { title: '始于极限', author: '上野千鹤子', category: '文学', themes: ['自我', '关系', '社会'], bridge: '用对话重新整理自我与社会的关系', quote: '理解自己也意味着理解所处的结构。' },
    { title: '卡拉马佐夫兄弟', author: '陀思妥耶夫斯基', category: '小说', themes: ['伦理', '自由', '人性'], bridge: '把自由、责任与人性推向更深处', quote: '每个人都要为所有人负责。' },
    { title: '失明症漫记', author: '若泽·萨拉马戈', category: '小说', themes: ['社会', '人性', '秩序'], bridge: '在极端处境里观察人性与社会秩序', quote: '如果能看见，就要看见。' },
    { title: '动物农场', author: '乔治·奥威尔', category: '小说', themes: ['权力', '制度', '寓言'], bridge: '用短篇寓言继续追问权力如何变形', quote: '所有动物一律平等。' },
    { title: '沙丘', author: '弗兰克·赫伯特', category: '小说', themes: ['系统', '权力', '生态'], bridge: '在科幻世界里观察生态、权力与预言', quote: '恐惧是心灵的杀手。' },
    { title: '海边的卡夫卡', author: '村上春树', category: '小说', themes: ['成长', '自我', '命运'], bridge: '用非线性叙事靠近自我与命运', quote: '每个人都有一片属于自己的森林。' },
    { title: '白夜行', author: '东野圭吾', category: '小说', themes: ['人性', '关系', '命运'], bridge: '通过悬疑叙事观察关系里的隐秘动机', quote: '世上有两样东西不可直视。' },
    { title: '人工智能：现代方法', author: '斯图尔特·罗素', category: '计算机', themes: ['人工智能', '系统', '决策'], bridge: '系统补齐人工智能的基本方法与边界', quote: '智能来自感知、推理与行动的协作。' },
    { title: '算法导论', author: '托马斯·科尔曼', category: '计算机', themes: ['算法', '问题解决', '复杂性'], bridge: '把工程直觉建立在算法问题的结构上', quote: '好的算法让问题变得可处理。' },
    { title: '代码整洁之道', author: '罗伯特·马丁', category: '计算机', themes: ['工程', '实践', '设计'], bridge: '从代码质量回到工程表达与协作', quote: '整洁的代码像写得好的散文。' },
    { title: '浪潮之巅', author: '吴军', category: '计算机', themes: ['技术', '商业', '产业'], bridge: '从产业史理解技术公司与商业周期', quote: '技术浪潮总会改变竞争的规则。' },
    { title: '计算机网络：自顶向下方法', author: '詹姆斯·库罗斯', category: '计算机', themes: ['网络', '系统', '技术'], bridge: '从应用到基础设施建立网络系统视角', quote: '网络是分层协作的系统。' },
    { title: 'JavaScript高级程序设计', author: '马特·弗里斯比', category: '计算机', themes: ['编程', '实践', '系统'], bridge: '把编程能力落实到语言机制与工程实践', quote: '理解语言机制，才能更好地驾驭它。' },
  ];

  const generated = templates.map((t, i) => {
    const contextBook = recentBooks[i % Math.max(recentBooks.length, 1)] || currentBook;
    const contextHighlights = contextBook ? data.highlights.filter(highlight => highlight.bookId === contextBook.id) : [];
    const contextTags = [...new Set(contextHighlights.flatMap(highlight => highlight.topicTags))];
    return {
    bookId: `gen_rec_${i}`,
    sourceBookId: contextBook?.id,
    title: t.title,
    author: t.author,
    category: t.category,
    reason: createRecommendationReason(t, contextBook, contextTags.length > 0 ? contextTags : topTags, topCategories),
    evidence: [
      { type: 'topic' as const, value: t.themes.find(theme => topTags.some(tag => relatedText(theme, tag))) || t.themes[0] || topTags[i % Math.max(topTags.length, 1)] || '认知' },
      { type: 'book' as const, value: contextBook?.title || data.books[i % Math.max(data.books.length, 1)]?.title || '阅读' },
    ],
    confidence: Math.max(0.58, 0.82 - i * 0.015),
    quote: t.quote,
    };
  });

  const seen = new Set<string>();
  return [...data.recommendations, ...generated].filter(recommendation => {
    const key = `${recommendation.title}-${recommendation.author}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function selectRecommendationForBook(book: Book, data: UserData): Recommendation | null {
  const allRecommendations = generateRecommendations(data);
  const existingBookKeys = new Set(data.books.map(item => normalizeText(`${item.title}${item.author}`)));
  const sourceBookRecommendations = allRecommendations.filter(recommendation => (
    recommendation.sourceBookId === book.id
    && !existingBookKeys.has(normalizeText(`${recommendation.title}${recommendation.author}`))
  ));
  const sameCategoryRecommendations = allRecommendations.filter(recommendation => (
    recommendation.category === book.category
    && !existingBookKeys.has(normalizeText(`${recommendation.title}${recommendation.author}`))
  ));
  const recommendations = sourceBookRecommendations.length > 0
    ? sourceBookRecommendations
    : sameCategoryRecommendations.length > 0
      ? sameCategoryRecommendations
      : allRecommendations.filter(recommendation => !existingBookKeys.has(normalizeText(`${recommendation.title}${recommendation.author}`)));
  if (recommendations.length === 0) return null;

  const bookHighlights = data.highlights.filter(highlight => highlight.bookId === book.id);
  const bookTopics = new Set([...bookHighlights.flatMap(highlight => highlight.topicTags), book.category]);
  const allHighlights = data.highlights;
  const recentTags = new Set(
    [...allHighlights]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 16)
      .flatMap(highlight => highlight.topicTags),
  );
  const deepReadScore = Math.min(book.readingSeconds / 7200, 4) + Math.min(book.highlightCount / 6, 3) + Math.min(book.thoughtCount, 3);
  const bookRecencyScore = book.lastReadDate ? Math.max(0, 2 - Math.min(daysSince(book.lastReadDate), 60) / 30) : 0;
  const scored = recommendations.map((recommendation, index) => {
    const recommendationTopics = new Set(recommendation.evidence.filter(item => item.type === 'topic').map(item => item.value));
    const evidenceScore = recommendation.evidence.reduce((score, evidence) => {
      if (evidence.type === 'book' && relatedText(evidence.value, book.title)) return score + 10;
      if (evidence.type === 'topic' && [...bookTopics].some(topic => relatedText(topic, evidence.value))) return score + 6;
      return score;
    }, 0);
    const topicOverlapScore = [...recommendationTopics].reduce((score, topic) => (
      score + [...bookTopics].filter(bookTopic => relatedText(bookTopic, topic)).length * 3
    ), 0);
    const categoryScore = recommendation.category === book.category ? 8 : 0;
    const sourceBookScore = recommendation.sourceBookId === book.id ? 24 : 0;
    const recentTopicScore = [...recommendationTopics].some(topic => [...recentTags].some(tag => relatedText(topic, tag))) ? 2.5 : 0;
    const stageScore = book.status === 'finished'
      ? 1.8
      : book.status === 'reading'
        ? (book.progress > 0.45 ? 1.4 : 0.6)
        : book.status === 'paused'
          ? 1
          : 0.2;
    const noveltyPenalty = existingBookKeys.has(normalizeText(`${recommendation.title}${recommendation.author}`)) ? 16 : 0;
    const depthBonus = Math.min(deepReadScore, 6) * 0.45;
    return {
      recommendation,
      score: evidenceScore
        + topicOverlapScore
        + categoryScore
        + sourceBookScore
        + recentTopicScore
        + stageScore
        + depthBonus
        + bookRecencyScore
        + recommendation.confidence
        - noveltyPenalty
        - index * 0.018,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored[0].score > scored[scored.length - 1].score) {
    return bindRecommendationToSelectedBook(scored[0].recommendation, book, bookHighlights);
  }

  const hash = [...book.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return bindRecommendationToSelectedBook(recommendations[hash % recommendations.length], book, bookHighlights);
}

function bindRecommendationToSelectedBook(recommendation: Recommendation, book: Book, highlights: Highlight[]): Recommendation {
  const highlightTopics = highlights.flatMap(highlight => highlight.topicTags);
  const topics = [...new Set([...highlightTopics, book.category])].filter(Boolean);
  const recommendationTopics = recommendation.evidence
    .filter(evidence => evidence.type === 'topic')
    .map(evidence => evidence.value);
  const matchedTopic = recommendationTopics.find(topic => topics.some(bookTopic => relatedText(bookTopic, topic)))
    || topics[0]
    || book.category;
  const evidenceTopic = matchedTopic || book.category;
  const hasHighlights = highlights.length > 0;
  const thoughtCount = highlights.filter(highlight => highlight.thought).length;
  const progressPercent = Math.round(Math.max(0, Math.min(book.progress, 1)) * 100);
  const readingHours = Math.floor(book.readingSeconds / 3600);
  const recommendationTopic = recommendationTopics.find(topic => relatedText(topic, evidenceTopic))
    || recommendationTopics[0]
    || recommendation.category;
  const descriptionHint = recommendation.description
    ? `它主要从“${summarizeRecommendationDescription(recommendation.description)}”展开`
    : `它把「${recommendationTopic}」放到更具体的阅读场景里`;
  const traceHint = hasHighlights
    ? thoughtCount > 0
      ? `你在《${book.title}》里留下了 ${highlights.length} 条划线和 ${thoughtCount} 条自己的想法，说明「${evidenceTopic}」已经不只是经过，而是被你停下来想过`
      : `你在《${book.title}》里留下了 ${highlights.length} 条划线，最近的阅读痕迹主要落在「${evidenceTopic}」附近`
    : book.readingSeconds > 0
      ? `你已经在《${book.title}》里读了${readingHours > 0 ? `${readingHours}小时` : '一段时间'}，但还没有留下太多划线；「${book.category}」更像是一个正在形成的兴趣入口`
      : `《${book.title}》目前留下的阅读痕迹还不多，先把它当作「${book.category}」方向的一条轻线索`;
  const stageHint = book.status === 'finished'
    ? `既然这本书已经读到收束处，可以把这个问题再往前追问一步`
    : book.status === 'paused' || book.status === 'abandoned'
      ? `你暂时停在${progressPercent > 0 ? `${progressPercent}%` : '开头'}，换一个相邻入口也许能让这个问题重新变得具体`
      : book.status === 'reading'
        ? `你还在读到${progressPercent}%的位置，下一本不必等到结尾，先把这条线索接住也很自然`
        : `这本书还没有正式展开，先用另一种视角试探「${evidenceTopic}」也合适`;
  const relationHint = recommendation.category === book.category
    ? `它和《${book.title}》同属「${book.category}」，更像是沿着同一条路把问题读深`
    : `它没有停留在「${book.category}」的原地，而是把这条线索带到「${recommendation.category}」里做一次对照`;
  const templates = [
    `${traceHint}。${stageHint}。所以推荐《${recommendation.title}》：${relationHint}，${descriptionHint}。`,
    `从《${book.title}》留下的「${evidenceTopic}」出发，下一步可以读《${recommendation.title}》。${descriptionHint}；它会${recommendation.category === book.category ? '把同一个问题再压深一层' : `从「${recommendation.category}」换一个角度回应它`}。`,
    `这不是按书名顺序接续，而是按你的阅读动作来接：${hasHighlights ? `你反复标记了「${evidenceTopic}」` : `你在「${book.category}」这里停留过`}。${recommendation.title}恰好提供了新的材料，${stageHint.replace(/。$/, '')}。`,
    `你在《${book.title}》里已经走到${progressPercent}%${thoughtCount > 0 ? '，并且留下了自己的判断' : ''}；《${recommendation.title}》适合成为下一段。它${recommendation.category === book.category ? `继续追踪「${recommendationTopic}」` : `把「${evidenceTopic}」放进${recommendation.category}的语境里`}，${descriptionHint}。`,
  ];
  const variant = stablePairHash(book.id, recommendation.bookId) % templates.length;

  return {
    ...recommendation,
    reason: templates[variant],
    evidence: [
      { type: 'topic', value: evidenceTopic },
      { type: 'book', value: book.title },
    ],
  };
}

function stablePairHash(left: string, right: string): number {
  return [...`${left}:${right}`].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function summarizeRecommendationDescription(description: string): string {
  const cleaned = description.replace(/\s+/g, ' ').trim().replace(/[。！？!?]+$/, '');
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[《》“”"'：:，,。！？!?\s]/g, '');
}

function relatedText(a: string, b: string): boolean {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function daysSince(value: string): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, (Date.now() - date.getTime()) / 86400000);
}

function createRecommendationReason(template: RecommendationTemplate, currentBook: Book | undefined, topTags: string[], topCategories: string[]): string {
  const matchedTheme = template.themes.find(theme => topTags.some(tag => relatedText(theme, tag))) || template.themes[0];
  const categoryHint = topCategories.includes(template.category) ? `它仍在你常读的「${template.category}」范围内` : `它会把你的阅读轻轻带到「${template.category}」`;
  const bookHint = currentBook ? `你最近从《${currentBook.title}》留下的线索里，已经出现了「${matchedTheme}」附近的问题` : `你的阅读轨迹里已经出现了「${matchedTheme}」附近的问题`;
  return `${bookHint}。${categoryHint}，但衔接点不是简单同类，而是${template.bridge}；读它可以让下一本书接在一个具体问题上，而不是只接在书名之后。`;
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

  const yearHighlights = data.highlights.filter(h => h.source === 'weread_personal' && yearBooks.some(book => book.id === h.bookId));
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
    return highlight.source === 'weread_personal'
      && !Number.isNaN(createdAt.getTime())
      && createdAt.getFullYear() === year
      && createdAt.getMonth() === month - 1;
  });
  const monthlySecondsByBook = new Map(monthBooks.map(book => [book.id, getBookMonthReadingSeconds(book, year, month)]));
  const totalSeconds = monthBooks.reduce((sum, book) => sum + (monthlySecondsByBook.get(book.id) || 0), 0);
  const finishedBooks = monthBooks.filter(book => book.status === 'finished');
  const highlightCount = monthHighlights.length || monthBooks.reduce((sum, book) => sum + book.highlightCount, 0);
  const categoryCount: Record<string, number> = {};
  monthBooks.forEach(book => { categoryCount[book.category] = (categoryCount[book.category] || 0) + 1; });
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(item => item[0] as Category);
  const longestBook = monthBooks.reduce((max, book) => (
    (monthlySecondsByBook.get(book.id) || 0) > (monthlySecondsByBook.get(max.id) || 0) ? book : max
  ), monthBooks[0]);
  const longestBookMonthlySeconds = longestBook ? monthlySecondsByBook.get(longestBook.id) || 0 : 0;
  const topicCounts = monthHighlights.reduce<Record<string, number>>((acc, highlight) => {
    highlight.topicTags.forEach(tag => { acc[tag] = (acc[tag] || 0) + 1; });
    return acc;
  }, {});
  const topics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(item => item[0]);
  const thoughtCount = monthHighlights.filter(highlight => highlight.thought).length;
  const avgSeconds = totalSeconds / Math.max(monthBooks.length, 1);
  const finishRate = finishedBooks.length / Math.max(monthBooks.length, 1);
  const thoughtDensity = thoughtCount / Math.max(monthHighlights.length, 1);
  const topicFocus = topics[0] ? (topicCounts[topics[0]] || 0) / Math.max(monthHighlights.length, 1) : 0;
  const categorySpan = topCategories.length;
  const personaName = chooseMonthlyPersonaName({
    avgSeconds,
    totalSeconds,
    monthBookCount: monthBooks.length,
    finishRate,
    thoughtDensity,
    topicFocus,
    categorySpan,
    highlightCount,
  });

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
    monthlyReadingSeconds: longestBookMonthlySeconds,
  };
}

function getTopMonthlyHighlight(highlights: Highlight[]): Highlight | null {
  return [...highlights].sort((a, b) => getHighlightScore(b) - getHighlightScore(a) || b.createdAt.localeCompare(a.createdAt))[0] || null;
}

function chooseMonthlyPersonaName(metrics: {
  avgSeconds: number;
  totalSeconds: number;
  monthBookCount: number;
  finishRate: number;
  thoughtDensity: number;
  topicFocus: number;
  categorySpan: number;
  highlightCount: number;
}): string {
  if (metrics.totalSeconds > 144000 && metrics.topicFocus >= 0.45) return '主题深井潜行者';
  if (metrics.avgSeconds > 42000 && metrics.finishRate >= 0.55) return '深度沉浸者';
  if (metrics.thoughtDensity >= 0.45 && metrics.highlightCount >= 5) return '边读边想者';
  if (metrics.monthBookCount >= 8 && metrics.categorySpan >= 4) return '多线编织者';
  if (metrics.monthBookCount >= 6 && metrics.categorySpan >= 3) return '多线漫游者';
  if (metrics.topicFocus >= 0.55 && metrics.highlightCount >= 4) return '问题追踪者';
  if (metrics.finishRate >= 0.75 && metrics.monthBookCount >= 3) return '收束型完成者';
  if (metrics.totalSeconds >= 72000 && metrics.finishRate < 0.35) return '材料采集者';
  if (metrics.categorySpan === 1 && metrics.monthBookCount >= 3) return '单向深耕者';
  if (metrics.highlightCount >= 10 && metrics.thoughtDensity < 0.2) return '金句拾荒者';
  if (metrics.monthBookCount <= 2 && metrics.avgSeconds > 24000) return '慢读守灯人';
  return '安静观察者';
}
