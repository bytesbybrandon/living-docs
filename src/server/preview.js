import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

function listDocs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
      .map(entry => {
        const stat = fs.statSync(path.join(dir, entry.name));
        return { name: entry.name, size: stat.size, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

function indexPage(dir) {
  const docs = listDocs(dir);
  const rows = docs.length
    ? docs.map(doc => `<li><a href="/${encodeURIComponent(doc.name)}">${doc.name}</a><span>${(doc.size / 1024).toFixed(1)} KB</span></li>`).join('')
    : '<li class="empty">No documents yet. Render a model first.</li>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>living-docs</title>
<style>
:root{color-scheme:dark}
body{margin:0;background:#05080d;color:#cfe3ee;font:14px/1.6 ui-monospace,Menlo,Consolas,monospace}
main{max-width:760px;margin:60px auto;padding:0 22px}
h1{font-size:18px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;color:#dff3fc;border-bottom:1px solid #12242e;padding-bottom:12px}
p{color:#6f8f9f;font-size:12px}
ul{list-style:none;padding:0;margin:22px 0}
li{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid #0e1f2a}
li.empty{color:#4f6d7c}
a{color:#5ec8e5;text-decoration:none}
a:hover{text-decoration:underline}
span{color:#4f6d7c;font-size:11px}
</style></head><body><main>
<h1>living-docs</h1>
<p>${docs.length} document${docs.length === 1 ? '' : 's'} in ${path.basename(dir) || dir}</p>
<ul>${rows}</ul>
</main></body></html>`;
}

export function createPreviewServer({ dir = 'docs', port = 4600, host = '127.0.0.1' } = {}) {
  const root = path.resolve(dir);
  const server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end('bad request');
      return;
    }
    if (pathname === '/' || pathname === '') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(indexPage(root));
      return;
    }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end('forbidden');
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
        return;
      }
      response.writeHead(200, {
        'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store'
      });
      response.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        server,
        url: `http://${host}:${address.port}/`,
        dir: root,
        docs: listDocs(root).length
      });
    });
  });
}

export { listDocs, indexPage };
