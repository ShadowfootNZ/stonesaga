// Stonesaga Drive Sync
// ────────────────────
// Deploy this as a Google Apps Script Web App:
//   1. Go to script.google.com and create a new project.
//   2. Paste this entire file, replacing the default content.
//   3. Click Deploy → New deployment → Web app.
//   4. Set "Execute as" to Me, "Who has access" to Anyone.
//   5. Click Deploy and copy the Web App URL.
//   6. Paste the URL into DRIVE_SYNC_URL in app.js.
//
// Re-deploy (Deploy → Manage deployments → edit) whenever you change this script.

const FOLDER_NAME = 'Stonesaga';

function getFolder() {
  const iter = DriveApp.getFoldersByName(FOLDER_NAME);
  return iter.hasNext() ? iter.next() : DriveApp.createFolder(FOLDER_NAME);
}

// GET ?fileId=<id>  →  returns the file's JSON content
function doGet(e) {
  try {
    const fileId = e.parameter.fileId;
    if (!fileId) return respond({ error: 'fileId is required' });
    const content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
    return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return respond({ error: err.message });
  }
}

// POST body: { action, ... }
//   action='create'  → creates a new file, returns { fileId }
//   action='push'    → overwrites file content, returns { ok: true }
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'create') {
      const folder = getFolder();
      const file = folder.createFile(
        'Stonesaga Journal',
        JSON.stringify(body.data || {}, null, 2),
        MimeType.PLAIN_TEXT
      );
      // Public read so anyone with the file ID can pull without auth
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return respond({ fileId: file.getId() });
    }

    if (body.action === 'push') {
      if (!body.fileId) return respond({ error: 'fileId is required' });
      DriveApp.getFileById(body.fileId).setContent(JSON.stringify(body.data, null, 2));
      return respond({ ok: true });
    }

    return respond({ error: 'Unknown action. Expected "create" or "push".' });
  } catch (err) {
    return respond({ error: err.message });
  }
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
