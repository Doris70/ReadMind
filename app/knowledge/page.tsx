'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CalendarDays, Maximize2, Minus, Move, Plus, Quote, Search, Sparkles } from 'lucide-react';
import NavBar from '@/components/ui/NavBar';
import { Book, Category, Highlight, UserData, CATEGORY_COLORS } from '@/lib/adapters/types';
import { loadUserData } from '@/lib/store';
import { buildKnowledgeMap, KnowledgeNode, KnowledgeRange } from '@/lib/knowledgeMap';

const rangeOptions: { value: KnowledgeRange; label: string }[] = [
  { value: '30d', label: '最近30天' },
  { value: '7d', label: '最近7天' },
  { value: 'year', label: '今年' },
  { value: 'all', label: '全部' },
];

const nodeLabels = {
  book: '书籍',
  theme: '主题',
  idea: '观点',
};

function nodeSize(node: KnowledgeNode) {
  return node.type === 'theme'
    ? 4.4 + Math.min(node.weight, 8) * 0.55
    : node.type === 'book'
      ? 3.4 + Math.min(node.weight, 6) * 0.45
      : 3.1 + Math.min(node.weight, 4) * 0.36;
}

function edgePath(source: KnowledgeNode, target: KnowledgeNode) {
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
  const bend = Math.min(distance * 0.12, 4.8);
  const controlX = midX - (dy / distance) * bend;
  const controlY = midY + (dx / distance) * bend;
  return {
    d: `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`,
    labelX: controlX,
    labelY: controlY,
  };
}

function relationLabel(type: string) {
  if (type === 'contains') return 'CONTAINS';
  if (type === 'supports') return 'SUPPORTS';
  if (type === 'from_book') return 'FROM';
  return 'SHARES';
}

function originLabel(origin?: KnowledgeNode['origin']) {
  if (origin === 'thought') return '来自我的想法';
  if (origin === 'highlight') return '由高价值划线提炼';
  if (origin === 'inferred') return '系统推断观点';
  return '图谱节点';
}

function getNodeBooks(node: KnowledgeNode, books: Book[]) {
  return node.bookIds.map(id => books.find(book => book.id === id)).filter((book): book is Book => Boolean(book));
}

function getNodeHighlights(node: KnowledgeNode, highlights: Highlight[]) {
  return node.highlightIds.map(id => highlights.find(highlight => highlight.id === id)).filter((highlight): highlight is Highlight => Boolean(highlight));
}

function getRelatedThemes(node: KnowledgeNode, nodes: KnowledgeNode[], edges: { source: string; target: string }[]) {
  return edges
    .filter(edge => edge.source === node.id || edge.target === node.id)
    .map(edge => nodes.find(item => item.id === (edge.source === node.id ? edge.target : edge.source)))
    .filter((item): item is KnowledgeNode => Boolean(item && item.type === 'theme'));
}

function getRelatedIdeas(node: KnowledgeNode, nodes: KnowledgeNode[], edges: { source: string; target: string }[]) {
  return edges
    .filter(edge => edge.source === node.id || edge.target === node.id)
    .map(edge => nodes.find(item => item.id === (edge.source === node.id ? edge.target : edge.source)))
    .filter((item): item is KnowledgeNode => Boolean(item && item.type === 'idea'));
}

