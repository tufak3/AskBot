/**
 * Хранение контекста диалога в памяти процесса (in-memory).
 * Для MVP персистентность не нужна — при перезапуске история сбрасывается.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Сколько последних сообщений помнить (5 пар «вопрос-ответ»). */
const MAX_MESSAGES = 10;

/** Через сколько бездействия диалог считается завершённым и сбрасывается. */
const TTL_MS = 30 * 60 * 1000;

interface Session {
  messages: ChatMessage[];
  lastActivity: number;
}

const sessions = new Map<number, Session>();

function isExpired(session: Session, now: number): boolean {
  return now - session.lastActivity > TTL_MS;
}

/** Возвращает историю диалога пользователя (пустую, если сессии нет или она устарела). */
export function getHistory(userId: number): ChatMessage[] {
  const session = sessions.get(userId);
  if (!session) return [];
  if (isExpired(session, Date.now())) {
    sessions.delete(userId);
    return [];
  }
  return session.messages;
}

/** Добавляет сообщение в историю, обрезая её до последних MAX_MESSAGES. */
export function appendMessage(userId: number, message: ChatMessage): void {
  const now = Date.now();
  let session = sessions.get(userId);

  if (!session || isExpired(session, now)) {
    session = { messages: [], lastActivity: now };
    sessions.set(userId, session);
  }

  session.messages.push(message);
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }
  session.lastActivity = now;
}

/** Удаляет устаревшие сессии — чтобы память не росла из-за неактивных пользователей. */
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [userId, session] of sessions) {
    if (isExpired(session, now)) {
      sessions.delete(userId);
    }
  }
}
