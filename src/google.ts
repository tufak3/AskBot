import { readFileSync } from "node:fs";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { config } from "./config.js";

/**
 * Общая авторизация в Google и доступ к таблице.
 * Scope с правом записи — нужен для логирования (Этап 6).
 * Сервисный аккаунт должен быть добавлен в доступ к таблице как «Редактор».
 */

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let auth: JWT | null = null;

/** Берёт ключ из переменной GOOGLE_SERVICE_ACCOUNT_JSON (хостинг) или из файла (локально). */
function loadCreds(): { client_email: string; private_key: string } {
  if (config.googleServiceAccountJson) {
    return JSON.parse(config.googleServiceAccountJson);
  }

  let raw: string;
  try {
    raw = readFileSync(config.googleServiceAccountPath, "utf8");
  } catch {
    throw new Error(
      `Не найден ключ сервисного аккаунта: задайте GOOGLE_SERVICE_ACCOUNT_JSON ` +
        `или положите файл по пути ${config.googleServiceAccountPath}.`,
    );
  }
  return JSON.parse(raw);
}

function getAuth(): JWT {
  if (auth) return auth;

  const creds = loadCreds();
  auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SCOPES,
  });
  return auth;
}

/** Загружает таблицу (с метаданными о листах). */
export async function getDoc(): Promise<GoogleSpreadsheet> {
  const doc = new GoogleSpreadsheet(config.googleSheetId, getAuth());
  await doc.loadInfo();
  return doc;
}
