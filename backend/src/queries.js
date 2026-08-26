import { runQuery, toNumber } from './db.js';

// Convert a Neo4j Node record into a plain object for the API/json response.
function nodeToObj(node) {
  return { ...node.properties, kind: node.labels[0] };
}

// Relationship types that form the dependency / impact fabric of the graph.
const REL_TYPES = 'DEPENDS_ON|CONSUMES|CALLS';

export async function searchNodes(term) {
  const records = await runQuery(
    `MATCH (n)
     WHERE n.name CONTAINS $term OR coalesce(n.id, '') CONTAINS $term
     RETURN n.id AS id, n.name AS name, labels(n)[0] AS kind,
            n.language AS language, n.ecosystem AS ecosystem
     ORDER BY n.name
     LIMIT 40`,
    { term }
  );
  return records.map((r) => r.toObject());
}

export async function getNode(id) {
  const records = await runQuery(
    `MATCH (n {id: $id}) RETURN n`,
    { id }
  );
  if (records.length === 0) return null;
  return nodeToObj(records[0].get('n'));
}

// Multi-hop traversal in either direction (out = dependencies, in = impact/blast radius).
export async function getSubgraph(id, direction = 'out') {
  const pattern =
    direction === 'in'
      ? '(n)<-[:' + REL_TYPES + '*1..5]-(m)'
      : '(n)-[:' + REL_TYPES + '*1..5]->(m)';

  const edgeRecords = await runQuery(
    `MATCH (n {id: $id})
     MATCH p = ${pattern}
     UNWIND relationships(p) AS r
     RETURN DISTINCT startNode(r).id AS source, endNode(r).id AS target, type(r) AS type`,
    { id }
  );

  const edges = edgeRecords.map((r) => r.toObject());
  const ids = new Set([id]);
  for (const e of edges) {
    ids.add(e.source);
    ids.add(e.target);
  }

  const nodeRecords = await runQuery(
    `MATCH (x) WHERE x.id IN $ids RETURN x`,
    { ids: Array.from(ids) }
  );
  const nodes = nodeRecords.map((r) => nodeToObj(r.get('x')));

  return { nodes, edges };
}

// Impact analysis: every component that transitively depends on / consumes / calls
// the selected node, together with the owning team and shortest dependency depth.
// This transitive closure grouped by owning team is the query a relational schema
// struggles with (would need recursive CTEs + client-side aggregation).
export async function getImpact(id) {
  const records = await runQuery(
    `     MATCH (n {id: $id})<-[rels:${REL_TYPES}*1..5]-(m)
     WITH m, min(length(rels)) AS depth
     OPTIONAL MATCH (m)-[:OWNED_BY]->(t:Team)
     RETURN m.id AS id, m.name AS name, labels(m)[0] AS kind,
            coalesce(t.name, 'Unassigned') AS team, depth AS depth
     ORDER BY depth ASC, team ASC, m.name ASC`,
    { id }
  );
  return records.map((r) => {
    const o = r.toObject();
    o.depth = toNumber(o.depth);
    return o;
  });
}

// Notable starting points for the UI (highest fan-in library + central services).
export async function getHighlights() {
  const libRecords = await runQuery(
    `MATCH (l:Library)<-[ :DEPENDS_ON]-(x)
     RETURN l.id AS id, l.name AS name, count(x) AS fanIn
     ORDER BY fanIn DESC LIMIT 3`,
    {}
  );
  const svcRecords = await runQuery(
    `MATCH (s:Service)<-[ :CALLS|CONSUMES*1..5]-(x)
     RETURN s.id AS id, s.name AS name, count(DISTINCT x) AS fanIn
     ORDER BY fanIn DESC LIMIT 3`,
    {}
  );
  return {
    libraries: libRecords.map((r) => {
      const o = r.toObject();
      o.fanIn = toNumber(o.fanIn);
      return o;
    }),
    services: svcRecords.map((r) => {
      const o = r.toObject();
      o.fanIn = toNumber(o.fanIn);
      return o;
    }),
  };
}

export async function getStats() {
  const nodeRec = await runQuery(`MATCH (n) RETURN count(n) AS c`, {});
  const relRec = await runQuery(`MATCH ()-[r]->() RETURN count(r) AS c`, {});
  return {
    nodes: toNumber(nodeRec[0].get('c')),
    relationships: toNumber(relRec[0].get('c')),
  };
}
