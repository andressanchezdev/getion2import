import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_FILE = path.join(__dirname, 'MAQUETA-V3.html');
const CLOUDFLARED_BIN = path.join(__dirname, 'cloudflared.exe');

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  let reqPath = decodeURIComponent(parsed.pathname);

  let target = HTML_FILE;
  if (reqPath !== '/' && reqPath !== '/MAQUETA-V3.html') {
    const candidate = path.join(__dirname, reqPath);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      target = candidate;
    }
  }

  if (!fs.existsSync(target)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 No encontrado');
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

  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
});

function startServer(port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  SERVIDOR LOCAL ACTIVO:`);
    console.log(`  http://localhost:${port}`);
    console.log(`  Archivo: MAQUETA-V3.html`);
    console.log(`======================================================\n`);
    console.log(`Iniciando Cloudflare Tunnel... Espere un momento...\n`);

    if (!fs.existsSync(CLOUDFLARED_BIN)) {
      console.error(`Error: No se encontró cloudflared.exe en ${CLOUDFLARED_BIN}`);
      return;
    }

    const cf = spawn(CLOUDFLARED_BIN, ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate']);

    let tunnelFound = false;

    const handleOutput = (chunk) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !tunnelFound) {
        tunnelFound = true;
        const url = match[0];
        console.log(`\n======================================================`);
        console.log(`🚀 TÚNEL CLOUDFLARE LISTO:`);
        console.log(`👉 ${url}`);
        console.log(`======================================================`);
        console.log(`Puedes compartir este enlace o abrirlo en cualquier dispositivo.\n`);
      }
    };

    cf.stdout.on('data', handleOutput);
    cf.stderr.on('data', handleOutput);

    cf.on('close', (code) => {
      console.log(`Cloudflared finalizó con código ${code}`);
    });

    process.on('SIGINT', () => {
      cf.kill();
      server.close();
      process.exit(0);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Puerto ${port} en uso, probando puerto ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Error del servidor:', err);
    }
  });
}

const initialPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3456;
startServer(initialPort);
