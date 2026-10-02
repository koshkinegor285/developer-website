// Сборщик сайта: хук PocketBase шлёт POST /rebuild -> через 5 с запускается build.mjs -> результат в /out.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';

const TOKEN = process.env.REBUILD_TOKEN;
if (!TOKEN) throw new Error('REBUILD_TOKEN не задан');
const DELAY = 5000;
let timer = null, running = false, again = false;

function build() {
  if (running) { again = true; return; }
  running = true;
  console.log(new Date().toISOString(), 'сборка...');
  execFile('node', ['build.mjs'], { cwd: '/site', env: { ...process.env, OUT_DIR: '/tmp/dist' } }, (err, out, errOut) => {
    if (err) console.error('ошибка сборки:', errOut || err.message);
    else { mkdirSync('/out', { recursive: true }); cpSync('/tmp/dist', '/out', { recursive: true }); console.log(out.trim()); }
    running = false;
    if (again) { again = false; build(); }
  });
}
const schedule = () => { clearTimeout(timer); timer = setTimeout(build, DELAY); };

createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/rebuild' && req.headers['x-rebuild-token'] === TOKEN) { schedule(); res.writeHead(202).end('queued'); }
  else res.writeHead(req.url === '/health' ? 200 : 403).end();
}).listen(3000, () => { console.log('сборщик слушает :3000'); build(); });
