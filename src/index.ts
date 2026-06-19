import { createServer } from "node:http";
import { createBot } from "./bot.js";
import { cleanupExpiredSessions } from "./conversation.js";

/** Как часто подчищать устаревшие диалоги из памяти. */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Маленький HTTP-сервер: нужен хостингам (Render и т.п.), которые требуют
 * открытый порт, и как точка для «пингера», не дающего сервису уснуть.
 */
function startHealthServer(): void {
  const port = Number(process.env.PORT) || 3000;
  createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("AskBot is running");
  }).listen(port, () => {
    console.log(`🌐 HTTP health-сервер слушает порт ${port}.`);
  });
}

/** Точка входа: запуск бота в режиме long polling + корректное завершение. */
function main(): void {
  startHealthServer();

  const bot = createBot();

  // Периодическая очистка памяти от неактивных сессий.
  // unref() — чтобы таймер не мешал процессу завершиться.
  const cleanupTimer = setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();

  // Graceful shutdown — чтобы при остановке polling завершался аккуратно.
  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());

  bot.start({
    onStart: (info) => {
      console.log(`✅ Бот @${info.username} запущен (long polling).`);
    },
  });
}

main();
