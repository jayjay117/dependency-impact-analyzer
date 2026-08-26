import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve __dirname in both ESM and CJS contexts. When bundled to CJS (e.g. for a
// Netlify Function) `import.meta.url` is unavailable, so fall back to the cwd; in
// that environment credentials come from injected environment variables anyway.
function resolveDir() {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
}

const __dirname = resolveDir();

// Load backend/.env explicitly so the app works regardless of the working directory
// (local `node backend/src/server.js` or a host that injects env vars directly).
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  uri: process.env.COGNODB_URI,
  user: process.env.COGNODB_USER || 'cognodb',
  password: process.env.COGNODB_PASSWORD,
  port: Number(process.env.PORT) || 4000,
};

if (!config.uri || !config.password) {
  console.warn(
    '[config] COGNODB_URI / COGNODB_PASSWORD are not set. The app will start but database calls will fail until they are provided via environment variables.'
  );
}
