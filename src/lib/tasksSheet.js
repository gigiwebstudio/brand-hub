import { google } from 'googleapis';

const SHEET_ID = process.env.BRAND_HUB_SHEET_ID;
const TAB_NAME = 'Tasks';
export const RANGE = `${TAB_NAME}!A2:K`;

// Column order:
// id | client | taskTitle | taskDescription | status | links | screenshotImageIds | designImageIds | comments | createdAt | updatedAt

export function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

export function rowToTask(row, rowIndex) {
  return {
    rowIndex,
    id: row[0] || '',
    client: row[1] || '',
    taskTitle: row[2] || '',
    taskDescription: row[3] || '',
    status: row[4] || 'not_started',
    links: row[5] ? row[5].split(',').map((s) => s.trim()).filter(Boolean) : [],
    screenshotImageIds: row[6] ? row[6].split(',').map((s) => s.trim()).filter(Boolean) : [],
    designImageIds: row[7] ? row[7].split(',').map((s) => s.trim()).filter(Boolean) : [],
    comments: row[8] || '',
    createdAt: row[9] || '',
    updatedAt: row[10] || '',
  };
}

export function taskToRow(task) {
  return [
    task.id,
    task.client,
    task.taskTitle,
    task.taskDescription || '',
    task.status,
    (task.links || []).join(', '),
    (task.screenshotImageIds || []).join(', '),
    (task.designImageIds || []).join(', '),
    task.comments || '',
    task.createdAt,
    task.updatedAt,
  ];
}

// Creates one new task row. Used by both the manual "New Task" modal (via
// /api/tasks POST) and the weekly recurring-task cron job.
export async function appendTask(partialTask) {
  const now = new Date().toISOString();
  const newTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    client: partialTask.client || '',
    taskTitle: partialTask.taskTitle || '',
    taskDescription: partialTask.taskDescription || '',
    status: 'not_started',
    links: partialTask.links || [],
    screenshotImageIds: partialTask.screenshotImageIds || [],
    designImageIds: [],
    comments: partialTask.comments || '',
    createdAt: now,
    updatedAt: now,
  };

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [taskToRow(newTask)] },
  });

  return newTask;
}

export async function getAllTasks() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });
  const rows = res.data.values || [];
  return rows.map((row, i) => rowToTask(row, i + 2)).filter((t) => t.id);
}

// Sheets row deletion is unreliable via the API, so "delete" clears the row's
// content instead. GET already filters out rows with an empty id.
export async function clearTaskRow(rowIndex) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A${rowIndex}:K${rowIndex}`,
  });
}
