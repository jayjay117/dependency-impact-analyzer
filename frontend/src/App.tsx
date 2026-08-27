import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Search, Boxes, Layers, AlertTriangle, Users, X, Loader2, Network } from 'lucide-react';
import GraphView from './GraphView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  search,
  highlights,
  stats,
  getNode,
  subgraph,
  impact,
  SearchResult,
  ImpactRow,
  Highlight,
} from './api';

gsap.registerPlugin(useGSAP);

type Mode = 'browse' | 'impact';
type Selected = { id: string; name: string; kind: string };

const KIND_COLOR: Record<string, string> = {
  Team: '#94a3b8',
  Library: '#38bdf8',
  Project: '#a78bfa',
  Service: '#fb7185',
};

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [mode, setMode] = useState<Mode>('browse');
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [impactRows, setImpactRows] = useState<ImpactRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbDown, setDbDown] = useState(false);
  const [stat, setStat] = useState<{ nodes: number; relationships: number } | null>(null);
  const [hl, setHl] = useState<{ libraries: Highlight[]; services: Highlight[] } | null>(null);

  const appRef = useRef<HTMLDivElement>(null);

  const loadMeta = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([stats(), highlights()]);
      setStat(s);
      setHl(h);
      setDbDown(false);
    } catch {
      setDbDown(true);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const selectNode = useCallback(
    async (node: Selected) => {
      setSelected(node);
      setShowResults(false);
      setError(null);
      setLoading(true);
      try {
        if (mode === 'browse') {
          const g = await subgraph(node.id, 'out');
          setGraph(g);
          setImpactRows(null);
        } else {
          const [g, imp] = await Promise.all([subgraph(node.id, 'in'), impact(node.id)]);
          setGraph(g);
          setImpactRows(imp);
        }
        setDbDown(false);
      } catch (e: any) {
        setError(e.message || 'Failed to load graph');
        if (/unreachable/i.test(e.message || '')) setDbDown(true);
      } finally {
        setLoading(false);
      }
    },
    [mode]
  );

  const handleGraphSelect = useCallback(
    async (id: string) => {
      try {
        const node = await getNode(id);
        if (node)
          await selectNode({ id: node.id as string, name: node.name as string, kind: node.kind as string });
      } catch {
        /* ignore */
      }
    },
    [selectNode]
  );

  const onSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length === 0) {
      setResults([]);
      return;
    }
    try {
      const r = await search(q);
      setResults(r);
      setShowResults(true);
    } catch {
      setResults([]);
    }
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    if (selected) selectNode(selected);
  };

  // Mount entrance
  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from('.gsap-mount', { opacity: 0, y: 16, duration: 0.5, stagger: 0.08, ease: 'power2.out' });
    },
    { scope: appRef }
  );

  // Content entrance whenever a node is (re)selected or the mode changes
  useGSAP(
    () => {
      if (!selected || loading || reducedMotion()) return;
      gsap.from('.gsap-stagger', {
        opacity: 0,
        y: 18,
        duration: 0.45,
        stagger: 0.06,
        ease: 'power2.out',
        clearProps: 'all',
      });
    },
    { scope: appRef, dependencies: [selected?.id, mode] }
  );

  const directDepNodes = graph && selected
    ? graph.edges
        .filter((e) => e.source === selected.id)
        .map((e) => graph.nodes.find((n) => n.id === e.target))
        .filter(Boolean)
    : [];

  const teamsMap: Record<string, ImpactRow[]> = {};
  impactRows?.forEach((r) => {
    (teamsMap[r.team] ||= []).push(r);
  });
  const teamList = Object.entries(teamsMap).sort((a, b) => b[1].length - a[1].length);

  return (
    <div ref={appRef} className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Header */}
        <header className="gsap-mount relative z-50 mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Dependency &amp; Impact Analyzer</h1>
              <p className="text-sm text-muted-foreground">
                {stat
                  ? `${stat.nodes} nodes · ${stat.relationships} relationships · powered by CognoDB`
                  : 'Mapping how your software connects'}
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search a project, library or service…"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              onFocus={() => results.length && setShowResults(true)}
            />
            {showResults && results.length > 0 && (
              <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border bg-card shadow-lg">
                {results.map((r) => (
                  <button
                    key={r.id}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setQuery(r.name);
                      selectNode({ id: r.id, name: r.name, kind: r.kind });
                    }}
                  >
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: KIND_COLOR[r.kind] || '#cbd5e1' }} />
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{r.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {dbDown && (
          <div className="gsap-mount mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            The database is currently unreachable. Please try again in a moment.
          </div>
        )}

        {/* Mode switcher */}
        <div className="gsap-mount mb-6">
          <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="browse" className="gap-2">
                <Layers className="h-4 w-4" /> Browse dependencies
              </TabsTrigger>
              <TabsTrigger value="impact" className="gap-2">
                <AlertTriangle className="h-4 w-4" /> Impact analysis
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Empty state */}
        {!selected && (
          <Card className="gsap-mount">
            <CardContent className="p-8 text-center">
              <Boxes className="mx-auto mb-4 h-10 w-10 text-primary" />
              <h2 className="text-lg font-semibold">Explore how your software connects</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                Search for any project, library or service above, or start from one of the most
                influential nodes in your graph.
              </p>
              {hl && (
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">Most depended-on libraries</h3>
                    <div className="flex flex-col gap-2">
                      {hl.libraries.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => selectNode({ id: l.id, name: l.name, kind: 'Library' })}
                          className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:border-primary"
                        >
                          <span className="font-medium">{l.name}</span>
                          <Badge variant="muted">{l.fanIn} dependents</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">Most central services</h3>
                    <div className="flex flex-col gap-2">
                      {hl.services.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => selectNode({ id: s.id, name: s.name, kind: 'Service' })}
                          className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:border-primary"
                        >
                          <span className="font-medium">{s.name}</span>
                          <Badge variant="muted">{s.fanIn} dependents</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Workspace */}
        {selected && (
          <div className="gsap-mount grid gap-4 lg:grid-cols-[1fr_340px]">
            <Card className="gsap-stagger overflow-hidden">
              <div className="flex items-center gap-3 border-b p-4">
                <span className="h-3 w-3 rounded-sm" style={{ background: KIND_COLOR[selected.kind] || '#cbd5e1' }} />
                <h2 className="flex-1 text-base font-semibold">
                  {selected.name} <span className="text-sm font-normal text-muted-foreground">({selected.kind})</span>
                </h2>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setSelected(null); setGraph(null); setImpactRows(null); }}>
                  <X className="h-4 w-4" /> Clear
                </Button>
              </div>
              <div className="relative p-4">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-xl bg-background/70">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {!loading && !error && graph && <GraphView nodes={graph.nodes} edges={graph.edges} rootId={selected.id} onSelect={handleGraphSelect} />}
                {!loading && !error && graph && graph.nodes.length === 1 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No {mode === 'browse' ? 'outgoing' : 'incoming'} connections found.
                  </p>
                )}
              </div>
            </Card>

            <Card className="gsap-stagger self-start">
              <CardHeader>
                <CardTitle className="text-sm">
                  {mode === 'browse' ? 'Direct dependencies' : 'Blast radius'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <>
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                  </>
                ) : mode === 'browse' ? (
                  <>
                    {directDepNodes.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
                    <ul className="space-y-1">
                      {directDepNodes.map((n: any) => (
                        <li
                          key={n.id}
                          onClick={() => handleGraphSelect(n.id)}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                        >
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: KIND_COLOR[n.kind] || '#cbd5e1' }} />
                          <span className="font-medium">{n.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{n.kind}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="pt-2 text-xs text-muted-foreground">
                      The graph shows the full transitive dependency tree. Click any node to navigate into it.
                    </p>
                  </>
                ) : (
                  <>
                    {impactRows && impactRows.length === 0 && (
                      <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
                        Nothing depends on <span className="font-medium text-foreground">{selected.name}</span> — it's a
                        terminal component, so its blast radius is empty. Try a foundational library like{' '}
                        <span className="font-medium">@northwind/core-utils</span> to see downstream impact.
                      </p>
                    )}
                    {impactRows && impactRows.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {impactRows.length} component(s) depend on, consume or call{' '}
                        <span className="font-medium text-foreground">{selected.name}</span> — directly or transitively.
                      </p>
                    )}
                    {teamList.map(([team, rows]) => (
                      <div key={team} className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            <Users className="h-4 w-4 text-muted-foreground" /> {team}
                          </span>
                          <Badge variant="muted">{rows.length}</Badge>
                        </div>
                        <ul className="space-y-1">
                          {rows.map((r) => (
                            <li
                              key={r.id}
                              onClick={() => handleGraphSelect(r.id)}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent"
                            >
                              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: KIND_COLOR[r.kind] || '#cbd5e1' }} />
                              <span className="flex-1 truncate">{r.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {r.kind} · {r.depth} hop{r.depth === 1 ? '' : 's'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <footer className="gsap-mount mt-8 text-center text-xs text-muted-foreground">
          Built with CognoDB (openCypher over Bolt) · Impact = transitive downstream closure grouped by owning team.
        </footer>
      </div>
    </div>
  );
}
