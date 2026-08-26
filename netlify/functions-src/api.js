import serverless from 'serverless-http';
import { app } from '../../backend/src/app.js';

// Netlify serves this function at /.netlify/functions/api and we redirect
// /api/* there. serverless-http builds request.url from the function path
// (e.g. "/health"), so we restore the /api prefix our Express routes expect
// and strip the function mount if it ever appears in the path.
export const handler = serverless(app, {
  request: (request) => {
    let url = request.url || '/';
    const mount = '/.netlify/functions/api';
    const idx = url.indexOf(mount);
    if (idx !== -1) url = url.slice(idx + mount.length);
    if (!url.startsWith('/')) url = '/' + url;
    if (!url.startsWith('/api')) url = '/api' + url;
    request.url = url;
  }
});
