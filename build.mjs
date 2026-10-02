// Статический генератор: данные из PocketBase (если задан POCKETBASE_URL) или из data/content.json.
// Запуск: node build.mjs  ->  папка dist/
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/content.json', 'utf8'));
const OUT = process.env.OUT_DIR || 'dist';
const PB = process.env.POCKETBASE_URL?.replace(/\/$/, '');
const texts = Object.fromEntries(data.texts.map((x) => [x.key, x.value]));

if (PB) {
  const get = async (c, filter = '') => {
    const r = await fetch(`${PB}/api/collections/${c}/records?perPage=500${filter ? '&sort=sort,created' : ''}${filter}`);
    if (!r.ok) throw new Error(`${c}: ${r.status}`);
    return (await r.json()).items;
  };
  const pub = '&filter=' + encodeURIComponent("status='published'");
  try {
    const [services, cases, pains, guarantees, steps, faq, tx] = await Promise.all(['services', 'cases', 'pains', 'guarantees', 'steps', 'faq'].map((c) => get(c, pub)).concat(get('texts')));
    data.services = services; data.cases = cases;
    data.pains = pains.map((x) => ({ t: x.title, d: x.text }));
    data.guarantees = guarantees.map((x) => ({ t: x.title, d: x.text }));
    data.steps = steps.map((x) => ({ t: x.title, d: x.text }));
    data.faq = faq.map((x) => ({ q: x.question, a: x.answer }));
    for (const x of tx) if (x.value?.trim()) texts[x.key] = x.value;
  } catch (e) {
    console.warn('PocketBase недоступен, использую data/content.json:', e.message);
  }
}

// Текст блока: из админки, иначе значение по умолчанию из data/content.json
const T = (k) => texts[k] ?? '';
const s = { ...data.site, ...Object.fromEntries(Object.entries(texts).filter(([k]) => k.startsWith('site.')).map(([k, v]) => [k.slice(5), v])) };
const esc = (t = '') => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tg = `https://t.me/${s.telegram}`;
const ICON = {
  tg: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M21.9 4.1 2.8 11.5c-.9.4-.9 1.1-.2 1.3l4.9 1.5 1.9 5.8c.2.6.4.8.8.8s.6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.2-15.1c.3-1.2-.5-1.8-1.2-1.7ZM8.6 13.7l9.4-5.9c.4-.3.8-.1.5.2l-7.8 7-.3 3.2-1.8-4.5Z"/></svg>',
  max: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2.4-.3 3.4-.8l3.1.8-.8-3A9 9 0 0 0 12 3Z"/><path d="M8.5 14.5v-5l3.5 3.5 3.5-3.5v5"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
};
const todo = (t) => esc(t).replace(/\[НУЖНО[^\]]*\]/g, (m) => `<mark class="todo">${m}</mark>`);
const t = (k) => todo(T(k));

const layout = ({ title, desc, body, path = '/', noindex = false, schema = '' }) => `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="canonical" href="${s.url}${path}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:locale" content="ru_RU">
<link rel="stylesheet" href="/styles.css">
${schema}
</head>
<body>
<header class="top"><div class="wrap bar">
  <a class="logo" href="/">EGOR KOSHKIN</a>
  <nav aria-label="Основное"><a href="/#services">Услуги</a><a href="/#process">Процесс</a><a href="/#faq">Вопросы</a><a href="/cases/">Кейсы</a></nav>
  <a class="btn btn-sm" href="${tg}" target="_blank" rel="noopener">Telegram</a>
</div></header>
<main>${body}</main>
<footer class="foot"><div class="wrap foot-grid">
  <div><strong>EGOR KOSHKIN</strong><br>${esc(s.tagline)}<br><span class="muted">${todo(s.legal)}</span></div>
  <div class="contacts"><a href="${tg}" target="_blank" rel="noopener">${ICON.tg}<span>@${s.telegram}</span></a><a href="${s.max}" target="_blank" rel="noopener">${ICON.max}<span>Max</span></a><a href="mailto:${s.email}">${ICON.mail}<span>${s.email}</span></a></div>
  <div><a href="/privacy/">Политика конфиденциальности</a><br><a href="/consent/">Согласие на обработку данных</a></div>
</div></footer>
<div class="dock"><a class="btn" href="${tg}" target="_blank" rel="noopener">Написать в Telegram</a><a class="btn btn-ghost" href="${s.max}" target="_blank" rel="noopener">Max</a></div>
<div class="cookie" id="cookie" hidden>Сайт использует cookie и Яндекс Метрику для статистики. <button class="btn btn-sm" id="cookie-ok">Понятно</button></div>
<script>window.METRIKA_ID=${JSON.stringify(s.metrikaId)};window.PB_URL=${JSON.stringify(process.env.PUBLIC_PB_URL || '')};</script>
<script src="/main.js" defer></script>
</body></html>`;

