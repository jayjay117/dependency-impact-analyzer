const BASE = '';

async function api<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export type SearchResult = {
  id: string;
  name: string;
  kind: string;
  language?: string;
  ecosystem?: string;
};

export type ImpactRow = {
  id: string;
  name: string;
  kind: string;
  team: string;
  depth: number;
};

export type Highlight = { id: string; name: string; fanIn: number };

export const search = (q: string) => api<SearchResult[]>('/api/search?q=' + encodeURIComponent(q));
export const highlights = () => api<{ libraries: Highlight[]; services: Highlight[] }>('/api/highlights');
export const stats = () => api<{ nodes: number; relationships: number }>('/api/stats');
export const getNode = (id: string) => api<Record<string, unknown> | null>('/api/node/' + encodeURIComponent(id));
export const subgraph = (id: string, dir: 'in' | 'out') =>
  api<{ nodes: any[]; edges: { source: string; target: string; type: string }[] }>(
    '/api/graph/' + encodeURIComponent(id) + '?dir=' + dir
  );
export const impact = (id: string) => api<ImpactRow[]>('/api/impact/' + encodeURIComponent(id));
