// src/app/api/schedule/route.js
// Google Sheets as schedule database

const SHEET_ID = '10rV2Gyg06OxQPvsBswZQ5wQ5KBTQzTTRuxosQn8NFqI'
const SHEET_NAME = 'Sheet1'
const SHEET_RANGE = `${SHEET_NAME}!A:I`

// ── Auth ──────────────────────────────────────────────────────────────────
async function getAccessToken() {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: sa.client_email,
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ].join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const header = { alg: 'RS256', typ: 'JWT' }
  const enc = (d) => btoa(typeof d === 'string' ? unescape(encodeURIComponent(d)) : String.fromCharCode(...new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const sigInput = `${enc(JSON.stringify(header))}.${enc(JSON.stringify(payload))}`
  const pemContent = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(sigInput))
  const jwt = `${sigInput}.${enc(sig)}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Auth failed: ' + JSON.stringify(data))
  return data.access_token
}

// ── Row helpers ───────────────────────────────────────────────────────────
function rowToEntry(row, rowIndex) {
  return {
    _row: rowIndex + 2, // 1-indexed, skip header
    id: row[0] || '',
    clientId: row[1] || '',
    date: row[2] || '',
    type: row[3] || 'instagram_post',
    status: row[4] || 'planned',
    format: row[5] || '',
    note: row[6] || '',
    createdAt: row[7] || '',
  }
}

function entryToRow(entry) {
  return [
    entry.id,
    entry.clientId,
    entry.date,
    entry.type,
    entry.status,
    entry.format,
    entry.note,
    entry.createdAt || new Date().toISOString(),
  ]
}

// ── GET — fetch all schedule entries ─────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // e.g. "2026-07"
  const clientId = searchParams.get('clientId')

  try {
    const token = await getAccessToken()
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    })
    const data = await res.json()
    const rows = data.values || []

    // Skip header row
    const entries = rows.slice(1).map((row, i) => rowToEntry(row, i)).filter(e => e.id)

    // Filter
    let filtered = entries
    if (month) filtered = filtered.filter(e => e.date.startsWith(month))
    if (clientId && clientId !== 'all') filtered = filtered.filter(e => e.clientId === clientId)

    return Response.json({ entries: filtered })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// ── POST — add new entry ──────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const token = await getAccessToken()

    const entry = {
      id: `sch_${Date.now()}`,
      clientId: body.clientId,
      date: body.date,
      type: body.type || 'instagram_post',
      status: body.status || 'planned',
      format: body.format || '',
      note: body.note || '',
      createdAt: new Date().toISOString(),
    }

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME + '!A:H')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    const res = await fetch(appendUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [entryToRow(entry)] }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return Response.json({ entry })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// ── PATCH — update entry status/note ─────────────────────────────────────
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    const token = await getAccessToken()

    // Find the row
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}`
    const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } })
    const getData = await getRes.json()
    const rows = getData.values || []
    const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id)
    if (rowIndex === -1) return Response.json({ error: 'Entry not found' }, { status: 404 })

    const existing = rowToEntry(rows[rowIndex], rowIndex - 1)
    const updated = { ...existing, ...updates }
    const sheetRow = rowIndex + 1 // 1-indexed

    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(`${SHEET_NAME}!A${sheetRow}:H${sheetRow}`)}?valueInputOption=RAW`
    const updateRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [entryToRow(updated)] }),
    })
    const updateData = await updateRes.json()
    if (updateData.error) throw new Error(updateData.error.message)
    return Response.json({ entry: updated })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// ── DELETE — remove entry ─────────────────────────────────────────────────
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const token = await getAccessToken()

    // Find row index
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}`
    const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } })
    const getData = await getRes.json()
    const rows = getData.values || []
    const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id)
    if (rowIndex === -1) return Response.json({ error: 'Not found' }, { status: 404 })

    // Clear the row (Sheets API doesn't truly delete rows easily, so we clear it)
    const sheetRow = rowIndex + 1
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(`${SHEET_NAME}!A${sheetRow}:H${sheetRow}`)}:clear`
    await fetch(clearUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
