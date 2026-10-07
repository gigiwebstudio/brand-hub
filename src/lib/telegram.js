// Sends Telegram notifications to team members. Requires:
//   1. A bot created via @BotFather on Telegram -> TELEGRAM_BOT_TOKEN env var.
//   2. Each team member has started a chat with that bot at least once, and
//      their numeric chat_id is filled into TEAM_MEMBER_TELEGRAM_IDS in
//      teamMembers.js (get it by visiting
//      https://api.telegram.org/bot<TOKEN>/getUpdates after they message the bot).
// Notifications are best-effort: if the token or a person's chat ID isn't
// set up yet, sending is silently skipped rather than breaking task creation
// or updates.

import { TEAM_MEMBER_TELEGRAM_IDS } from './teamMembers';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(chatId, text) {
  if (!BOT_TOKEN || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('Telegram sendMessage failed:', res.status, detail);
    }
  } catch (err) {
    console.error('Telegram sendMessage error:', err);
  }
}

// Looks up the team member's chat_id and sends them a message. No-op if
// that person hasn't been set up in TEAM_MEMBER_TELEGRAM_IDS yet.
export async function notifyTeamMember(name, text) {
  const chatId = TEAM_MEMBER_TELEGRAM_IDS[name];
  if (!chatId) return;
  await sendTelegramMessage(chatId, text);
}

const APP_URL = process.env.APP_URL || 'https://brand-hub-mu-black.vercel.app';

// Builds a notification body: heading, [client] title, due date, a short
// description preview, and a link that opens the task's modal directly
// (TaskBoard reads ?task=<id> on load).
export function formatTaskMessage(heading, task) {
  const lines = [heading, '', `[${task.client}] ${task.taskTitle}`];
  if (task.dueDate) lines.push(`📅 마감: ${task.dueDate}`);
  const desc = (task.taskDescription || '').trim();
  if (desc) lines.push('', desc.length > 200 ? `${desc.slice(0, 200)}…` : desc);
  lines.push('', `👉 ${APP_URL}/tasks?task=${task.id}`);
  return lines.join('\n');
}
