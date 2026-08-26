import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { app, driver } from './app.js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In local/production (single Node process) we also serve the built frontend.
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
process.on('SIGTERM', shutdown);
