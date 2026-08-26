import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { driver, checkConnectivity } from './db.js';
import * as q from './queries.js';

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

export { app, driver };
