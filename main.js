const ok = () => { try { return localStorage.getItem('cookie-ok') === '1'; } catch { return false; } };

function loadMetrika() {
  const id = window.METRIKA_ID;
  if (!id) return;
  (function (m, e, t, r, i, k, a) { m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); }; m[i].l = 1 * new Date(); k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a); })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
  ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
}
const goal = (n) => { if (window.ym && window.METRIKA_ID) ym(window.METRIKA_ID, 'reachGoal', n); };

const banner = document.getElementById('cookie');
if (banner) {
  if (ok()) loadMetrika(); else banner.hidden = false;
  document.getElementById('cookie-ok').onclick = () => { try { localStorage.setItem('cookie-ok', '1'); } catch {} banner.hidden = true; loadMetrika(); };
}

document.querySelectorAll('[data-goal]').forEach((a) => a.addEventListener('click', () => goal(a.dataset.goal)));

const form = document.getElementById('lead');
if (form) form.addEventListener('submit', (e) => {
  e.preventDefault(); // заглушка: данные никуда не уходят
  document.getElementById('err').textContent = 'Форма пока не работает. Напишите в Telegram или на почту: кнопки выше.';
});

/* динамика: появление и свечение под курсором */
document.documentElement.classList.add('js');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.dark .grid4 article,.accent .grid3 article').forEach((el) => el.classList.add('glow'));
const revealSel = '#process h2,#process .eyebrow,#process .steps li';
document.querySelectorAll(revealSel).forEach((el, i) => {
  el.setAttribute('data-reveal', '');
  el.style.setProperty('--d', (Math.min(i % 4, 3) * 0.08) + 's');
});
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
document.querySelectorAll('[data-reveal]').forEach((el) => still ? el.classList.add('in') : io.observe(el));
document.addEventListener('pointermove', (e) => {
  const el = e.target.closest?.('.glow');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  el.style.setProperty('--my', (e.clientY - r.top) + 'px');
});

/* плавное раскрытие FAQ */
document.querySelectorAll('details').forEach((d) => {
  const sum = d.querySelector('summary'), ans = d.querySelector('.ans');
  let anim;
  sum.addEventListener('click', (e) => {
    if (still) return;
    e.preventDefault();
    anim?.cancel();
    const opening = !d.open;
    if (opening) d.open = true;
    const h = ans.scrollHeight;
    const frames = opening ? [{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }] : [{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }];
    anim = ans.animate(frames, { duration: 350, easing: 'cubic-bezier(.2,.7,.2,1)', fill: opening ? 'none' : 'forwards' });
    const a = anim;
    setTimeout(() => { if (anim !== a) return; if (!opening) { d.open = false; a.cancel(); } anim = null; }, 360);
  });
});

/* бегущая строка стоит, пока её не видно */
const mq = document.querySelector('.marquee');
if (mq && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => mq.classList.toggle('off', !e.isIntersecting)).observe(mq);
}

/* свет пробегает по кнопке формы, когда её долистали */
const formBtn = document.querySelector('#form button[type=submit]');
if (formBtn && !still && 'IntersectionObserver' in window) {
  const sio = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    formBtn.classList.add('sweep');
    sio.disconnect();
  }, { threshold: 1 });
  sio.observe(formBtn);
}

/* свет пробегает по плашке оффера при загрузке */
const badge = document.querySelector('.badge');
if (badge && !still) setTimeout(() => badge.classList.add('sweep'), 600);

/* клик по услуге ведёт к форме контактов */
document.querySelectorAll('#services .row').forEach((row) => {
  row.setAttribute('role', 'link');
  row.tabIndex = 0;
  const go = () => document.getElementById('form')?.scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
  row.addEventListener('click', go);
  row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});
