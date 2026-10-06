import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAuth } from '../../../lib/tasksSheet';

// Persists client archive/activate state in a "ClientStatus" tab of the
// Brand Hub sheet, so archiving from the UI survives reloads and is shared
// across the team. clients.js `active` stays the default; rows here override it.
// Columns: clientId | active (TRUE/FALSE) | updatedAt

const SHEET_ID = process.env.BRAND_HUB_SHEET_ID;
const TAB_NAME = 'ClientStatus';

export const dynamic = 'force-dynamic';

async function ensureTab(sheets) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties.title' });
  const exists = (meta.data.sheets || []).some((s) => s.properties.title === TAB_NAME);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A1:C1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['clientId', 'active', 'updatedAt']] },
  });
}

async function readRows(sheets) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB_NAME}!A2:C` });
  return res.data.values || [];
}

export async function GET() {
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    await ensureTab(sheets);
    const rows = await readRows(sheets);
    const status = {};
    for (const [id, active] of rows) {
      if (id) status[id] = String(active).toUpperCase() !== 'FALSE';
    }
    return NextResponse.json({ status });
  } catch (err) {
    console.error('GET /api/client-status error:', err);
    return NextResponse.json({ error: 'Failed to fetch client status', detail: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { id, active } = await request.json();
    if (!id || typeof active !== 'boolean') {
      return NextResponse.json({ error: 'id and boolean active are required' }, { status: 400 });
    }
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    await ensureTab(sheets);
    const rows = await readRows(sheets);
    const values = [[id, active ? 'TRUE' : 'FALSE', new Date().toISOString()]];
    const idx = rows.findIndex((r) => r[0] === id);

    if (idx >= 0) {
      const rowNum = idx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!A${rowNum}:C${rowNum}`,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!A:C`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
    }
    return NextResponse.json({ id, active });
  } catch (err) {
    console.error('POST /api/client-status error:', err);
    return NextResponse.json({ error: 'Failed to update client status', detail: err.message }, { status: 500 });
  }
}
