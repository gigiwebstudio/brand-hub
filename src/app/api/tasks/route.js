import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAuth, rowToTask, taskToRow, appendTask, getAllTasks, clearTaskRow } from '../../../lib/tasksSheet';

const SHEET_ID = process.env.BRAND_HUB_SHEET_ID;
const TAB_NAME = 'Tasks';

export async function GET() {
  try {
    const tasks = await getAllTasks();
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to fetch tasks', detail: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const task = await appendTask(body);
    return NextResponse.json({ task });
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to create task', detail: err.message }, { status: 500 });
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
      range: `${TAB_NAME}!A${rowIndex}:K${rowIndex}`,
    });
    const existingRow = (existingRes.data.values || [[]])[0];
    const existingTask = rowToTask(existingRow, rowIndex);

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
      range: `${TAB_NAME}!A${rowIndex}:K${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [taskToRow(mergedTask)] },
    });

    return NextResponse.json({ task: mergedTask });
  } catch (err) {
    console.error('PATCH /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to update task', detail: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndex = searchParams.get('rowIndex');
    if (!rowIndex) {
      return NextResponse.json({ error: 'rowIndex is required' }, { status: 400 });
    }
    await clearTaskRow(rowIndex);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to delete task', detail: err.message }, { status: 500 });
  }
}
