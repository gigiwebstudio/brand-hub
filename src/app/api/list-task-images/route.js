import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Since service accounts can't own new file content (see ensure-task-folder
// route for the same limitation), images get dropped into Drive directly by
// a real Google account (via the "Drive에서 열기" link). This route just
// reads back whatever is in that folder — listing/reading has no quota cost.

const PARENT_FOLDER_ID = process.env.BRAND_HUB_TASKS_FOLDER_ID;

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.JWT(credentials.client_email, null, credentials.private_key, [
    'https://www.googleapis.com/auth/drive.readonly',
  ]);
}

async function findFolder(drive, name, parentId) {
  if (!parentId) return null;
  const safeName = name.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });
  return existing.data.files?.[0]?.id || null;
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

    const clientFolderId = await findFolder(drive, client?.trim() || 'Unsorted', PARENT_FOLDER_ID);
    if (!clientFolderId) return NextResponse.json({ images: [], folderExists: false });

    const resolvedDate = dateStr || new Date().toISOString().slice(0, 10);
    const taskFolderName = `${sanitizeForFilename(taskTitle)}_${resolvedDate}`;
    const taskFolderId = await findFolder(drive, taskFolderName, clientFolderId);
    if (!taskFolderId) return NextResponse.json({ images: [], folderExists: false });

    const typeFolderName = folderType === 'designs' ? 'Designs' : 'Screenshots';
    const typeFolderId = await findFolder(drive, typeFolderName, taskFolderId);
    if (!typeFolderId) return NextResponse.json({ images: [], folderExists: false });

    const filesRes = await drive.files.list({
      q: `'${typeFolderId}' in parents and trashed = false and (mimeType contains 'image/')`,
      fields: 'files(id, name, thumbnailLink, webViewLink, createdTime)',
      orderBy: 'name',
    });

    const images = (filesRes.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      viewUrl: `https://drive.google.com/file/d/${f.id}/view`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
    }));

    return NextResponse.json({
      images,
      folderExists: true,
      folderUrl: `https://drive.google.com/drive/folders/${typeFolderId}`,
    });
  } catch (err) {
    console.error('POST /api/list-task-images error:', err);
    return NextResponse.json({ error: 'Failed to list images', detail: err.message }, { status: 500 });
  }
}
