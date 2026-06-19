import "dotenv/config";

/**
 * Чтение и валидация переменных окружения.
 * Падаем сразу на старте, если обязательной переменной нет —
 * лучше явная ошибка при запуске, чем непонятное поведение позже.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Не задана переменная окружения ${name}. ` +
        `Скопируйте .env.example в .env и заполните значение.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  botToken: required("TELEGRAM_BOT_TOKEN"),
  groqApiKey: required("GROQ_API_KEY"),
  googleSheetId: required("GOOGLE_SHEET_ID"),
  // Путь к JSON-ключу сервисного аккаунта Google (относительно папки bot/).
  googleServiceAccountPath: optional("GOOGLE_SERVICE_ACCOUNT_PATH", "service-account.json"),
  // Альтернатива файлу: содержимое JSON-ключа прямо в переменной (удобно для хостинга).
  googleServiceAccountJson: optional("GOOGLE_SERVICE_ACCOUNT_JSON", ""),
  // Chat ID оператора, которому приходят уведомления о «горячих» клиентах.
  operatorChatId: required("OPERATOR_CHAT_ID"),
} as const;
