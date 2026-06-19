import type { GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { getDoc } from "./google.js";

/**
 * Логирование вопросов клиентов в отдельную вкладку «Логи» той же таблицы.
 * Пишем все вопросы — владельцу видно реальный спрос аудитории.
 * Запись не блокирует ответ клиенту: ошибки логируются в консоль и не пробрасываются.
 */

const LOG_SHEET_TITLE = "Логи";
const HEADERS = ["Дата/время", "ID клиента", "Имя", "Вопрос", "Перевод на оператора"] as const;

export interface LogEntry {
  userId: number;
  name: string;
  question: string;
  escalated: boolean;
}

/** Находит вкладку логов или создаёт её с заголовками. */
async function getLogSheet(): Promise<GoogleSpreadsheetWorksheet> {
  const doc = await getDoc();
  const existing = doc.sheetsByTitle[LOG_SHEET_TITLE];
  if (existing) return existing;
  return doc.addSheet({ title: LOG_SHEET_TITLE, headerValues: [...HEADERS] });
}

/** Записывает один вопрос в лог. Никогда не бросает — только логирует ошибку. */
export async function logQuestion(entry: LogEntry): Promise<void> {
  try {
    const sheet = await getLogSheet();
    await sheet.addRow({
      "Дата/время": new Date().toLocaleString("ru-RU"),
      "ID клиента": String(entry.userId),
      "Имя": entry.name,
      "Вопрос": entry.question,
      "Перевод на оператора": entry.escalated ? "да" : "нет",
    });
  } catch (err) {
    console.error("Не удалось записать вопрос в лог:", err);
  }
}