export default function KnowledgePage() {
  const router = useRouter();
  const [data, setData] = useState<UserData | null>(null);
  const [range, setRange] = useState<KnowledgeRange>('30d');
  const [query, setQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeFlowNodeId, setActiveFlowNodeId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [graphScale, setGraphScale] = useState(1);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodeInteractionRef = useRef(false);

  useEffect(() => {
    const stored = loadUserData();
    if (!stored) {
      router.push('/setup');
      return;
    }
    setData(stored);
  }, [router]);

  const mapData = useMemo(() => data ? buildKnowledgeMap(data, range) : null, [data, range]);
  useEffect(() => {
    setNodePositions({});
    setSelectedNodeId(null);
    setActiveFlowNodeId(null);
  }, [range]);
  const positionedNodes = useMemo(() => mapData?.nodes.map(node => ({ ...node, ...(nodePositions[node.id] || {}) })) || [], [mapData, nodePositions]);
  const selectedNode = useMemo(() => positionedNodes.find(node => node.id === selectedNodeId) || null, [positionedNodes, selectedNodeId]);
  const activeFlowNode = useMemo(() => positionedNodes.find(node => node.id === activeFlowNodeId) || null, [positionedNodes, activeFlowNodeId]);

  const visibleNodeIds = useMemo(() => {
    if (!mapData) return new Set<string>();
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return new Set(mapData.nodes.map(node => node.id));
    const matched = new Set<string>();
    for (const node of mapData.nodes) {
      if (node.label.toLowerCase().includes(normalizedQuery) || node.description.toLowerCase().includes(normalizedQuery)) {
        matched.add(node.id);
      }
    }
    for (const edge of mapData.edges) {
      if (matched.has(edge.source) || matched.has(edge.target) || edge.label.toLowerCase().includes(normalizedQuery)) {
        matched.add(edge.source);
        matched.add(edge.target);
      }
    }
    return matched;
  }, [mapData, query]);

  const getSvgPoint = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 50, y: 50 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.max(5, Math.min(95, 50 + ((((event.clientX - rect.left) / rect.width) * 100) - 50) / graphScale)),
      y: Math.max(7, Math.min(93, 50 + ((((event.clientY - rect.top) / rect.height) * 100) - 50) / graphScale)),
    };
  };

  const startDrag = (event: PointerEvent<SVGGElement>, nodeId: string) => {
    event.preventDefault();
    event.stopPropagation();
    nodeInteractionRef.current = true;
    svgRef.current?.setPointerCapture(event.pointerId);
    setDraggingNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setActiveFlowNodeId(nodeId);
  };

  const clearSelection = () => {
    setSelectedNodeId(null);
    setActiveFlowNodeId(null);
    setDraggingNodeId(null);
  };

  const clearSelectionFromCanvas = () => {
    if (nodeInteractionRef.current) {
      nodeInteractionRef.current = false;
      return;
    }
    clearSelection();
  };

  const moveDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!draggingNodeId) return;
    const point = getSvgPoint(event);
    setNodePositions(current => ({ ...current, [draggingNodeId]: point }));
  };

  const zoom = (direction: 1 | -1) => {
    setGraphScale(current => Math.max(0.72, Math.min(1.85, Number((current + direction * 0.12).toFixed(2)))));
  };

  if (!data || !mapData) return null;

  const selectedBooks = selectedNode ? getNodeBooks(selectedNode, data.books) : [];
  const selectedHighlights = selectedNode ? getNodeHighlights(selectedNode, data.highlights) : [];
  const relatedThemes = selectedNode ? getRelatedThemes(selectedNode, positionedNodes, mapData.edges) : [];
  const relatedIdeas = selectedNode ? getRelatedIdeas(selectedNode, positionedNodes, mapData.edges) : [];

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-[1280px] px-5 pb-16 pt-8 sm:px-8">
        <header className="mb-7 flex flex-col justify-between gap-5 border-b border-line-soft/40 pb-7 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="ink-label">READMIND / KNOWLEDGE MAP</span>
              <span className="text-xs text-ink-soft">书籍 · 主题 · 观点</span>
            </div>
            <h1 className="mt-4 text-4xl leading-tight text-ink-deep sm:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
              个人知识地图
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-soft">
              它把分散在微信读书里的划线与想法，整理成一张“我反复被什么吸引”的图谱。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-5 text-right">
            <div>
              <p className="text-[11px] text-ink-soft">节点</p>
              <p className="mt-1 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{mapData.nodes.length}</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-soft">关系</p>
              <p className="mt-1 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{mapData.edges.length}</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-soft">划线</p>
              <p className="mt-1 text-2xl text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{data.highlights.length}</p>
            </div>
          </div>
        </header>

        <section className="mb-7 flex flex-col gap-4 border-y border-line-soft/35 py-4 lg:flex-row lg:items-center">
          <div className="inline-flex w-fit items-center gap-1 border border-line-soft/45 bg-paper-warm p-1">
            {rangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setRange(option.value)}
                className={`px-3 py-2 text-xs transition-colors ${range === option.value ? 'bg-ink-deep text-white' : 'text-ink-soft hover:text-ink-deep'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="flex min-w-0 flex-1 items-center gap-2 border border-line-soft/45 bg-paper-warm px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink-soft" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索主题、书名或观点，比如“认知”"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink-deep outline-none placeholder:text-ink-soft/55"
            />
          </label>
          <div className="flex flex-wrap gap-3 text-[11px] text-ink-soft">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-water-blue" /> 主题</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sun-yellow" /> 观点</span>
            {(Object.keys(CATEGORY_COLORS) as Category[]).map(category => {
              return (
                <span key={category} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
                  {category}
                </span>
              );
            })}
            <span className="inline-flex items-center gap-1.5"><Move className="h-3 w-3" /> 拖动节点整理图谱</span>
          </div>
        </section>

        <section className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative min-h-[640px] overflow-hidden border-y border-line-soft/35 bg-[#EEF6F0]/75">
            <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 50% 42%, rgba(156,206,208,0.22), transparent 34%), linear-gradient(90deg, rgba(100,118,111,0.07) 1px, transparent 1px), linear-gradient(0deg, rgba(100,118,111,0.05) 1px, transparent 1px)', backgroundSize: 'auto, 40px 40px, 40px 40px' }} />
            <div className="absolute right-4 top-4 z-20 flex items-center gap-1 border border-line-soft/45 bg-paper-warm/85 p-1 backdrop-blur-sm">
              <button className="icon-button border-0" onClick={() => zoom(-1)} title="缩小画布" aria-label="缩小画布"><Minus className="h-4 w-4" /></button>
              <span className="min-w-12 text-center text-xs text-ink-soft" style={{ fontFamily: 'var(--font-number)' }}>{Math.round(graphScale * 100)}%</span>
              <button className="icon-button border-0" onClick={() => zoom(1)} title="放大画布" aria-label="放大画布"><Plus className="h-4 w-4" /></button>
              <button className="icon-button border-0" onClick={() => setGraphScale(1)} title="重置缩放" aria-label="重置缩放"><Maximize2 className="h-4 w-4" /></button>
            </div>
            <div className="absolute left-5 top-5 z-10 max-w-sm">
              <span className="ink-label">MAP INTERPRETATION</span>
              <p className="mt-2 text-sm leading-7 text-ink-soft">{mapData.summary}</p>
            </div>
            <svg
              ref={svgRef}
              viewBox="0 0 100 100"
              className="h-[640px] w-full touch-none select-none"
              onPointerMove={moveDrag}
              onPointerUp={() => setDraggingNodeId(null)}
              onPointerLeave={() => setDraggingNodeId(null)}
              onClick={event => {
                if (event.target === event.currentTarget) clearSelectionFromCanvas();
              }}
              onWheel={event => {
                event.preventDefault();
                setGraphScale(current => Math.max(0.72, Math.min(1.85, Number((current + (event.deltaY > 0 ? -0.08 : 0.08)).toFixed(2)))));
              }}
            >
              <defs>
                <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#263B35" floodOpacity="0.13" />
                </filter>
                <filter id="halo" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="2.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="nodeGlow">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g transform={`translate(50 50) scale(${graphScale}) translate(-50 -50)`}>
              <rect x="0" y="0" width="100" height="100" fill="transparent" onClick={clearSelectionFromCanvas} />
              {mapData.edges.map(edge => {
                const source = positionedNodes.find(node => node.id === edge.source);
                const target = positionedNodes.find(node => node.id === edge.target);
                if (!source || !target) return null;
                const isVisible = visibleNodeIds.has(source.id) && visibleNodeIds.has(target.id);
                const isSelected = selectedNode ? source.id === selectedNode.id || target.id === selectedNode.id : false;
                const isFlowing = activeFlowNode ? source.id === activeFlowNode.id || target.id === activeFlowNode.id : false;
                const path = edgePath(source, target);
                return (
                  <g key={edge.id} opacity={isVisible ? (isFlowing ? 0.86 : isSelected ? 0.68 : 0.32) : 0.05}>
                    <path
                      d={path.d}
                      fill="none"
                      stroke={edge.type === 'shared' ? '#93B8C6' : '#64766F'}
                      strokeWidth={isFlowing ? 0.42 + edge.weight * 0.05 : 0.18 + edge.weight * 0.04}
                      strokeDasharray={edge.type === 'shared' ? '1.3 1.1' : undefined}
                      className={isFlowing ? 'knowledge-edge-active' : 'knowledge-edge'}
                    />
                    {isSelected && (
                      <>
                        <rect x={path.labelX - 4.8} y={path.labelY - 1.55} width="9.6" height="3.1" rx="1.5" fill="#FAF9F1" opacity="0.86" />
                        <text x={path.labelX} y={path.labelY + 0.8} textAnchor="middle" fontSize="1.35" fill="#64766F" style={{ fontFamily: 'var(--font-number)' }}>
                          {relationLabel(edge.type)}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
              {positionedNodes.map(node => {
                const isVisible = visibleNodeIds.has(node.id);
                const isSelected = selectedNode?.id === node.id;
                const size = nodeSize(node);
                return (
                  <g
                    key={node.id}
                    opacity={isVisible ? 1 : 0.12}
                    className="cursor-grab transition-opacity active:cursor-grabbing"
                    onPointerDown={event => startDrag(event, node.id)}
                    onClick={event => {
                      event.stopPropagation();
                      nodeInteractionRef.current = false;
                      setSelectedNodeId(node.id);
                      setActiveFlowNodeId(node.id);
                    }}
                  >
                    <circle cx={node.x} cy={node.y} r={size + (isSelected ? 4.4 : 2.6)} fill={node.color} opacity={isSelected ? 0.22 : 0.11} filter="url(#halo)" className={isSelected ? 'knowledge-node-halo' : ''} />
                    <circle cx={node.x} cy={node.y} r={size + 2.6} fill="url(#nodeGlow)" opacity={isSelected ? 0.95 : 0.42} />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={size}
                      fill={node.color}
                      stroke={isSelected ? node.color : '#FAF9F1'}
                      strokeWidth={isSelected ? 1.05 : 0.46}
                      filter="url(#softShadow)"
                      className={draggingNodeId === node.id ? '' : 'transition-all duration-300'}
                    />
                    {isSelected && <circle cx={node.x} cy={node.y} r={size + 1.15} fill="none" stroke="#FAF9F1" strokeOpacity="0.85" strokeWidth="0.32" />}
                    {node.type === 'theme' && <circle cx={node.x} cy={node.y} r={size - 1.6} fill="none" stroke="#FAF9F1" strokeOpacity="0.42" strokeWidth="0.35" />}
                    <rect
                      x={node.x - Math.min(Math.max(node.label.length * 1.2, 9), 23) / 2}
                      y={node.y + size + 1.2}
                      width={Math.min(Math.max(node.label.length * 1.2, 9), 23)}
                      height="4.6"
                      rx="2.2"
                      fill="#FAF9F1"
                      opacity={isVisible ? 0.72 : 0.1}
                    />
                    <text
                      x={node.x}
                      y={node.y + size + 4.3}
                      textAnchor="middle"
                      fontSize={node.type === 'theme' ? 2.05 : 1.72}
                      fill="#263B35"
                      opacity={isVisible ? 0.92 : 0.2}
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {node.label.length > 8 ? `${node.label.slice(0, 8)}...` : node.label}
                    </text>
                  </g>
                );
              })}
              </g>
            </svg>
          </div>

          <aside className="border-y border-line-soft/35 py-6">
            {selectedNode ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="ink-label">{nodeLabels[selectedNode.type]}</span>
                    <h2 className="mt-2 text-2xl leading-tight text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>{selectedNode.label}</h2>
                    {selectedNode.type === 'book' && selectedNode.category && (
                      <span className="mt-3 inline-flex items-center gap-1.5 border border-line-soft/40 bg-paper-light px-2.5 py-1 text-xs text-ink-soft">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[selectedNode.category] }} />
                        {selectedNode.category}
                      </span>
                    )}
                  </div>
                  <span className="rounded-full border border-line-soft/40 px-2 py-1 text-xs text-ink-soft">{selectedNode.weight}</span>
                </div>
                {selectedNode.type === 'idea' && (
                  <p className="mt-3 inline-flex bg-sun-yellow/25 px-2.5 py-1 text-xs text-ink-deep">{originLabel(selectedNode.origin)}</p>
                )}
                <p className="mt-4 text-sm leading-7 text-ink-soft">{selectedNode.description}</p>
                <div className="mt-6 grid grid-cols-2 gap-px border border-line-soft/25 bg-line-soft/25">
                  <div className="bg-paper-light p-3">
                    <BookOpen className="h-4 w-4 text-sprout-green" />
                    <p className="mt-2 text-[11px] text-ink-soft">关联书籍</p>
                    <p className="text-lg text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{selectedBooks.length}</p>
                  </div>
                  <div className="bg-paper-light p-3">
                    <Quote className="h-4 w-4 text-sun-yellow" />
                    <p className="mt-2 text-[11px] text-ink-soft">相关划线</p>
                    <p className="text-lg text-ink-deep" style={{ fontFamily: 'var(--font-number)' }}>{selectedHighlights.length}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <span className="ink-label">RELATED BOOKS</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedBooks.map(book => (
                      <span key={book.id} className="border border-line-soft/40 bg-paper-light px-2.5 py-1 text-xs text-ink-soft">{book.title}</span>
                    ))}
                  </div>
                </div>
                {selectedNode.type === 'idea' && (
                  <div className="mt-6">
                    <span className="ink-label">RELATED THEMES</span>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {relatedThemes.length > 0 ? relatedThemes.map(theme => (
                        <button key={theme.id} onClick={() => { setSelectedNodeId(theme.id); setActiveFlowNodeId(theme.id); }} className="border border-water-blue/40 bg-water-blue/10 px-2.5 py-1 text-xs text-ink-deep">{theme.label}</button>
                      )) : <span className="text-xs text-ink-soft">暂时没有直接主题连接。</span>}
                    </div>
                  </div>
                )}
                {selectedNode.type === 'theme' && (
                  <div className="mt-6">
                    <span className="ink-label">RELATED IDEAS</span>
                    <div className="mt-3 space-y-2">
                      {relatedIdeas.length > 0 ? relatedIdeas.slice(0, 5).map(idea => (
                        <button key={idea.id} onClick={() => { setSelectedNodeId(idea.id); setActiveFlowNodeId(idea.id); }} className="block w-full border-l-2 border-sun-yellow bg-paper-light px-3 py-2 text-left text-xs leading-5 text-ink-deep">{idea.label}</button>
                      )) : <span className="text-xs text-ink-soft">这个主题还没有提炼出观点。</span>}
                    </div>
                  </div>
                )}
                <div className="mt-7">
                  <span className="ink-label">ORIGINAL TRACES</span>
                  <div className="mt-3 max-h-64 space-y-4 overflow-y-auto pr-1">
                    {selectedHighlights.slice(0, 5).map(highlight => {
                      const book = data.books.find(item => item.id === highlight.bookId);
                      return (
                        <article key={highlight.id} className="border-l-2 border-sun-yellow pl-3">
                          <p className="text-xs text-ink-soft">{book?.title || '未知书籍'} · {highlight.chapter || '未分类章节'}</p>
                          <p className="mt-1 text-sm leading-6 text-ink-deep">“{highlight.content}”</p>
                          {highlight.thought && <p className="mt-1 text-xs leading-5 text-dust-rose">想法：{highlight.thought}</p>}
                        </article>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-soft">点击任意节点查看关联内容。</p>
            )}
          </aside>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {mapData.insights.map((insight, index) => {
            const icons = [Sparkles, CalendarDays, Search];
            const Icon = icons[index] || Sparkles;
            return (
              <div key={insight.title} className="section-rule pt-5">
                <Icon className="h-4 w-4 text-water-blue" />
                <h3 className="mt-3 text-lg text-ink-deep" style={{ fontFamily: 'var(--font-display)' }}>{insight.title}</h3>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{insight.detail}</p>
              </div>
            );
          })}
        </section>

      </main>
    </div>
  );
}
