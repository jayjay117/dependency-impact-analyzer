import { driver, runQuery, toNumber } from './db.js';
import { buildDataset } from './generator.js';

async function load() {
  const data = buildDataset();

  // Idempotent loads: MERGE on a unique id means re-running never duplicates data.
  await runQuery(
    `UNWIND $rows AS row MERGE (t:Team {id: row.id}) SET t.name = row.name, t.contact = row.contact`,
    { rows: data.teams }
  );
  await runQuery(
    `UNWIND $rows AS row MERGE (l:Library {id: row.id}) SET l.name = row.name, l.ecosystem = row.ecosystem, l.version = row.version`,
    { rows: data.libraries }
  );
  await runQuery(
    `UNWIND $rows AS row MERGE (p:Project {id: row.id}) SET p.name = row.name, p.language = row.language, p.repoUrl = row.repoUrl, p.version = row.version`,
    { rows: data.projects }
  );
  await runQuery(
    `UNWIND $rows AS row MERGE (s:Service {id: row.id}) SET s.name = row.name, s.environment = row.environment, s.version = row.version`,
    { rows: data.services }
  );

  await runQuery(
    `UNWIND $rows AS row MATCH (a:Project {id: row.from}), (b:Library {id: row.to}) MERGE (a)-[:DEPENDS_ON]->(b)`,
    { rows: data.projLib }
  );
  await runQuery(
    `UNWIND $rows AS row MATCH (a:Library {id: row.from}), (b:Library {id: row.to}) MERGE (a)-[:DEPENDS_ON]->(b)`,
    { rows: data.libDeps }
  );
  await runQuery(
    `UNWIND $rows AS row MATCH (a:Service {id: row.from}), (b:Service {id: row.to}) MERGE (a)-[:CALLS]->(b)`,
    { rows: data.svcCalls }
  );
  await runQuery(
    `UNWIND $rows AS row MATCH (a:Project {id: row.from}), (b:Service {id: row.to}) MERGE (a)-[:CONSUMES]->(b)`,
    { rows: data.projConsumes }
  );
  await runQuery(
    `UNWIND $rows AS row MATCH (a {id: row.from}), (t:Team {id: row.to}) MERGE (a)-[:OWNED_BY]->(t)`,
    { rows: data.ownership }
  );

  const nodeRec = await runQuery(`MATCH (n) RETURN count(n) AS c`, {});
  const relRec = await runQuery(`MATCH ()-[r]->() RETURN count(r) AS c`, {});
  console.log(`Seeded ${toNumber(nodeRec[0].get('c'))} nodes and ${toNumber(relRec[0].get('c'))} relationships.`);
}

load()
  .then(() => driver.close())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Seed failed:', err.message);
    await driver.close();
    process.exit(1);
  });
