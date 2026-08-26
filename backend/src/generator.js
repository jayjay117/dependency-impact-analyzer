// Deterministic dataset generator for a fictional company "Northwind".
// Produces labelled nodes and typed relationships so the graph is interesting
// to explore: shared internal libraries create real blast-radius scenarios.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(1337);
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
};

// Node ids must be safe in URLs (no slashes), while `name` keeps the real label.
const idOf = (name) => name.replace(/[/\s]/g, '__');

export function buildDataset() {
  const teams = [
    { id: 'team-platform', name: 'Platform Engineering', contact: '#platform' },
    { id: 'team-payments', name: 'Payments', contact: '#payments' },
    { id: 'team-identity', name: 'Identity & Access', contact: '#identity' },
    { id: 'team-data', name: 'Data Platform', contact: '#data' },
    { id: 'team-mobile', name: 'Mobile', contact: '#mobile' },
    { id: 'team-web', name: 'Web', contact: '#web' },
    { id: 'team-growth', name: 'Growth', contact: '#growth' },
    { id: 'team-support', name: 'Customer Support', contact: '#support' },
  ];

  const externalLibs = [
    { name: 'react', ecosystem: 'npm', version: '18.3.1' },
    { name: 'react-dom', ecosystem: 'npm', version: '18.3.1' },
    { name: 'lodash', ecosystem: 'npm', version: '4.17.21' },
    { name: 'axios', ecosystem: 'npm', version: '1.7.2' },
    { name: 'express', ecosystem: 'npm', version: '4.19.2' },
    { name: 'winston', ecosystem: 'npm', version: '3.13.0' },
    { name: 'jsonwebtoken', ecosystem: 'npm', version: '9.0.2' },
    { name: 'requests', ecosystem: 'pip', version: '2.32.3' },
    { name: 'flask', ecosystem: 'pip', version: '3.0.3' },
    { name: 'sqlalchemy', ecosystem: 'pip', version: '2.0.30' },
    { name: 'pandas', ecosystem: 'pip', version: '2.2.2' },
    { name: 'numpy', ecosystem: 'pip', version: '1.26.4' },
    { name: 'pydantic', ecosystem: 'pip', version: '2.7.1' },
    { name: 'spring-boot', ecosystem: 'maven', version: '3.3.0' },
    { name: 'jackson', ecosystem: 'maven', version: '2.17.1' },
    { name: 'log4j', ecosystem: 'maven', version: '2.23.1' },
    { name: 'commons-lang3', ecosystem: 'maven', version: '3.14.0' },
    { name: 'gin', ecosystem: 'go', version: '1.10.0' },
    { name: 'zap', ecosystem: 'go', version: '1.27.0' },
    { name: 'pgx', ecosystem: 'go', version: '5.6.0' },
  ];

  const internalLibs = [
    { name: '@northwind/core-utils', ecosystem: 'npm', version: '2.4.0', deps: ['lodash', 'axios', 'winston'] },
    { name: '@northwind/auth-sdk', ecosystem: 'npm', version: '1.8.2', deps: ['@northwind/core-utils', 'jsonwebtoken'] },
    { name: '@northwind/config-loader', ecosystem: 'npm', version: '1.2.0', deps: ['@northwind/core-utils'] },
    { name: '@northwind/ui-kit', ecosystem: 'npm', version: '3.1.0', deps: ['react', 'react-dom', '@northwind/core-utils'] },
    { name: '@northwind/data-client', ecosystem: 'pip', version: '2.0.1', deps: ['requests', 'sqlalchemy', '@northwind/core-utils'] },
    { name: '@northwind/event-bus', ecosystem: 'go', version: '1.4.0', deps: ['zap', 'pgx'] },
    { name: '@northwind/ml-features', ecosystem: 'pip', version: '0.9.3', deps: ['pandas', 'numpy', '@northwind/data-client'] },
    { name: 'com.northwind.payments', ecosystem: 'maven', version: '4.2.0', deps: ['spring-boot', 'jackson', '@northwind/core-utils', 'log4j', 'commons-lang3'] },
    { name: 'com.northwind.logging', ecosystem: 'go', version: '1.1.0', deps: ['zap'] },
    { name: 'com.northwind.identity', ecosystem: 'npm', version: '2.0.0', deps: ['@northwind/auth-sdk', '@northwind/core-utils'] },
  ];

  const libraries = [...externalLibs, ...internalLibs].map((l) => ({
    id: idOf(l.name),
    name: l.name,
    ecosystem: l.ecosystem,
    version: l.version,
  }));

  const libDeps = [];
  for (const l of internalLibs) {
    for (const d of l.deps) {
      libDeps.push({ from: idOf(l.name), to: idOf(d) });
    }
  }

  const projectDefs = [
    { id: 'proj-checkout-web', name: 'Checkout Web', team: 'team-web', language: 'TypeScript', libs: ['react', '@northwind/ui-kit', '@northwind/auth-sdk', 'axios'] },
    { id: 'proj-catalog-web', name: 'Catalog Web', team: 'team-web', language: 'TypeScript', libs: ['react', '@northwind/ui-kit', 'axios'] },
    { id: 'proj-account-web', name: 'Account Web', team: 'team-web', language: 'TypeScript', libs: ['react', '@northwind/ui-kit', '@northwind/auth-sdk'] },
    { id: 'proj-marketing-site', name: 'Marketing Site', team: 'team-web', language: 'TypeScript', libs: ['react', '@northwind/ui-kit'] },
    { id: 'proj-ios-app', name: 'iOS App', team: 'team-mobile', language: 'Swift', libs: ['@northwind/auth-sdk', '@northwind/core-utils'] },
    { id: 'proj-android-app', name: 'Android App', team: 'team-mobile', language: 'Kotlin', libs: ['@northwind/auth-sdk', '@northwind/core-utils'] },
    { id: 'proj-mobile-bff', name: 'Mobile BFF', team: 'team-mobile', language: 'TypeScript', libs: ['express', '@northwind/auth-sdk', '@northwind/config-loader'] },
    { id: 'proj-billing-worker', name: 'Billing Worker', team: 'team-payments', language: 'Java', libs: ['com.northwind.payments', 'log4j'] },
    { id: 'proj-ledger', name: 'Ledger Service', team: 'team-payments', language: 'Java', libs: ['com.northwind.payments', 'commons-lang3'] },
    { id: 'proj-identity-admin', name: 'Identity Admin', team: 'team-identity', language: 'TypeScript', libs: ['@northwind/ui-kit', 'com.northwind.identity'] },
    { id: 'proj-sso-gateway', name: 'SSO Gateway', team: 'team-identity', language: 'Go', libs: ['com.northwind.identity', '@northwind/event-bus', 'gin'] },
    { id: 'proj-etl-pipeline', name: 'ETL Pipeline', team: 'team-data', language: 'Python', libs: ['@northwind/data-client', 'pandas', 'numpy'] },
    { id: 'proj-analytics-api', name: 'Analytics API', team: 'team-data', language: 'Python', libs: ['@northwind/data-client', 'flask', 'pydantic'] },
    { id: 'proj-feature-store', name: 'Feature Store', team: 'team-data', language: 'Python', libs: ['@northwind/ml-features', '@northwind/data-client'] },
    { id: 'proj-data-portal', name: 'Data Portal', team: 'team-data', language: 'TypeScript', libs: ['react', '@northwind/ui-kit', '@northwind/data-client'] },
    { id: 'proj-core-services', name: 'Core Services', team: 'team-platform', language: 'Go', libs: ['@northwind/event-bus', 'com.northwind.logging', 'gin'] },
    { id: 'proj-config-service', name: 'Config Service', team: 'team-platform', language: 'TypeScript', libs: ['@northwind/config-loader', 'express'] },
    { id: 'proj-deploy-tool', name: 'Deploy Tool', team: 'team-platform', language: 'TypeScript', libs: ['@northwind/core-utils', 'axios'] },
    { id: 'proj-observability', name: 'Observability', team: 'team-platform', language: 'Go', libs: ['com.northwind.logging', 'zap'] },
    { id: 'proj-campaign-tool', name: 'Campaign Tool', team: 'team-growth', language: 'TypeScript', libs: ['@northwind/ui-kit', 'axios'] },
    { id: 'proj-referral-service', name: 'Referral Service', team: 'team-growth', language: 'Python', libs: ['@northwind/data-client', 'flask'] },
    { id: 'proj-seo-crawler', name: 'SEO Crawler', team: 'team-growth', language: 'Python', libs: ['requests', '@northwind/config-loader'] },
    { id: 'proj-helpdesk', name: 'Helpdesk', team: 'team-support', language: 'TypeScript', libs: ['react', '@northwind/ui-kit'] },
    { id: 'proj-knowledge-base', name: 'Knowledge Base', team: 'team-support', language: 'TypeScript', libs: ['react', '@northwind/ui-kit'] },
    { id: 'proj-chat-bot', name: 'Support Chat Bot', team: 'team-support', language: 'Python', libs: ['@northwind/ml-features', 'flask'] },
  ];

  const serviceDefs = [
    { id: 'svc-checkout-api', name: 'Checkout API', team: 'team-payments', env: 'production', calls: ['svc-payments', 'svc-inventory', 'svc-auth'] },
    { id: 'svc-payments', name: 'Payments Core', team: 'team-payments', env: 'production', calls: ['svc-ledger', 'svc-auth'] },
    { id: 'svc-inventory', name: 'Inventory', team: 'team-platform', env: 'production', calls: ['svc-search', 'svc-notifications'] },
    { id: 'svc-catalog', name: 'Catalog', team: 'team-platform', env: 'production', calls: ['svc-search', 'svc-recommendations'] },
    { id: 'svc-identity', name: 'Identity', team: 'team-identity', env: 'production', calls: ['svc-auth'] },
    { id: 'svc-auth', name: 'Auth', team: 'team-identity', env: 'production', calls: [] },
    { id: 'svc-analytics', name: 'Analytics', team: 'team-data', env: 'production', calls: ['svc-recommendations'] },
    { id: 'svc-recommendations', name: 'Recommendations', team: 'team-data', env: 'production', calls: ['svc-catalog', 'svc-search'] },
    { id: 'svc-notifications', name: 'Notifications', team: 'team-platform', env: 'production', calls: [] },
    { id: 'svc-search', name: 'Search', team: 'team-platform', env: 'production', calls: [] },
    { id: 'svc-mobile-bff', name: 'Mobile BFF', team: 'team-mobile', env: 'production', calls: ['svc-auth', 'svc-catalog', 'svc-recommendations'] },
    { id: 'svc-web-bff', name: 'Web BFF', team: 'team-web', env: 'production', calls: ['svc-auth', 'svc-catalog', 'svc-checkout-api'] },
  ];

  const projects = projectDefs.map((p) => ({
    id: p.id,
    name: p.name,
    language: p.language,
    repoUrl: `https://github.com/northwind/${p.id.replace('proj-', '')}`,
    version: `1.${Math.floor(rand() * 10)}.${Math.floor(rand() * 20)}`,
  }));

  const services = serviceDefs.map((s) => ({
    id: s.id,
    name: s.name,
    environment: s.env,
    version: `2.${Math.floor(rand() * 10)}.${Math.floor(rand() * 20)}`,
  }));

  const projLib = [];
  for (const p of projectDefs) {
    const libs = [...p.libs, ...pickN(libraries.map((l) => l.id), 1)];
    for (const lib of libs) {
      projLib.push({ from: p.id, to: idOf(lib) });
    }
  }

  const svcCalls = [];
  for (const s of serviceDefs) {
    for (const target of s.calls) {
      svcCalls.push({ from: s.id, to: target });
    }
  }

  const projConsumes = [];
  for (const p of projectDefs) {
    const consumes = pickN(serviceDefs.map((s) => s.id), 1 + Math.floor(rand() * 3));
    for (const svc of consumes) {
      projConsumes.push({ from: p.id, to: svc });
    }
  }

  const ownership = [];
  for (const p of projectDefs) {
    ownership.push({ from: p.id, to: p.team });
  }
  for (const s of serviceDefs) {
    ownership.push({ from: s.id, to: s.team });
  }

  return {
    teams,
    libraries,
    projects,
    services,
    libDeps,
    projLib,
    svcCalls,
    projConsumes,
    ownership,
  };
}
