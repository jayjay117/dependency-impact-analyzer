import neo4j from 'neo4j-driver';
import { config } from './config.js';

export const driver = neo4j.driver(
  config.uri,
  neo4j.auth.basic(config.user, config.password)
);

// Run a Cypher statement with parameters and always release the session.
// A single driver instance is reused for the process lifetime; sessions are
// cheap and closed immediately so we stay well under the 200-connection free-tier limit.
export async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
}

export async function checkConnectivity() {
  try {
    await driver.verifyConnectivity();
    return true;
  } catch {
    return false;
  }
}

export function toNumber(value) {
  if (value == null) return value;
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return value;
}
