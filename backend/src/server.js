import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { config } from './config.js';
import { driver, checkConnectivity } from './db.js';
import * as q from './queries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

const DB_ERROR = /service unavailable|connection|ECONN|neo4j|timed out|unable to connect/i;

function wrap(handler) {
  return async (req, res) => {
    try {
      const data = await handler(req, res);
      if (data !== undefined) res.json(data);
    } catch (err) {
      console.error(err);
      const unreachable = DB_ERROR.test(err.message || '');
      res.status(unreachable ? 503 : 500).json({
        error: unreachable
          ? 'The database is unreachable. Please try again shortly.'
          : 'An unexpected error occurred.',
        detail: err.message,
      });
    }
  };
}

app.get('/api/health', wrap(async () => ({ status: 'ok', dbReachable: await checkConnectivity() })));
app.get('/api/stats', wrap(() => q.getStats()));
app.get('/api/highlights', wrap(() => q.getHighlights()));
app.get('/api/search', wrap(async (req) => q.searchNodes((req.query.q || '').toString())));
app.get('/api/node/:id', wrap(async (req) => q.getNode(req.params.id)));
app.get('/api/graph/:id', wrap(async (req) => q.getSubgraph(req.params.id, req.query.dir === 'in' ? 'in' : 'out')));
app.get('/api/impact/:id', wrap(async (req) => q.getImpact(req.params.id)));

// Serve the built frontend (production). In development the Vite dev server proxies /api.
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(dist, 'index.html'));
  });
}

const server = app.listen(config.port, () => {
  console.log(`Dependency & Impact Analyzer API listening on :${config.port}`);
});

function shutdown() {
  console.log('Shutting down, closing database driver...');
  driver.close().finally(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
