import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Readable } from 'stream';

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

  // Best-effort: let anyone with the link view/drop files in this folder
  // directly from the Drive app. If the Workspace org blocks external
  // sharing, this throws — we swallow it so folder creation still succeeds.
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

function extFromMimeType(mimeType) {
  if (!mimeType) return 'jpg';
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
  return map[mimeType] || 'jpg';
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, client, taskTitle, folderType, index, dateStr } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }
    if (!PARENT_FOLDER_ID) {
      return NextResponse.json({ error: 'BRAND_HUB_TASKS_FOLDER_ID env var is not set' }, { status: 500 });
    }

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const clientFolderId = await findOrCreateFolder(drive, client?.trim() || 'Unsorted', PARENT_FOLDER_ID);
    const typeFolderName = folderType === 'designs' ? 'Designs' : 'Screenshots';
    const typeFolderId = await findOrCreateFolder(drive, typeFolderName, clientFolderId);

    // dateStr should be the task's createdAt date (YYYY-MM-DD) so the folder
    // stays the same regardless of when images get added later. Falls back
    // to today if not provided (e.g. brand-new task being created right now).
    const resolvedDate = dateStr || new Date().toISOString().slice(0, 10);
    const taskFolderName = `${sanitizeForFilename(taskTitle)}_${resolvedDate}`;
    const taskFolderId = await findOrCreateFolder(drive, taskFolderName, typeFolderId);

    const ext = extFromMimeType(mimeType);
    const filename = `${index || 1}.${ext}`;

    const buffer = Buffer.from(imageBase64, 'base64');
    const stream = Readable.from(buffer);

    const uploaded = await drive.files.create({
      requestBody: { name: filename, parents: [taskFolderId] },
      media: { mimeType: mimeType || 'image/jpeg', body: stream },
      fields: 'id, webViewLink',
    });

    try {
      await drive.permissions.create({
        fileId: uploaded.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    } catch (permErr) {
      // Non-fatal: file exists either way. Thumbnails may just not render
      // publicly if the Workspace org blocks "anyone" link sharing.
      console.warn('Could not set public permission on file:', permErr.message);
    }

    return NextResponse.json({
      fileId: uploaded.data.id,
      filename,
      folderUrl: `https://drive.google.com/drive/folders/${taskFolderId}`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${uploaded.data.id}&sz=w600`,
    });
  } catch (err) {
    console.error('POST /api/upload-task-image error:', err);
    return NextResponse.json({ error: 'Failed to upload image', detail: err.message }, { status: 500 });
  }
}
