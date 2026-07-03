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
//
// Auth: every file has a sync token stored in Script Properties (key = fileId).
// The token is issued on create (or claimed by the first push to a pre-token
// file) and travels inside the group's JSON like driveFileId, so every device
// that pulls or imports the group data learns it automatically. Pushes without
// the right token are rejected once ENFORCE_TOKEN is true (see the rollout
// grace switch below). Reads stay open: the file is link-viewable
// anyway, and an open GET is how a device that predates the token self-heals —
// it pulls the group JSON, adopts the token from it, and can push again.

const FOLDER_NAME = 'Stonesaga';
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // a full save is ~100KB; anything near 2MB is abuse
const MAX_FILES = 10;                      // cap on files this script will create

// Rollout grace switch: while false, the script still claims/stores tokens and
// applies the caps, but accepts pushes with a missing/stale token — cached old
// clients keep working. Flip to true and redeploy (~2026-07-18) once active
// groups have synced with the tokened client; their tokens are already stored
// by then, so enforcement is a non-event.
const ENFORCE_TOKEN = false;

function getFolder() {
  const iter = DriveApp.getFoldersByName(FOLDER_NAME);
  return iter.hasNext() ? iter.next() : DriveApp.createFolder(FOLDER_NAME);
}

function storedToken(fileId) {
  return PropertiesService.getScriptProperties().getProperty('token:' + fileId);
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

// POST body: { action, token, ... }
//   action='create'  → creates a new file, returns { fileId, token }
//   action='push'    → overwrites file content, returns { ok: true }
function doPost(e) {
  try {
    if (e.postData.contents.length > MAX_PAYLOAD_BYTES)
      return respond({ error: 'Payload too large.' });
    const body = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();

    if (body.action === 'create') {
      const folder = getFolder();
      let count = 0;
      const files = folder.getFiles();
      while (files.hasNext() && count <= MAX_FILES) { files.next(); count++; }
      if (count >= MAX_FILES)
        return respond({ error: 'File limit reached — this sync script will not create more files.' });
      const file = folder.createFile(
        'Stonesaga Journal',
        JSON.stringify(body.data || {}, null, 2),
        MimeType.PLAIN_TEXT
      );
      // Public read so anyone with the file ID can pull without auth
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const token = Utilities.getUuid();
      props.setProperty('token:' + file.getId(), token);
      return respond({ fileId: file.getId(), token: token });
    }

    if (body.action === 'push') {
      if (!body.fileId) return respond({ error: 'fileId is required' });
      const stored = storedToken(body.fileId);
      if (!stored) {
        // Pre-token file: the first tokened push claims it.
        if (body.token) props.setProperty('token:' + body.fileId, body.token);
        else if (ENFORCE_TOKEN) return respond({ error: 'This file requires a sync token.' });
      } else if (body.token !== stored) {
        // Grace mode accepts but keeps the stored token — stale clients heal on their next pull.
        if (ENFORCE_TOKEN) return respond({ error: 'Invalid sync token — Sync (pull) first to pick up the group token, then try again.' });
      }
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
