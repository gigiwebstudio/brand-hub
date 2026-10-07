import { NextResponse } from 'next/server';
import { clients } from '../../../clients';
import { appendTask } from '../../../../lib/tasksSheet';
import { TEAM_MEMBERS, TEAM_MEMBER_TELEGRAM_IDS } from '../../../../lib/teamMembers';
import { sendTelegramMessage, formatTaskMessage } from '../../../../lib/telegram';

// Telegram sends every message sent to the bot here (registered once via
// setWebhook). Lets a team member create a task by messaging the bot in
// plain text. No AI: the client is matched by name, URLs become links, the
// first remaining line is the title and the rest is the description.
export const dynamic = 'force-dynamic';

const HELP = [
  '태스크 만드는 법: 그냥 메시지로 보내세요.',
  '',
  '예)',
  'Cocorico 메뉴 사진 3장 수정',
  '자세한 설명은 여기부터 (여러 줄 가능)',
  'https://링크는 자동으로 링크로 저장돼요',
  '',
  '• 첫 줄 = 제목, 나머지 = 설명',
  '• 클라이언트 이름(예: Cocorico, 월하)이 글 안에 있으면 자동 지정',
  '• 담당자는 기본이 나. 다른 사람은 @경민 처럼 쓰기',
  '• 사진은 못 받아요. 사진은 앱에서 Drive 폴더에 넣어주세요.',
].join('\n');

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

// Alias list per client: full name, Korean name, id, and the first word of
// the name when no other client shares it (so "Joayo" alone stays ambiguous).
const firstWordCounts = {};
clients.forEach((c) => {
  const w = norm(c.name.split(/\s+/)[0]);
  firstWordCounts[w] = (firstWordCounts[w] || 0) + 1;
});
const CLIENT_ALIASES = clients
  .filter((c) => c.active)
  .map((c) => {
    const first = norm(c.name.split(/\s+/)[0]);
    const aliases = [norm(c.name), norm(c.nameKo), norm(c.id)];
    if (firstWordCounts[first] === 1) aliases.push(first);
    return { name: c.name, aliases: aliases.filter((a) => a.length >= 2) };
  });

function findClient(text) {
  const t = norm(text);
  let best = null;
  for (const c of CLIENT_ALIASES) {
    for (const a of c.aliases) {
      if (t.includes(a) && (!best || a.length > best.len)) best = { name: c.name, len: a.length };
    }
  }
  return best?.name || '';
}

export async function POST(request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Always answer 200 after this point, otherwise Telegram retries the update.
  try {
    const update = await request.json();
    const msg = update.message;
    if (!msg?.chat?.id) return NextResponse.json({ ok: true });

    const chatId = String(msg.chat.id);
    const sender = Object.keys(TEAM_MEMBER_TELEGRAM_IDS).find((n) => TEAM_MEMBER_TELEGRAM_IDS[n] === chatId);

    if (!sender) {
      await sendTelegramMessage(
        chatId,
        `아직 등록 안 된 사용자예요. 슬기님께 이 번호를 알려주세요.\n\nchat_id: ${chatId}`
      );
      return NextResponse.json({ ok: true });
    }

    const text = (msg.text || msg.caption || '').trim();
    if (!text || text === '/start' || text === '/help') {
      await sendTelegramMessage(chatId, msg.photo ? `사진만으로는 태스크를 못 만들어요.\n\n${HELP}` : HELP);
      return NextResponse.json({ ok: true });
    }

    // @name -> assignee (default: the sender)
    let assignedTo = sender;
    let body = text;
    for (const name of TEAM_MEMBERS) {
      if (body.includes(`@${name}`)) {
        assignedTo = name;
        body = body.split(`@${name}`).join('');
      }
    }

    const client = findClient(body);
    const links = [...new Set(body.match(/https?:\/\/[^\s]+/g) || [])];
    const lines = body
      .split('\n')
      .map((l) => l.replace(/https?:\/\/[^\s]+/g, '').trim())
      .filter(Boolean);
    // Drop a first line that is only the client name
    if (client && lines.length > 1 && norm(lines[0]) === norm(client)) lines.shift();

    const taskTitle = (lines[0] || links[0] || '(제목 없음)').slice(0, 100);
    const taskDescription = lines.slice(1).join('\n');

    // The sender gets a confirmation reply below, so skip the "assigned to
    // you" notification when they assigned the task to themselves.
    const task = await appendTask(
      { client, taskTitle, taskDescription, links, assignedTo },
      { notify: assignedTo !== sender }
    );

    let reply = formatTaskMessage('✅ 태스크를 만들었어요', task);
    if (!client) reply += '\n\n※ 클라이언트를 못 찾았어요. 앱에서 지정해주세요.';
    if (msg.photo) reply += '\n※ 사진은 저장되지 않았어요. 앱에서 Drive 폴더에 넣어주세요.';
    if (assignedTo !== sender) reply += `\n※ 담당: ${assignedTo}`;
    await sendTelegramMessage(chatId, reply);
  } catch (err) {
    console.error('Telegram webhook error:', err);
  }
  return NextResponse.json({ ok: true });
}
