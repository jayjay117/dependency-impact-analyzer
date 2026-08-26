import cytoscape from 'cytoscape';
import { useEffect, useRef } from 'react';

const KIND_COLOR: Record<string, string> = {
  Team: '#94a3b8',
  Library: '#38bdf8',
  Project: '#a78bfa',
  Service: '#fb7185',
};

type GNode = { id: string; name: string; kind: string };
type GEdge = { source: string; target: string; type: string };

export default function GraphView({
  nodes,
  edges,
  rootId,
  onSelect,
}: {
  nodes: GNode[];
  edges: GEdge[];
  rootId: string;
  onSelect?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.name,
            bg: KIND_COLOR[n.kind] || '#cbd5e1',
            isRoot: n.id === rootId ? 1 : 0,
          },
        })),
        edges: edges.map((e) => ({
          data: {
            id: `${e.source}|${e.target}|${e.type}`,
            source: e.source,
            target: e.target,
            label: e.type,
          },
        })),
      },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(bg)',
            label: 'data(label)',
            color: '#0f172a',
            'font-size': 11,
            'text-valign': 'center',
            'text-halign': 'center',
            width: 46,
            height: 46,
            'text-wrap': 'wrap',
            'text-max-width': 72,
            'border-width': 1,
            'border-color': '#e2e8f0',
          },
        },
        { selector: 'node[isRoot=1]', style: { 'border-width': 4, 'border-color': '#0f172a' } },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            label: 'data(label)',
            'font-size': 8,
            color: '#64748b',
            'text-rotation': 'autorotate',
            'text-background-color': '#ffffff',
            'text-background-opacity': 1,
            'text-background-padding': 2,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 30,
        nodeRepulsion: 6000,
        idealEdgeLength: 90,
      },
    });
    cy.on('tap', 'node', (evt) => onSelectRef.current?.(evt.target.id()));
    return () => cy.destroy();
  }, [nodes, edges, rootId]);

  return <div ref={containerRef} className="h-[540px] w-full rounded-xl border bg-slate-50" />;
}
