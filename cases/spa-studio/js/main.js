(function () {
  'use strict';

  /* НУЖНО: адрес приёма заявок (российский сервис: свой сервер, Telegram-бот, CRM).
     Пока пусто — форма работает в демо-режиме и заявки НЕ отправляются. */
  var FORM_ENDPOINT = '';

  function goal() {}

  /* Меню на телефоне */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Цели по кликам и предвыбор услуги в форме */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-goal]');
    if (!a) return;
    goal(a.getAttribute('data-goal'));
    var service = a.getAttribute('data-service');
    if (service) {
      document.querySelectorAll('select[name="service"]').forEach(function (s) { s.value = service; });
    }
  });

  /* Формы */
  function setErr(field, msg) {
    if (!field) return;
    field.classList.toggle('err', !!msg);
    var m = field.querySelector('.err-msg');
    if (m) m.textContent = msg || '';
    var input = field.querySelector('input,select,textarea');
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function digits(v) { return v.replace(/\D/g, ''); }

  function validate(form) {
    var ok = true;
    var name = form.elements.name;
    var phone = form.elements.phone;
    var consent = form.elements.consent;
    var consentErr = form.querySelector('[data-consent-err]');
    var first = null;

    if (name.value.trim().length < 2) { setErr(name.closest('.field'), 'Введите имя, чтобы мы знали, как к вам обращаться'); ok = false; first = first || name; }
    else setErr(name.closest('.field'), '');

    var d = digits(phone.value);
    if (d.length === 10) d = '7' + d;
    if (!(d.length === 11 && (d[0] === '7' || d[0] === '8'))) {
      var msg = d.length < 11 ? 'Похоже, в номере не хватает цифр. Нужно 11, например +7 900 123-45-67' : 'Проверьте номер: в нём лишние цифры';
      setErr(phone.closest('.field'), msg); ok = false; first = first || phone;
    } else setErr(phone.closest('.field'), '');

    if (!consent.checked) {
      if (consentErr) consentErr.textContent = 'Чтобы отправить заявку, отметьте согласие на обработку данных';
      consentErr && (consentErr.style.display = 'block');
      ok = false; first = first || consent;
    } else if (consentErr) { consentErr.textContent = ''; consentErr.style.display = 'none'; }

    if (first) first.focus();
    return ok;
  }

  document.querySelectorAll('[data-form]').forEach(function (form) {
    var btn = form.querySelector('button[type="submit"]');
    var status = form.querySelector('.form-status');
    var wrap = form.closest('[data-form-wrap]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) status.textContent = '';
      if (form.elements.website && form.elements.website.value) return; /* антиспам-ловушка */
      if (!validate(form)) return;

      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Отправляем…';

      var payload = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        service: form.elements.service ? form.elements.service.value : '',
        comment: form.elements.comment ? form.elements.comment.value.trim() : '',
        consent: true,
        page: location.href
      };

      function done() {
        goal('lead_form');
        wrap.classList.add('sent');
        var ok = wrap.querySelector('.form-ok');
        if (ok) { ok.setAttribute('tabindex', '-1'); ok.focus(); }
      }
      function fail() {
        btn.disabled = false; btn.textContent = label;
        if (status) status.textContent = 'Не получилось отправить заявку. Данные сохранены в форме — попробуйте ещё раз или позвоните нам.';
      }

      if (!FORM_ENDPOINT) {
        console.warn('Демо-режим: FORM_ENDPOINT не задан, заявка не отправлена.', payload);
        setTimeout(done, 500);
        return;
      }
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
        .catch(fail);
    });

    /* Убираем ошибку, как только человек начал исправлять */
    form.addEventListener('input', function (e) {
      var f = e.target.closest('.field');
      if (f && f.classList.contains('err')) setErr(f, '');
    });
  });

  /* Шапка: в самом верху страницы плоская, при прокрутке становится стеклянной */
  var header = document.querySelector('.header');
  if (header) {
    var syncHeader = function () { header.classList.toggle('is-scrolled', window.scrollY > 4); };
    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  /* Появление при прокрутке только у элементов, идущих в колонку (список в «Проблеме», вопросы) и у шагов «Как проходит ваш визит». Скрываем только то, что ниже экрана, и только если есть JS и анимации разрешены */
  var REVEAL = '.problem li,.faq details,.steps li';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    var seen = new Map();
    Array.prototype.forEach.call(document.querySelectorAll(REVEAL), function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      /* ступенчатая задержка между соседями одной группы */
      var n = seen.get(el.parentNode) || 0;
      seen.set(el.parentNode, n + 1);
      el.style.setProperty('--d', Math.min(n, 5) * 0.08 + 's');
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* Вопросы: ответ плавно раскрывается и сворачивается (высота + проявление текста); открытым остаётся один */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll('.faq details'));
  if (!reduce && 'animate' in Element.prototype) {
    faqItems.forEach(function (d) {
      var sum = d.querySelector('summary');
      var ans = d.querySelector('p');
      var anim = null, ansAnim = null;
      if (!sum || !ans) return;
      d._want = d.open;
      var run = function (opening) {
        d._want = opening;
        if (ansAnim) ansAnim.cancel();
        var from = d.offsetHeight;
        if (anim) { var prev = anim; anim = null; prev.cancel(); }
        d.style.overflow = 'hidden';
        if (opening) d.open = true;
        var to = opening ? d.offsetHeight : sum.offsetHeight;
        var a = anim = d.animate({ height: [from + 'px', to + 'px'] },
          { duration: opening ? 420 : 300, easing: 'cubic-bezier(.22,.8,.3,1)' });
        ansAnim = ans.animate(opening
          ? { opacity: [0, 1], transform: ['translateY(-8px)', 'none'] }
          : { opacity: [1, 0], transform: ['none', 'translateY(-6px)'] },
          { duration: opening ? 380 : 200, delay: opening ? 90 : 0, easing: 'ease', fill: 'backwards' });
        a.onfinish = function () {
          if (a !== anim) return;
          if (!opening) d.open = false;
          d.style.overflow = '';
          anim = ansAnim = null;
        };
      };
      d._run = run;
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        /* повторный клик посреди анимации разворачивает её в обратную сторону */
        var opening = !d._want;
        if (opening) faqItems.forEach(function (o) { if (o !== d && o._want) o._run(false); });
        run(opening);
      });
    });
  } else {
    faqItems.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) faqItems.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  }

  /* Первый скролл: один мягкий «слайд» от первого экрана к следующему блоку, дальше прокрутка обычная.
     Только на десктопе (на телефоне под первым экраном форма заявки), только если страница открыта сверху */
  var sliding = false;

  /* Своя плавная прокрутка (easeInOutCubic): родной smooth у браузера идёт рывком и не настраивается.
     'instant' — чтобы CSS scroll-behavior:smooth не накладывался на каждый кадр */
  var anim = null;
  var animateTo = function (y, dur, done) {
    cancelAnim();
    var from = window.scrollY, delta = y - from, t0 = null;
    if (Math.abs(delta) < 1) { if (done) done(); return; }
    var step = function (now) {
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      var e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo({ top: from + delta * e, behavior: 'instant' });
      if (p < 1) anim.raf = requestAnimationFrame(step);
      else { anim = null; if (done) done(); }
    };
    anim = { raf: requestAnimationFrame(step) };
  };
  var cancelAnim = function () { if (anim) { cancelAnimationFrame(anim.raf); anim = null; } };

  /* Мягкое «притягивание» к началу блока: когда прокрутка остановилась недалеко от верха блока,
     плавно доводим его до нужной позиции. Любое действие человека (колесо, касание, клавиша) прерывает доводку */
  if (!reduce && window.matchMedia && matchMedia('(hover:hover)').matches) {
    var magnetTimer = null, pointerDown = false;
    var magnet = function () {
      if (pointerDown || sliding || anim) return;
      var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 84;
      var maxY = document.documentElement.scrollHeight - window.innerHeight;
      var y = window.scrollY, best = null, reach = Math.min(160, window.innerHeight * .2);
      Array.prototype.forEach.call(document.querySelectorAll('main>section'), function (s) {
        var ty = Math.round(s.getBoundingClientRect().top + y - pad);
        if (ty < 0 || ty > maxY - 40) return;
        var dist = Math.abs(ty - y);
        if (dist > 2 && dist < reach && (best === null || dist < Math.abs(best - y))) best = ty;
      });
      if (best !== null) animateTo(best, Math.min(900, 450 + Math.abs(best - y) * 3));
    };
    window.addEventListener('scroll', function () {
      if (anim || sliding) return;
      clearTimeout(magnetTimer);
      magnetTimer = setTimeout(magnet, 180);
    }, { passive: true });
    var userInput = function () { if (!sliding) { cancelAnim(); clearTimeout(magnetTimer); } };
    window.addEventListener('wheel', userInput, { passive: true });
    window.addEventListener('touchstart', userInput, { passive: true });
    window.addEventListener('keydown', userInput);
    window.addEventListener('mousedown', function () { pointerDown = true; userInput(); });
    window.addEventListener('mouseup', function () { pointerDown = false; clearTimeout(magnetTimer); magnetTimer = setTimeout(magnet, 180); });
  }

  var slideTarget = document.querySelector('.hero') && document.querySelector('.hero').nextElementSibling;
  if (slideTarget && !reduce && window.matchMedia &&
      matchMedia('(min-width:1021px) and (hover:hover)').matches &&
      window.scrollY < 4 && !location.hash) {
    var slideDone = false;
    var stopSlide = function () {
      slideDone = true;
      window.removeEventListener('wheel', onSlideWheel);
      window.removeEventListener('keydown', onSlideKey);
      window.removeEventListener('scroll', onSlideScroll);
    };
    /* где должен остановиться слайд: верх следующего блока под шапкой (считаем заново, высота могла измениться) */
    var slideY = function () {
      /* тот же отступ, что у прилипания (scroll-padding-top), чтобы слайд и прилипание не спорили */
      var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || (header ? header.offsetHeight : 72);
      return Math.round(slideTarget.getBoundingClientRect().top + window.scrollY - pad);
    };
    var startSlide = function () {
      if (slideDone) return;
      sliding = true;
      var finish = function () { setTimeout(function () { sliding = false; stopSlide(); }, 400); };
      animateTo(slideY(), 1200, function () {
        /* если за время слайда раскладка сдвинулась (шрифты, картинки), доводим до нужной точки */
        if (Math.abs(window.scrollY - slideY()) > 4) animateTo(slideY(), 400, finish); else finish();
      });
    };
    var onSlideWheel = function (e) {
      if (e.ctrlKey) return;
      if (sliding) { e.preventDefault(); return; }
      if (window.scrollY > 4) { stopSlide(); return; }
      if (e.deltaY > 8) { e.preventDefault(); startSlide(); }
    };
    var onSlideKey = function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (!sliding && window.scrollY <= 4 && (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ')) {
        e.preventDefault();
        startSlide();
      }
    };
    /* человек прокрутил иначе (полоса, ссылка) — слайд больше не нужен */
    var onSlideScroll = function () { if (!sliding && window.scrollY > 4) stopSlide(); };
    window.addEventListener('wheel', onSlideWheel, { passive: false });
    window.addEventListener('keydown', onSlideKey);
    window.addEventListener('scroll', onSlideScroll, { passive: true });
  }

  /* Свечение на стеклянных блоках: передаём в CSS положение курсора внутри блока */
  var GLASS = '.header,.tile,.tile__info,.price,.honest>div,.review,.faq details,.master,.book,.book__info,.problem li,.hero-form,.stats__list li,.chip,.master__badge,.seal';
  if (window.matchMedia && matchMedia('(hover:hover)').matches) {
    document.addEventListener('pointermove', function (e) {
      if (!e.target.closest) return;
      /* обновляем и вложенные, и внешние стеклянные блоки, чтобы свечение не отставало */
      for (var el = e.target.closest(GLASS); el; el = el.parentElement && el.parentElement.closest(GLASS)) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        /* у плитки свет лежит на подписи: считаем положение курсора относительно неё */
        if (el.classList.contains('tile')) {
          var info = el.querySelector('.tile__info');
          if (info) {
            var ri = info.getBoundingClientRect();
            info.style.setProperty('--mx', (e.clientX - ri.left) + 'px');
            info.style.setProperty('--my', (e.clientY - ri.top) + 'px');
          }
        }
      }
    }, { passive: true });
  }
  /* Проблеск на кнопке первого экрана: после первой прокрутки, один раз */
  (function () {
    var btns = document.querySelectorAll('.btn[data-goal="cta_hero"]');
    if (!btns.length || !('IntersectionObserver' in window)) return;
    var started = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var b = en.target;
        io.unobserve(b);
        b.classList.add('is-shine');
        b.addEventListener('animationend', function () { b.classList.remove('is-shine'); }, { once: true });
      });
    }, { threshold: .6 });
    var start = function () {
      if (started || window.scrollY < 4) return;
      started = true;
      window.removeEventListener('scroll', start);
      btns.forEach(function (b) { io.observe(b); });
    };
    window.addEventListener('scroll', start, { passive: true });
  })();
})();
