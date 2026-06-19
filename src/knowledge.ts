import { getDoc } from "./google.js";

/**
 * Загрузка базы знаний из Google Sheets.
 * Вся таблица маленькая, поэтому целиком превращается в текст и кэшируется.
 * Кэш на 5 минут: владелец правит таблицу — изменения применяются без перезапуска,
 * но мы не дёргаем Google API на каждое сообщение.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;

// Названия колонок в таблице (первая строка-заголовок).
const COL_CATEGORY = "Категория";
const COL_TOPIC = "Вопрос/тема";
const COL_ANSWER = "Ответ";

let cache: { text: string; at: number } | null = null;

async function fetchKnowledge(): Promise<string> {
  const doc = await getDoc();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  const lines = rows
    .map((row) => {
      const category = (row.get(COL_CATEGORY) ?? "").trim();
      const topic = (row.get(COL_TOPIC) ?? "").trim();
      const answer = (row.get(COL_ANSWER) ?? "").trim();
      if (!topic && !answer) return null; // пропускаем пустые строки
      return `- [${category}] ${topic}: ${answer}`;
    })
    .filter((line): line is string => line !== null);

  return lines.join("\n");
}

/**
 * Возвращает базу знаний как текст (с кэшем).
 * При сбое загрузки отдаёт устаревший кэш, если он есть, иначе пробрасывает ошибку.
 */
export async function getKnowledgeBase(): Promise<string> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.text;
  }

  try {
    const text = await fetchKnowledge();
    cache = { text, at: now };
    return text;
  } catch (err) {
    if (cache) {
      console.error("Не удалось обновить базу знаний, использую кэш:", err);
      return cache.text;
    }
    throw err;
  }
}
