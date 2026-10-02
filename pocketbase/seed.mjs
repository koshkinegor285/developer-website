// Загрузка стартового содержимого (услуги, блоки, тексты) из data/content.json.
// Запускается контейнером seed. Повторный запуск безопасен: заполненное не трогает.
import { readFileSync } from 'node:fs';

const PB = process.env.POCKETBASE_URL.replace(/\/$/, '');
const seed = JSON.parse(readFileSync('/data/content.json', 'utf8'));

let token;
const api = async (method, path, body) => {
  const r = await fetch(PB + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: token }) }, body: body && JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j)}`);
  return j;
};

for (let i = 0; ; i++) {
  try { if ((await fetch(PB + '/api/health')).ok) break; } catch {}
  if (i >= 60) throw new Error('PocketBase не отвечает на ' + PB);
  await new Promise((r) => setTimeout(r, 2000));
}
token = (await api('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).token;

const fill = async (collection, rows) => {
  if ((await api('GET', `/api/collections/${collection}/records?perPage=1`)).totalItems) { console.log('уже заполнено:', collection); return; }
  for (const row of rows) await api('POST', `/api/collections/${collection}/records`, row);
  console.log('загружено:', collection, rows.length);
};
const listed = (rows, map) => rows.map((x, i) => ({ ...map(x), status: 'published', sort: i + 1 }));

await fill('services', listed(seed.services, (x) => ({ title: x.title, group: x.group, price: x.price, desc: x.desc, term: /НУЖНО/.test(x.term || '') ? '' : x.term || '' })));
await fill('pains', listed(seed.pains, (x) => ({ title: x.t, text: x.d })));
await fill('guarantees', listed(seed.guarantees, (x) => ({ title: x.t, text: x.d })));
await fill('steps', listed(seed.steps, (x) => ({ title: x.t, text: x.d })));
await fill('faq', listed(seed.faq, (x) => ({ question: x.q, answer: x.a })));
await fill('texts', seed.texts.map((x) => ({ key: x.key, label: x.label, value: x.value })));
console.log('Готово');
