import type { Api } from "grammy";
import { config } from "./config.js";

/** Данные «горячего» клиента для передачи оператору. */
export interface Lead {
  name: string;
  phone: string;
  username?: string;
  userId: number;
  dialog: string;
}

// message_id уведомления у оператора → userId клиента.
// Нужно, чтобы оператор мог ответить клиенту, ответив (reply) на уведомление.
const leadByMessageId = new Map<number, number>();

/** Отправляет оператору уведомление о новом контакте и запоминает связь с клиентом. */
export async function notifyOperator(api: Api, lead: Lead): Promise<void> {
  const username = lead.username ? `@${lead.username}` : "—";
  const text = [
    "🔔 Новый контакт от клиента STEP UP",
    "",
    `👤 Имя: ${lead.name}`,
    `📞 Телефон: ${lead.phone}`,
    `💬 Username: ${username}`,
    `🆔 ID: ${lead.userId}`,
    "",
    "📝 Диалог:",
    lead.dialog,
    "",
    "↩️ Ответьте на это сообщение (reply), чтобы написать клиенту.",
  ].join("\n");

  const sent = await api.sendMessage(config.operatorChatId, text);
  leadByMessageId.set(sent.message_id, lead.userId);
}

/** По message_id уведомления, на которое ответил оператор, возвращает userId клиента. */
export function getClientByOperatorReply(messageId: number): number | undefined {
  return leadByMessageId.get(messageId);
}
