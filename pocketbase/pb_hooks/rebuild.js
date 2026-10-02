// Общий обработчик: после изменения контента просим сборщик пересобрать сайт (он ждёт 5 с и склеивает правки).
module.exports = (e) => {
  e.next();
  try {
    $http.send({
      url: $os.getenv("REBUILD_URL"),
      method: "POST",
      headers: { "X-Rebuild-Token": $os.getenv("REBUILD_TOKEN") },
      timeout: 5,
    });
  } catch (err) {
    console.log("не удалось запустить пересборку:", err);
  }
};
