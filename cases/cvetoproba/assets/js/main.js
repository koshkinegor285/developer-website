/* Цветопроба, Чебоксары (демо) — скрипты сайта (без библиотек) */
(function () {
  "use strict";

  // ===== Настройки, которые заполняет заказчик =====
  var CONFIG = {
    // Адрес обработчика заявок на вашем сервере или в российской CRM (amoCRM, Битрикс24 и т.п.).
    // Пока пусто — сайт работает в демо-режиме: заявка никуда не уходит, просто открывается страница «Спасибо».
    LEAD_ENDPOINT: "",
    // Показывать ли розовую кнопку «Пометки черновика» (выключите перед запуском)
    DRAFT_MARKS: true
  };

  var isFile = location.protocol === "file:";

  // ----- При открытии файлов с диска ссылки вида "vizitki/" ведут на папку — добавляем index.html -----
  if (isFile) {
    document.querySelectorAll("a[href]").forEach(function (a) {
      var h = a.getAttribute("href");
      if (/^(https?:|mailto:|tel:|#)/.test(h)) return;
      var m = h.match(/^([^#]*\/)(#.*)?$/);
      if (m) a.setAttribute("href", m[1] + "index.html" + (m[2] || ""));
      else if (h === "./" || h === "") a.setAttribute("href", "index.html");
    });
    document.querySelectorAll("form[data-thanks]").forEach(function (f) {
      var t = f.getAttribute("data-thanks");
      if (/\/$/.test(t)) f.setAttribute("data-thanks", t + "index.html");
    });
  }

  function goal() {}
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-goal]");
    if (a) goal(a.getAttribute("data-goal"));
  });

  // ----- Ссылки-заглушки -----
  document.querySelectorAll("[data-todo-link]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      a.insertAdjacentHTML("afterend", ' <span class="todo">[НУЖНО: ' + a.getAttribute("data-todo-link") + "]</span>");
      a.removeAttribute("data-todo-link");
    }, { once: true });
  });

  // ----- Кнопки «Рассчитать» подставляют продукт в форму -----
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-product]");
    if (!b) return;
    var form = document.querySelector("#raschet form") || document.querySelector("form.lead");
    if (!form) return;
    var sel = form.querySelector("select[name=product]");
    if (sel) {
      var v = b.getAttribute("data-product");
      for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === v) sel.selectedIndex = i;
    }
    setTimeout(function () { var q = form.querySelector("[name=qty]"); if (q) q.focus({ preventScroll: true }); }, 450);
  });

  // ----- Маска телефона -----
  function digits(v) { return v.replace(/\D/g, ""); }
  function formatPhone(v) {
    var d = digits(v);
    if (!d) return "";
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d[0] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    var r = "+7";
    if (d.length > 1) r += " (" + d.slice(1, 4);
    if (d.length >= 4) r += ")";
    if (d.length > 4) r += " " + d.slice(4, 7);
    if (d.length > 7) r += "-" + d.slice(7, 9);
    if (d.length > 9) r += "-" + d.slice(9, 11);
    return r;
  }
  document.querySelectorAll('input[type="tel"]').forEach(function (inp) {
    inp.addEventListener("input", function () {
      var atEnd = inp.selectionStart === inp.value.length;
      inp.value = formatPhone(inp.value);
      if (atEnd) inp.setSelectionRange(inp.value.length, inp.value.length);
    });
    inp.addEventListener("focus", function () { if (!inp.value) inp.value = "+7 ("; });
    inp.addEventListener("blur", function () { if (digits(inp.value).length <= 1) inp.value = ""; });
  });

  // ----- Проверка и отправка форм -----
  function setErr(field, box, msg) {
    var wrap = field.closest(".fld, .agree");
    if (wrap) wrap.classList.toggle("bad", !!msg);
    field.setAttribute("aria-invalid", msg ? "true" : "false");
    if (box) box.textContent = msg || "";
  }
  function validate(form) {
    var ok = true;
    var tel = form.querySelector('input[type="tel"]');
    var telErr = document.getElementById(tel.id + "-err");
    var n = digits(tel.value).length;
    if (n < 2) { setErr(tel, telErr, "Укажите телефон — пришлём на него расчёт"); ok = false; }
    else if (n < 11) { setErr(tel, telErr, "Похоже, в номере не хватает цифр: нужно 10 цифр после +7"); ok = false; }
    else setErr(tel, telErr, "");
    var pd = form.querySelector('input[name="pd_consent"]');
    var pdErr = document.getElementById(pd.id + "-err");
    if (!pd.checked) { setErr(pd, pdErr, "Отметьте согласие — без него мы не можем обработать заявку"); ok = false; }
    else setErr(pd, pdErr, "");
    if (!ok) { var first = form.querySelector('[aria-invalid="true"]'); if (first) first.focus(); }
    return ok;
  }
  document.querySelectorAll("form.lead").forEach(function (form) {
    form.addEventListener("input", function (e) {
      if (e.target.getAttribute("aria-invalid") === "true") validate(form);
    });
    form.addEventListener("change", function (e) {
      if (e.target.name === "pd_consent" && e.target.checked) setErr(e.target, document.getElementById(e.target.id + "-err"), "");
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector('[name="website"]').value) return; // ловушка для ботов
      if (!validate(form)) return;
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Отправляем…";
      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== "website") data[k] = v; });
      data.page = location.href;
      data.utm = location.search;
      var done = function () { goal("lead"); location.href = form.getAttribute("data-thanks"); };
      var fail = function () {
        btn.disabled = false;
        btn.textContent = btn.getAttribute("data-label");
        var p = form.querySelector(".lead-alt");
        var tel = p.querySelector("a"); // телефон берём из разметки (его задают в админке)
        var href = tel ? tel.getAttribute("href") : "tel:+78000000000";
        var label = tel ? tel.textContent : "8 800 000-00-00";
        p.innerHTML = '<strong style="color:var(--err)">Заявка не отправилась — проверьте интернет и нажмите ещё раз, или позвоните: <a href="' + href + '">' + label + '</a></strong>';
      };
      // адрес приёма заявок задаётся при сборке сайта (data-endpoint), запасной вариант — CONFIG
      var endpoint = form.getAttribute("data-endpoint") || CONFIG.LEAD_ENDPOINT;
      if (!endpoint) { setTimeout(done, 600); return; } // демо-режим
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
        .catch(fail);
    });
  });


  // ----- Появление блоков при прокрутке (один раз, без повторов) -----
  (function () {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var groups = [".sec-head", ".sec .h2", ".cards > .card", ".guar > div", ".steps > li", ".opts > .opt",
                  ".kinds > div", ".revs > .rev", ".tbl", ".nums > li", ".faq", ".tags", ".ticks", ".fmts", ".nest-w", ".photo", ".todo-box"];
    var els = [];
    groups.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (el.closest(".hero") || el.closest(".sec-head") && el.matches(".h2")) return;
        var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        el.style.setProperty("--i", Math.min(sib, 4));
        els.push(el);
      });
    });
    var vh = window.innerHeight;
    document.documentElement.classList.add("js");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) {
      // то, что уже на экране при загрузке, показываем сразу
      if (el.getBoundingClientRect().top < vh) return;
      el.classList.add("rv");
      io.observe(el);
    });
  })();

  // ----- Пометки черновика -----
  var tg = document.getElementById("todo-toggle");
  var marks = document.querySelectorAll("[data-todo], [data-chk]").length;
  if (tg && CONFIG.DRAFT_MARKS && marks) {
    tg.hidden = false;
    tg.textContent = "Пометки черновика: " + marks + " · скрыть";
    tg.addEventListener("click", function () {
      var clean = document.documentElement.classList.toggle("clean");
      tg.textContent = "Пометки черновика: " + marks + (clean ? " · показать" : " · скрыть");
    });
  }
})();
