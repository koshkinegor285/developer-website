(() => {
  'use strict';

  /* ---------- Настройки (заполняются при запуске) ---------- */
  const FORM_ENDPOINT = '';   // [НУЖНО] URL российского сервиса/сервера, принимающего заявки (POST, JSON)
  const PHONE_FALLBACK = '+7 (999) 000-00-00';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const goal = () => {};

  /* ---------- Шапка: прозрачная над первым экраном, затем белая ---------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Цели по клику на телефон ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-goal]');
    if (el) goal(el.dataset.goal);
  });

  /* ---------- Даты ---------- */
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  function bindDates(form) {
    const inEl = form.elements.checkin;
    const outEl = form.elements.checkout;
    inEl.min = iso(today);
    outEl.min = iso(tomorrow);
    inEl.addEventListener('change', () => {
      if (!inEl.value) return;
      const next = new Date(inEl.value);
      next.setDate(next.getDate() + 1);
      outEl.min = iso(next);
      if (outEl.value && outEl.value < iso(next)) outEl.value = '';
    });
  }

  const quick = $('#quick-form');
  const form = $('#booking-form');
  bindDates(quick);
  bindDates(form);

  /* ---------- Быстрая форма: даты и гости переходят в основную ---------- */
  function showQuickError(msg) {
    let box = $('.quick__err', quick);
    if (!box) {
      box = document.createElement('p');
      box.className = 'quick__err';
      box.setAttribute('role', 'alert');
      quick.append(box);
    }
    box.textContent = msg;
  }

  quick.addEventListener('submit', (e) => {
    e.preventDefault();
    const { checkin, checkout, adults } = quick.elements;
    if (!checkin.value || !checkout.value) {
      showQuickError('Укажите даты заезда и выезда — подскажем цену и свободные номера.');
      (checkin.value ? checkout : checkin).focus();
      return;
    }
    if (checkout.value <= checkin.value) {
      showQuickError('Дата выезда должна быть позже даты заезда.');
      checkout.focus();
      return;
    }
    $('.quick__err', quick)?.remove();

    form.elements.checkin.value = checkin.value;
    form.elements.checkout.value = checkout.value;
    form.elements.adults.value = adults.value;
    goal('quick_form');

    $('#booking').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => form.elements.phone.focus({ preventScroll: true }), 500);
  });

  $$('[data-focus-quick]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => quick.elements.checkin.focus({ preventScroll: true }), 450);
    });
  });

  /* ---------- Карточки номеров ---------- */
  $$('.card[data-room]').forEach((card) => {
    const more = $('[data-more]', card);
    const text = $('.card__more', card);

    let anim = null;
    more.addEventListener('click', () => {
      const open = anim ? anim.closing : text.hidden;
      more.setAttribute('aria-expanded', String(open));
      if (reduceMotion) { text.hidden = !open; return; }

      // Высота — от текущей до целевой, чтобы повторный клик посреди анимации не дёргал блок
      const from = text.hidden ? 0 : text.offsetHeight;
      if (anim) anim.cancel();
      text.hidden = false;
      const to = open ? text.scrollHeight : 0;
      text.style.overflow = 'hidden';
      const gap = '-14px'; // компенсирует gap карточки, пока блок схлопнут
      const a = text.animate(
        [
          { height: `${from}px`, marginTop: from ? '0px' : gap, opacity: from ? 1 : 0 },
          { height: `${to}px`, marginTop: open ? '0px' : gap, opacity: open ? 1 : 0 },
        ],
        { duration: 350, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
      a.closing = !open;
      anim = a;
      a.onfinish = () => {
        if (!open) text.hidden = true;
        text.style.overflow = '';
        anim = null;
      };
      a.oncancel = () => { text.style.overflow = ''; };
    });

    $('[data-book]', card).addEventListener('click', () => {
      form.elements.room.value = card.dataset.room;
      $('#booking').scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- Основная форма ---------- */
  const status = $('#form-status');
  const submitBtn = $('#booking-submit');

  const setError = (name, msg) => {
    const field = form.elements[name];
    const err = $(`#err-${name}`);
    const wrap = field.closest('.fld');
    if (wrap) wrap.classList.toggle('is-invalid', Boolean(msg));
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg || '';
  };

  const phoneDigits = (v) => v.replace(/\D/g, '');

  function validate() {
    const errors = {};
    const { checkin, checkout, phone, consent } = form.elements;

    if (!checkin.value) errors.checkin = 'Укажите дату заезда';
    if (!checkout.value) errors.checkout = 'Укажите дату выезда';
    else if (checkin.value && checkout.value <= checkin.value) errors.checkout = 'Выезд должен быть позже заезда';

    const digits = phoneDigits(phone.value);
    if (!digits) errors.phone = 'Укажите телефон, чтобы мы подтвердили бронь';
    else if (digits.length < 10 || digits.length > 11) errors.phone = 'Проверьте номер: например, +7 900 123-45-67';

    if (!consent.checked) errors.consent = 'Без согласия на обработку данных мы не можем принять заявку';

    ['checkin', 'checkout', 'phone', 'consent'].forEach((n) => setError(n, errors[n]));
    return errors;
  }

  // Ошибка снимается, как только пользователь начал править поле
  ['checkin', 'checkout', 'phone', 'consent'].forEach((n) => {
    form.elements[n].addEventListener('input', () => setError(n, ''));
    form.elements[n].addEventListener('change', () => setError(n, ''));
  });

  const showStatus = (kind, msg) => {
    status.hidden = false;
    status.className = `form__status is-${kind}`;
    status.textContent = msg;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.hidden = true;

    const errors = validate();
    const first = Object.keys(errors)[0];
    if (first) {
      form.elements[first].focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    data.page = location.href;

    if (!FORM_ENDPOINT) {
      console.warn('[LOFT STAY] Демо-режим: FORM_ENDPOINT не задан, заявка не отправлена.');
      showStatus('ok', 'Демо-режим: апарт-отель вымышлен, бронирование недоступно. Введённые данные никуда не отправлены и не сохранены.');
      return;
    }

    submitBtn.disabled = true;
    const label = submitBtn.textContent;
    submitBtn.textContent = 'Отправляем…';

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      goal('booking_submit');
      showStatus('ok', `Заявка принята. Позвоним по номеру ${data.phone} в течение 15 минут. Если срочно — ${PHONE_FALLBACK}.`);
      form.reset();
    } catch (err) {
      // Введённые данные остаются в форме
      showStatus('err', `Не удалось отправить заявку. Попробуйте ещё раз или позвоните: ${PHONE_FALLBACK}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  });

  /* ---------- FAQ: плавное раскрытие и закрытие ---------- */
  // Анимируется высота всей карточки (а не ответа): у ответа есть нижний отступ,
  // из-за него высота «до нуля» в конце схлопывалась рывком.
  $$('.qa').forEach((qa) => {
    const summary = $('summary', qa);
    const body = $('p', qa);
    let anim = null;

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (reduceMotion) { qa.open = !qa.open; return; }

      const opening = anim ? anim.closing : !qa.open;
      const from = qa.getBoundingClientRect().height; // текущая высота, даже если клик посреди анимации
      if (anim) anim.cancel();
      qa.open = true;

      const frame = qa.offsetHeight - qa.clientHeight; // рамка карточки
      const to = opening ? qa.getBoundingClientRect().height : summary.getBoundingClientRect().height + frame;
      qa.style.overflow = 'hidden';
      anim = qa.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration: 350, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
      );
      body.animate(
        [{ opacity: opening ? 0 : 1 }, { opacity: opening ? 1 : 0 }],
        { duration: 250, easing: 'ease', fill: 'both' }
      );
      anim.closing = !opening;
      const current = anim;
      anim.onfinish = () => {
        // Сначала итоговое состояние, затем снимаем анимацию — иначе на кадр мелькает полная высота
        if (!opening) qa.open = false;
        current.cancel();
        body.getAnimations().forEach((x) => x.cancel());
        qa.style.overflow = '';
        anim = null;
      };
      anim.oncancel = () => { qa.style.overflow = ''; };
    });
  });

})();

/* Плашка «демо» закреплена сверху: высоту отдаём в CSS, чтобы шапка не перекрывала её */
(function () {
  const bar = document.querySelector('.demo-bar');
  if (!bar) return;
  const sync = () => document.documentElement.style.setProperty('--bar-h', bar.offsetHeight + 'px');
  sync();
  window.addEventListener('resize', sync);
  window.addEventListener('load', sync);
})();
