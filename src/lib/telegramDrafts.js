// Per-chat conversation state for the Telegram /newtask flow. Serverless
// functions are stateless, so the state lives in a "TelegramDrafts" tab of
// the same Google Sheet (created automatically on first use).
// Columns: chatId | state | draftJSON | updatedAt
import { google } from 'googleapis';
import { getAuth } from './tasksSheet';

const SHEET_ID = process.env.BRAND_HUB_SHEET_ID;
const TAB = 'TelegramDrafts';

function sheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

let tabEnsured = false;
async function ensureTab(api) {
  if (tabEnsured) return;
  const meta = await api.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties.title' });
  if (!meta.data.sheets.some((s) => s.properties.title === TAB)) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    await api.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1:D1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['chatId', 'state', 'draftJSON', 'updatedAt']] },
    });
  }
  tabEnsured = true;
}

async function findRow(api, chatId) {
  const res = await api.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB}!A2:D` });
  const rows = res.data.values || [];
  const i = rows.findIndex((r) => String(r[0]) === String(chatId));
  return i === -1 ? null : { rowNumber: i + 2, row: rows[i] };
}

// Returns { state, draft } — state is 'idle' when nothing is in progress.
export async function getDraftState(chatId) {
  const api = sheets();
  await ensureTab(api);
  const found = await findRow(api, chatId);
  if (!found) return { state: 'idle', draft: null };
  let draft = null;
  try {
    draft = found.row[2] ? JSON.parse(found.row[2]) : null;
  } catch {}
  return { state: found.row[1] || 'idle', draft };
}

export async function setDraftState(chatId, state, draft = null) {
  const api = sheets();
  await ensureTab(api);
  const found = await findRow(api, chatId);
  const values = [[String(chatId), state, draft ? JSON.stringify(draft) : '', new Date().toISOString()]];
  if (found) {
    await api.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A${found.rowNumber}:D${found.rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  } else {
    await api.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A:D`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }
}

export const clearDraftState = (chatId) => setDraftState(chatId, 'idle', null);
