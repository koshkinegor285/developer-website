/// <reference path="../pb_data/types.d.ts" />
// Коллекции сайта и права доступа. Стартовое содержимое загружает seed.mjs.
// Выполняется один раз при первом запуске.
migrate((app) => {
  const published = "status = 'published'";
  const status = { type: "select", name: "status", required: true, maxSelect: 1, values: ["published", "draft"], help: "published — показывается на сайте, draft — скрыто" };
  const sort = { type: "number", name: "sort", help: "Порядок на сайте: меньше — выше" };
  const created = { type: "autodate", name: "created", onCreate: true };

  // Публично читаются только опубликованные записи
  const list = (name, fields) => app.save(new Collection({
    type: "base", name, listRule: published, viewRule: published,
    fields: [...fields, status, sort, created],
  }));

  list("services", [
    { type: "text", name: "title", required: true, presentable: true, help: "Название услуги" },
    { type: "text", name: "group", required: true, help: "Услуги с одинаковой группой объединяются на сайте: Сайты и продвижение / Боты и ИИ / ИИ и автоматизация" },
    { type: "text", name: "price", required: true, help: "Например: от 25 000 ₽" },
    { type: "text", name: "desc", required: true, help: "Короткое описание" },
    { type: "text", name: "term", help: "Например: 2–3 недели" },
  ]);
  list("cases", [
    { type: "text", name: "title", required: true, presentable: true },
    { type: "text", name: "text", required: true, max: 3000 },
  ]);
  list("pains", [
    { type: "text", name: "title", required: true, presentable: true, help: "Блок «Знакомо?»: заголовок карточки" },
    { type: "text", name: "text", required: true, max: 1000 },
  ]);
  list("guarantees", [
    { type: "text", name: "title", required: true, presentable: true, help: "Блок «Почему со мной безопасно»: заголовок карточки" },
    { type: "text", name: "text", required: true, max: 1000 },
  ]);
  list("steps", [
    { type: "text", name: "title", required: true, presentable: true, help: "Блок «Как работаем»: шаг" },
    { type: "text", name: "text", required: true, max: 1000 },
  ]);
  list("faq", [
    { type: "text", name: "question", required: true, presentable: true },
    { type: "text", name: "answer", required: true, max: 3000 },
  ]);

  // Одиночные тексты блоков: найти нужный по подписи, изменить «value». Ключ (key) не менять
  app.save(new Collection({
    type: "base", name: "texts", listRule: "", viewRule: "",
    indexes: ["CREATE UNIQUE INDEX idx_texts_key ON texts (key)"],
    fields: [
      { type: "text", name: "label", required: true, presentable: true, help: "Где этот текст на сайте" },
      { type: "text", name: "key", required: true, help: "Служебный ключ. Не менять" },
      { type: "text", name: "value", max: 3000, help: "Текст на сайте. Пустое значение = текст по умолчанию. [НУЖНО: …] подсвечивается как недостающее" },
      created,
    ],
  }));

  // Заявки: посетитель может только создать, читает владелец в админке
  app.save(new Collection({
    type: "base", name: "leads", createRule: "",
    fields: [
      { type: "text", name: "name", required: true, max: 200 },
      { type: "text", name: "contact", required: true, max: 200, help: "Telegram или телефон" },
      { type: "text", name: "task", max: 3000 },
      { type: "text", name: "source", max: 500, help: "Страница отправки" },
      { type: "bool", name: "processed", help: "Отметьте, когда ответили клиенту" },
      created,
    ],
  }));

  // Лимит заявок: 5 в минуту с одного адреса
  try {
    const settings = app.settings();
    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      { label: "leads:create", maxRequests: 5, duration: 60 },
      { label: "*:auth", maxRequests: 2, duration: 3 },
      { label: "*:create", maxRequests: 20, duration: 5 },
      { label: "/api/batch", maxRequests: 3, duration: 1 },
      { label: "/api/", maxRequests: 300, duration: 10 },
    ];
    app.save(settings);
  } catch (err) {
    console.log("rate limit не настроен:", err);
  }

}, (app) => {
  for (const name of ["leads", "texts", "faq", "steps", "guarantees", "pains", "cases", "services"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
  }
});
