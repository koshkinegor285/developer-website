/* Баннер о cookie и загрузка Яндекс Метрики только после согласия. Подключается на всех страницах. */
(function () {
  var ID = 113673184;
  var KEY = 'cookie-consent';
  var me = document.currentScript || document.querySelector('script[src$="cookie.js"]');
  var base = me ? new URL('.', me.src).href : location.origin + '/';
  var policy = base + 'privacy/';

  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadMetrika() {
    if (window.__metrikaLoaded) return;
    window.__metrikaLoaded = true;
    window.METRIKA_ID = ID;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + ID, 'ym');
    window.ym(ID, 'init', { ssr: true, webvisor: true, clickmap: true, ecommerce: 'dataLayer', referrer: document.referrer, url: location.href, accurateTrackBounce: true, trackLinks: true });
  }

  var css = '.ckb{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:760px;margin:0 auto;padding:16px 18px;background:#0b0b0b;color:#fff;border:1px solid #333;box-shadow:0 8px 32px rgba(0,0,0,.35);font:14px/1.45 "Helvetica Neue",Helvetica,Arial,sans-serif;display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px}'
    + '.ckb[hidden]{display:none}'
    + '.ckb p{margin:0;flex:1 1 320px}'
    + '.ckb a{color:#fff;text-decoration:underline}'
    + '.ckb-btns{display:flex;gap:10px;flex:0 0 auto}'
    + '.ckb button{min-height:42px;padding:0 20px;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;border:2px solid #ff5a1f;background:transparent;color:#fff}'
    + '.ckb button.ckb-yes{background:#ff5a1f}'
    + '.ckb button:hover,.ckb button:focus-visible{background:#fff;border-color:#fff;color:#0b0b0b}'
    + '@media(max-width:520px){.ckb-btns{width:100%}.ckb button{flex:1}}';

  var banner;
  function build() {
    if (banner) return banner;
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    banner = document.createElement('div');
    banner.className = 'ckb';
    banner.hidden = true;
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Использование cookie');
    banner.innerHTML = '<p>Сайт использует cookie и сервис Яндекс Метрика (в том числе Вебвизор) для статистики и улучшения работы. '
      + 'Подробнее в <a href="' + policy + '" target="_blank" rel="noopener">политике конфиденциальности</a>.</p>'
      + '<div class="ckb-btns"><button type="button" class="ckb-yes">Принять</button><button type="button" class="ckb-no">Отказаться</button></div>';
    banner.querySelector('.ckb-yes').addEventListener('click', function () { set('yes'); banner.hidden = true; loadMetrika(); });
    banner.querySelector('.ckb-no').addEventListener('click', function () { set('no'); banner.hidden = true; });
    document.body.appendChild(banner);
    return banner;
  }

  function init() {
    if (get() === 'yes') loadMetrika();
    else if (get() !== 'no') build().hidden = false;
    // кнопка «Изменить выбор» на странице политики
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-cookie-settings]');
      if (t) { e.preventDefault(); build().hidden = false; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
