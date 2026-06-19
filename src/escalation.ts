/**
 * Логика перевода на оператора: распознавание просьбы о человеке,
 * извлечение телефона и состояние «ждём контакт» (in-memory).
 */

/** Клиент явно просит живого человека/менеджера. */
const HUMAN_REQUEST = /(оператор|менеджер|живой человек|с человеком|с оператором|позовите человека)/i;

/** Клиент хочет отменить ввод контакта. */
const CANCEL = /^(отмена|не надо|назад|стоп)\b/i;

/** Грубое распознавание телефонного номера в тексте. */
const PHONE = /\+?\d[\d\-\s()]{8,}\d/;

export function wantsHuman(text: string): boolean {
  return HUMAN_REQUEST.test(text);
}

export function isCancel(text: string): boolean {
  return CANCEL.test(text.trim());
}

export function extractPhone(text: string): string | null {
  const match = text.match(PHONE);
  return match ? match[0].trim() : null;
}

// userId → повод обращения (вопрос, с которого начался перевод на оператора).
const awaitingContact = new Map<number, { reason: string }>();

export function setAwaitingContact(userId: number, reason: string): void {
  awaitingContact.set(userId, { reason });
}

export function isAwaitingContact(userId: number): boolean {
  return awaitingContact.has(userId);
}

export function getReason(userId: number): string {
  return awaitingContact.get(userId)?.reason ?? "—";
}

export function clearAwaitingContact(userId: number): void {
  awaitingContact.delete(userId);
}

// userId → последний вопрос, на который бот не смог ответить.
// Используется как «повод» при переводе на оператора.
const lastUnanswered = new Map<number, string>();

export function setLastUnanswered(userId: number, question: string): void {
  lastUnanswered.set(userId, question);
}

export function getLastUnanswered(userId: number): string | undefined {
  return lastUnanswered.get(userId);
}

export function clearLastUnanswered(userId: number): void {
  lastUnanswered.delete(userId);
}
