# AskBot — Telegram-бот поддержки магазина STEP UP

AI-консультант на Node.js + TypeScript (grammY). Отвечает на вопросы клиентов
по базе знаний из Google Sheets, держит контекст диалога и переводит на оператора.

## Стек
- Node.js (LTS) + TypeScript, grammY (long polling)
- LLM: Groq (`llama-3.3-70b-versatile`)
- База знаний и логи: Google Sheets

## Переменные окружения
Скопируйте `.env.example` в `.env` и заполните:

| Переменная | Назначение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен бота из @BotFather |
| `GROQ_API_KEY` | ключ Groq (console.groq.com) |
| `GOOGLE_SHEET_ID` | ID таблицы из её URL |
| `OPERATOR_CHAT_ID` | chat_id оператора для уведомлений |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | содержимое JSON-ключа (для хостинга; локально можно файлом `service-account.json`) |

Сервисный аккаунт Google должен быть добавлен в доступ к таблице как **Редактор**.

## Запуск локально
```bash
npm install
npm run dev
```

## Сборка / прод
```bash
npm run build
npm start
```

## Деплой на Render (Free)
1. Залить эту папку в репозиторий на GitHub.
2. Render → New → Blueprint → выбрать репозиторий (`render.yaml` подхватится).
3. Задать переменные окружения (см. таблицу выше).
4. Чтобы сервис не засыпал, пинговать URL раз в ~5 минут (например, UptimeRobot).
