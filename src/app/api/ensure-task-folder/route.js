import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Returns a direct Drive folder link for a task's Screenshots or Designs
// subfolder, creating it if it doesn't exist yet. Lets the coworker drop
// files in via the Drive app directly, as a fallback to in-app upload.

const PARENT_FOLDER_ID = process.env.BRAND_HUB_TASKS_FOLDER_ID;

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.JWT(credentials.client_email, null, credentials.private_key, [
    'https://www.googleapis.com/auth/drive',
  ]);
}

async function findOrCreateFolder(drive, name, parentId) {
  const safeName = name.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });
  if (existing.data.files?.length > 0) return existing.data.files[0].id;

  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  });
  try {
    await drive.permissions.create({
      fileId: created.data.id,
      requestBody: { role: 'writer', type: 'anyone' },
    });
  } catch (permErr) {
    console.warn(`Could not set public permission on folder "${name}":`, permErr.message);
  }
  return created.data.id;
}

function sanitizeForFilename(str) {
  return (str || 'task').trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 60);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { client, taskTitle, dateStr, folderType } = body;

    if (!PARENT_FOLDER_ID) {
      return NextResponse.json({ error: 'BRAND_HUB_TASKS_FOLDER_ID env var is not set' }, { status: 500 });
    }

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const clientFolderId = await findOrCreateFolder(drive, client?.trim() || 'Unsorted', PARENT_FOLDER_ID);
    const typeFolderName = folderType === 'designs' ? 'Designs' : 'Screenshots';
    const typeFolderId = await findOrCreateFolder(drive, typeFolderName, clientFolderId);

    const resolvedDate = dateStr || new Date().toISOString().slice(0, 10);
    const taskFolderName = `${sanitizeForFilename(taskTitle)}_${resolvedDate}`;
    const taskFolderId = await findOrCreateFolder(drive, taskFolderName, typeFolderId);

    return NextResponse.json({ folderUrl: `https://drive.google.com/drive/folders/${taskFolderId}` });
  } catch (err) {
    console.error('POST /api/ensure-task-folder error:', err);
    return NextResponse.json({ error: 'Failed to prepare folder', detail: err.message }, { status: 500 });
  }
}
