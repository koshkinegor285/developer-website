/// <reference path="../pb_data/types.d.ts" />

// Всё, что показывается на сайте, кроме заявок: любое изменение пересобирает сайт
const content = ["services", "cases", "pains", "guarantees", "steps", "faq", "texts"];
onRecordAfterCreateSuccess((e) => require(`${__hooks}/rebuild.js`)(e), ...content);
onRecordAfterUpdateSuccess((e) => require(`${__hooks}/rebuild.js`)(e), ...content);
onRecordAfterDeleteSuccess((e) => require(`${__hooks}/rebuild.js`)(e), ...content);

// Заявка с сайта: посетитель не может сам отметить её обработанной
onRecordCreateRequest((e) => {
  e.record.set("processed", false);
  e.next();
}, "leads");
