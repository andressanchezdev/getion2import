import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'MAQUETA-V3.html');
const PORT = process.env.PORT || 4567;

const server = http.createServer((req, res) => {
  // Support both root and specific path
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const reqPath = parsedUrl.pathname;

  let target = filePath;
  if (reqPath !== '/' && reqPath !== '/MAQUETA-V3.html') {
    const candidate = path.join(__dirname, reqPath);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      target = candidate;
    }
  }

  if (!fs.existsSync(target)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(target).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(target).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER_RUNNING] Local: http://localhost:${PORT}`);
});
