-- ============================================================================
-- Project Dependency & Impact Analyzer — reference Cypher queries
-- All queries are parameterised ($param). No string concatenation is used
-- anywhere in the application; the backend passes parameters through the
-- official Neo4j driver.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SEARCH  (autocomplete in the UI)
-- ----------------------------------------------------------------------------
MATCH (n)
WHERE n.name CONTAINS $term OR coalesce(n.id, '') CONTAINS $term
RETURN n.id AS id, n.name AS name, labels(n)[0] AS kind,
       n.language AS language, n.ecosystem AS ecosystem
ORDER BY n.name
LIMIT 40;

-- ----------------------------------------------------------------------------
-- 2. MULTI-HOP TRAVERSAL  (>= 2 hops) — full transitive dependency tree
--    Outbound: everything a node depends on / consumes / calls.
--    Inbound : everything that depends on / consumes / calls the node.
-- ----------------------------------------------------------------------------
-- direction = OUT : dependencies of a project
MATCH (n {id: $id})-[rels:DEPENDS_ON|CONSUMES|CALLS*1..5]->(m)
RETURN n, rels, m;

-- direction = IN  : upstream callers / consumers (used for the graph view)
MATCH (n {id: $id})<-[rels:DEPENDS_ON|CONSUMES|CALLS*1..5]-(m)
RETURN n, rels, m;

-- ----------------------------------------------------------------------------
-- 3. IMPACT ANALYSIS  — the query a relational database finds awkward
--    "Given a shared library, which projects/services are affected, how many
--     hops away, and which TEAMS own them?"
--    This is a reverse transitive closure grouped + aggregated by owning team.
--    In SQL this needs a recursive CTE plus client-side grouping; in Cypher
--    it is a single declarative pattern.
-- ----------------------------------------------------------------------------
MATCH (n {id: $id})<-[rels:DEPENDS_ON|CONSUMES|CALLS*1..5]-(m)
WITH m, min(length(rels)) AS depth
OPTIONAL MATCH (m)-[:OWNED_BY]->(t:Team)
RETURN m.id AS id, m.name AS name, labels(m)[0] AS kind,
       coalesce(t.name, 'Unassigned') AS team, depth AS depth
ORDER BY depth ASC, team ASC, m.name ASC;

-- ----------------------------------------------------------------------------
-- 4. HIGHLIGHTS  — most-influential starting points for the empty state
-- ----------------------------------------------------------------------------
MATCH (l:Library)<-[:DEPENDS_ON]-(x)
RETURN l.id AS id, l.name AS name, count(x) AS fanIn
ORDER BY fanIn DESC LIMIT 3;

MATCH (s:Service)<-[:CALLS|CONSUMES*1..5]-(x)
RETURN s.id AS id, s.name AS name, count(DISTINCT x) AS fanIn
ORDER BY fanIn DESC LIMIT 3;

-- ----------------------------------------------------------------------------
-- 5. SEED INTEGRITY  — verify load (idempotent MERGE never duplicates)
-- ----------------------------------------------------------------------------
MATCH (n) RETURN count(n) AS nodes;
MATCH ()-[r]->() RETURN count(r) AS relationships;