const groups = [...new Set(data.services.map((x) => x.group))];
const home = `
<section class="hero"><div class="wrap">
  <p class="badge">${t('hero.badge')}</p>
  <div class="giant" aria-hidden="true">EGOR<br>KOSHKIN</div>
  <h1>${t('hero.title')}</h1>
  <div class="cta-row">
    <a class="btn" href="${tg}" target="_blank" rel="noopener" data-goal="telegram">${t('hero.cta1')}</a>
    <a class="btn btn-ghost" href="#form" data-goal="soft">${t('hero.cta2')}</a>
  </div>
  <p class="muted small">${t('hero.note')}</p>
</div></section>

<div class="marquee" aria-hidden="true"><div class="track">${[0, 1].map(() => `<span>${data.services.map((x) => esc(x.title)).join(' <i>✦</i> ')} <i>✦</i> </span>`).join('')}</div></div>

<section class="sec dark" id="pains"><div class="wrap">
  <h2>${t('pains.title')}</h2>
  <div class="grid4">${data.pains.map((p, i) => `<article><span class="num">0${i + 1}</span><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></article>`).join('')}</div>
</div></section>

<section class="sec" id="services"><div class="wrap">
  <p class="eyebrow">${t('services.eyebrow')}</p>
  <h2>${t('services.title')}</h2>
  ${groups.map((g) => `<h3 class="group">${esc(g)}</h3><div class="rows">${data.services.filter((x) => x.group === g).map((x) => `
    <div class="row"><div><strong>${esc(x.title)}</strong><p>${esc(x.desc)}</p></div><div class="term">${todo(x.term || '')}</div><div class="price">${esc(x.price)}</div></div>`).join('')}</div>`).join('')}
  <p class="muted small">${t('services.note')}</p>
  <a class="btn" href="${tg}" target="_blank" rel="noopener" data-goal="telegram">${t('services.cta')}</a>
</div></section>

<section class="sec accent" id="guarantees"><div class="wrap">
  <h2>${t('guarantees.title')}</h2>
  <div class="grid3">${data.guarantees.map((g) => `<article><h3>${esc(g.t)}</h3><p>${todo(g.d)}</p></article>`).join('')}</div>
</div></section>

<section class="sec" id="process"><div class="wrap">
  <p class="eyebrow">${t('process.eyebrow')}</p>
  <h2>${t('process.title')}</h2>
  <ol class="steps">${data.steps.map((x, i) => `<li><span class="num">0${i + 1}</span><div><h3>${esc(x.t)}</h3><p>${esc(x.d)}</p></div></li>`).join('')}</ol>
</div></section>

<section class="sec dark" id="cases"><div class="wrap">
  <h2>${t('cases.title')}</h2>
  ${data.cases.length ? `<div class="grid3">${data.cases.map((c) => `<article><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join('')}</div>`
    : `<p class="lead">${t('cases.empty')}</p>`}
  <a class="btn btn-ghost-light" href="/cases/">${t('cases.button')}</a>
</div></section>

<section class="sec" id="faq"><div class="wrap narrow">
  <h2>${t('faq.title')}</h2>
  ${data.faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="ans"><p>${todo(f.a)}</p></div></details>`).join('')}
</div></section>

<section class="sec dark" id="form"><div class="wrap narrow">
  <h2>${t('form.title')}</h2>
  <p class="lead">${t('form.lead')} Или сразу напишите в <a href="${tg}">Telegram</a>.</p>
  <form id="lead" novalidate>
    <label>Имя<input name="name" autocomplete="name" required></label>
    <label>Telegram или телефон<input name="contact" autocomplete="tel" inputmode="text" required placeholder="@username или +7…"></label>
    <label>Задача (необязательно)<textarea name="task" rows="3"></textarea></label>
    <input name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
    <label class="check"><input type="checkbox" name="consent" required> Даю <a href="/consent/" target="_blank">согласие на обработку персональных данных</a> и принимаю <a href="/privacy/" target="_blank">политику конфиденциальности</a></label>
    <p class="err" id="err" role="alert"></p>
    <button class="btn" type="submit" data-label="${esc(T('form.button'))}">${t('form.button')}</button>
  </form>
</div></section>`;

const schema = `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'ProfessionalService', name: 'EGOR KOSHKIN', description: 'Разработка сайтов, Telegram-ботов и ИИ-помощников для малого бизнеса',
  url: s.url, email: s.email, areaServed: 'RU', founder: { '@type': 'Person', name: 'Егор Кошкин' },
})}</script>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: data.faq.filter((f) => !f.a.includes('НУЖНО')).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
})}</script>`;

const legal = (h, text) => `<section class="sec"><div class="wrap narrow"><h1 class="h2">${h}</h1><p class="todo-box">Черновик. Требует проверки юристом.</p>${text}</div></section>`;

const pages = {
  'index.html': layout({ title: T('seo.title'), desc: T('seo.desc'), body: home, schema }),
  'cases/index.html': layout({ title: 'Кейсы и отзывы | EGOR KOSHKIN', desc: 'Кейсы и отзывы клиентов.', path: '/cases/', body: `<section class="sec"><div class="wrap"><h1 class="h2">Кейсы и отзывы</h1>${data.cases.length ? data.cases.map((c) => `<article class="case"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join('') : `<p class="lead">${todo('[НУЖНО: реальные кейсы и отзывы]')} Пока их нет, но можно <a href="${tg}">обсудить вашу задачу</a>.</p>`}</div></section>` }),
  'thanks/index.html': layout({ title: 'Заявка отправлена | EGOR KOSHKIN', desc: 'Спасибо за заявку.', path: '/thanks/', noindex: true, body: `<section class="sec"><div class="wrap narrow"><h1 class="h2">${t('thanks.title')}</h1><p class="lead">${t('thanks.text')}</p><a class="btn" href="${tg}">Написать в Telegram</a></div></section>` }),
  'privacy/index.html': layout({ title: 'Политика конфиденциальности | EGOR KOSHKIN', desc: 'Политика обработки персональных данных.', path: '/privacy/', noindex: true, body: legal('Политика конфиденциальности', `<p>Оператор: ${todo(s.legal)}. Контакт: ${s.email}.</p><p>Собираем: имя, Telegram или телефон, текст задачи. Цель: связаться с вами и обсудить работу. Данные хранятся на серверах в РФ. Срок хранения: ${todo('[НУЖНО]')}. Вы можете отозвать согласие, написав на ${s.email}.</p><p>Сайт использует Яндекс Метрику (cookie) после вашего согласия.</p>`) }),
  'consent/index.html': layout({ title: 'Согласие на обработку данных | EGOR KOSHKIN', desc: 'Согласие на обработку персональных данных.', path: '/consent/', noindex: true, body: legal('Согласие на обработку персональных данных', `<p>Я, отправляя форму, свободно, своей волей и в своём интересе даю согласие оператору (${todo(s.legal)}) на обработку имени, контакта в Telegram или телефона и текста задачи в целях связи со мной и обсуждения заказа. Согласие действует ${todo('[НУЖНО: срок]')} и может быть отозвано письмом на ${s.email}.</p>`) }),
};

rmSync(OUT, { recursive: true, force: true });
for (const [p, html] of Object.entries(pages)) {
  const f = `${OUT}/${p}`;
  mkdirSync(f.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(f, html);
}
cpSync('src', OUT, { recursive: true });
writeFileSync(OUT + '/robots.txt', `User-agent: *\nAllow: /\nDisallow: /thanks/\nSitemap: ${s.url}/sitemap.xml\n`);
writeFileSync(OUT + '/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/cases/', '/privacy/', '/consent/'].map((u) => `<url><loc>${s.url}${u}</loc></url>`).join('')}</urlset>`);
console.log(`Готово: ${OUT}/`);
