import { Bot, Keyboard } from "grammy";
import { config } from "./config.js";
import { generateReply } from "./llm.js";
import { getKnowledgeBase } from "./knowledge.js";
import { getHistory, appendMessage, formatRecentDialog } from "./conversation.js";
import {
  wantsHuman,
  isCancel,
  extractPhone,
  setAwaitingContact,
  isAwaitingContact,
  getReason,
  clearAwaitingContact,
  setLastUnanswered,
  getLastUnanswered,
  clearLastUnanswered,
} from "./escalation.js";
import { notifyOperator, getClientByOperatorReply } from "./operator.js";
import { logQuestion } from "./logger.js";

/** Приветствие от лица поддержки магазина STEP UP (на «вы», дружелюбно-деловой тон). */
const WELCOME_MESSAGE = [
  "Здравствуйте! Это бот поддержки магазина STEP UP.",
  "",
  "Спрашивайте свободным текстом — про наличие и цены, доставку, оплату или режим работы.",
  "Я на связи круглосуточно. Если вопрос окажется сложным — подключу живого менеджера.",
].join("\n");

/** Сообщение при сбое (LLM или база знаний) — чтобы клиент не остался без ответа. */
const ERROR_REPLY =
  "Извините, сейчас не получается ответить. Попробуйте, пожалуйста, чуть позже.";

/** Подсказка, как позвать оператора, когда бот не знает ответа. */
const OPERATOR_HINT =
  "Если хотите, напишите «перевести на оператора» — и я передам ваш вопрос менеджеру.";

/** Просьба оставить контакт при переводе на оператора. */
const ASK_CONTACT =
  "Чтобы менеджер связался с вами, оставьте, пожалуйста, контакт: " +
  "нажмите кнопку ниже или просто напишите номер телефона. " +
  "Если передумали — напишите «отмена».";

const THANKS_CONTACT =
  "Спасибо! Передал ваш вопрос менеджеру — он свяжется с вами в ближайшее время.";

const CANCEL_CONTACT = "Хорошо, отменил. Чем ещё могу помочь?";

/** Клавиатура с кнопкой «Поделиться контактом». */
const contactKeyboard = new Keyboard().requestContact("Поделиться контактом").resized().oneTime();

/** Имя клиента из доступных полей Telegram. */
function fullName(first?: string, last?: string, fallback = "Клиент"): string {
  return [first, last].filter(Boolean).join(" ") || fallback;
}

/**
 * Создаёт и настраивает экземпляр бота.
 * Этап 5: ответы по базе + контекст + перевод на оператора со сбором контакта.
 */
export function createBot(): Bot {
  const bot = new Bot(config.botToken);

  bot.command("start", async (ctx) => {
    await ctx.reply(WELCOME_MESSAGE);
  });

  // Клиент поделился контактом через кнопку.
  bot.on("message:contact", async (ctx) => {
    const userId = ctx.from.id;
    const contact = ctx.message.contact;

    await notifyOperator(bot.api, {
      name: fullName(contact.first_name, contact.last_name, ctx.from.first_name),
      phone: contact.phone_number,
      username: ctx.from.username,
      userId,
      dialog: formatRecentDialog(userId),
    });

    clearAwaitingContact(userId);
    await ctx.reply(THANKS_CONTACT, { reply_markup: { remove_keyboard: true } });
  });

  bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id;
    const userText = ctx.message.text;

    // Ответ оператора клиенту: оператор отвечает (reply) на уведомление о лиде.
    if (String(ctx.chat.id) === config.operatorChatId && ctx.message.reply_to_message) {
      const targetUserId = getClientByOperatorReply(ctx.message.reply_to_message.message_id);
      if (targetUserId) {
        await bot.api.sendMessage(targetUserId, `Ответ от оператора:\n${userText}`);
        await ctx.reply("Отправлено клиенту.");
        return;
      }
    }

    // Если ждём контакт — обрабатываем ввод телефона/отмену отдельно.
    if (isAwaitingContact(userId)) {
      if (isCancel(userText)) {
        clearAwaitingContact(userId);
        await ctx.reply(CANCEL_CONTACT, { reply_markup: { remove_keyboard: true } });
        return;
      }
      const phone = extractPhone(userText);
      if (phone) {
        await notifyOperator(bot.api, {
          name: fullName(ctx.from.first_name, ctx.from.last_name),
          phone,
          username: ctx.from.username,
          userId,
          dialog: formatRecentDialog(userId),
        });
        clearAwaitingContact(userId);
        await ctx.reply(THANKS_CONTACT, { reply_markup: { remove_keyboard: true } });
        return;
      }
      await ctx.reply(
        "Пожалуйста, отправьте номер кнопкой ниже или напишите его в сообщении. " +
          "Либо напишите «отмена».",
        { reply_markup: contactKeyboard },
      );
      return;
    }

    // Обычный путь: ответ через LLM по базе знаний.
    await ctx.replyWithChatAction("typing");
    try {
      const knowledge = await getKnowledgeBase();
      const history = getHistory(userId);
      const { text, needsOperator } = await generateReply(userText, knowledge, history);

      appendMessage(userId, { role: "user", content: userText });
      appendMessage(userId, { role: "assistant", content: text });

      const explicitRequest = wantsHuman(userText);

      // Если бот не знает ответа, но клиент не просил человека — не спамим оператора,
      // а запоминаем вопрос и подсказываем, как позвать оператора при необходимости.
      if (needsOperator && !explicitRequest) {
        setLastUnanswered(userId, userText);
      }
      const replyText =
        needsOperator && !explicitRequest ? `${text}\n\n${OPERATOR_HINT}` : text;
      await ctx.reply(replyText);

      // Перевод на оператора — только по явной просьбе клиента.
      // Повод для оператора — последний вопрос, на который бот не смог ответить.
      if (explicitRequest) {
        const reason = getLastUnanswered(userId) ?? userText;
        setAwaitingContact(userId, reason);
        clearLastUnanswered(userId);
        await ctx.reply(ASK_CONTACT, { reply_markup: contactKeyboard });
      }

      // Логируем вопрос (не блокируя ответ — ошибки логирования глотаются внутри).
      void logQuestion({
        userId,
        name: fullName(ctx.from.first_name, ctx.from.last_name),
        question: userText,
        escalated: explicitRequest,
      });
    } catch (err) {
      console.error("Ошибка при формировании ответа:", err);
      await ctx.reply(ERROR_REPLY);
    }
  });

  // Глобальный перехватчик ошибок: сбой одного апдейта не должен ронять процесс.
  bot.catch((err) => {
    console.error(`Ошибка при обработке апдейта ${err.ctx.update.update_id}:`, err.error);
  });

  return bot;
}
