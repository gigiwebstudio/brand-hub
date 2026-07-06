import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Reuses the same Google Sheets spreadsheet as the Content Calendar
// (Brand Hub Schedule). Tasks live in a separate tab called "Tasks".
const SHEET_ID = process.env.BRAND_HUB_SHEET_ID; // match to whatever env var /api/schedule uses
const TAB_NAME = 'Tasks';
const RANGE = `${TAB_NAME}!A2:J`;

// Column order — keep in sync with the header row in Sheets:
// id | client | taskTitle | taskDescription | status | links | screenshotImageIds | designImageIds | comments | createdAt | updatedAt

// Status workflow:
// not_started -> in_progress -> needs_review -> completed
//                                     ^--------- needs_changes ---|
export const STATUSES = ['not_started', 'in_progress', 'needs_review', 'needs_changes', 'completed'];

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

function rowToTask(row, rowIndex) {
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

function taskToRow(task) {
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

export async function GET() {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });
    const rows = res.data.values || [];
    const tasks = rows.map((row, i) => rowToTask(row, i + 2)).filter((t) => t.id);
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();

    const newTask = {
      id: `task_${Date.now()}`,
      client: body.client || '',
      taskTitle: body.taskTitle || '',
      taskDescription: body.taskDescription || '',
      status: 'not_started',
      links: body.links || [],
      screenshotImageIds: body.screenshotImageIds || [],
      designImageIds: [],
      comments: body.comments || '',
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

    return NextResponse.json({ task: newTask });
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { rowIndex, appendComment, ...updates } = body;
    if (!rowIndex) {
      return NextResponse.json({ error: 'rowIndex is required' }, { status: 400 });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const existingRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!A${rowIndex}:J${rowIndex}`,
    });
    const existingRow = (existingRes.data.values || [[]])[0];
    const existingTask = rowToTask(existingRow, rowIndex);

    // For feedback loops (needs_changes), append rather than overwrite comments
    let mergedComments = existingTask.comments;
    if (appendComment) {
      const stamp = new Date().toLocaleString('ko-KR', { timeZone: 'America/Vancouver' });
      mergedComments = `[${stamp}] ${appendComment}\n${mergedComments}`.trim();
    }

    const mergedTask = {
      ...existingTask,
      ...updates,
      comments: appendComment ? mergedComments : (updates.comments ?? existingTask.comments),
      updatedAt: new Date().toISOString(),
    };

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!A${rowIndex}:J${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [taskToRow(mergedTask)] },
    });

    return NextResponse.json({ task: mergedTask });
  } catch (err) {
    console.error('PATCH /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
