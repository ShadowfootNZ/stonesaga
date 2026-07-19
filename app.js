// ═══════════════════════════════════════════════════
// TODO — JOURNAL TRANSFORMATION (remaining sections)
//
// ── VALLEY MAP ─────────────────────────────────────
// TODO: Add a Valley Map section.
//   - Display a hex-grid map of the valley (SVG or canvas).
//   - Allow players to label hexes (terrain type, name, notes).
//   - Support uploading a scanned map image as a background layer.
//   - Store hex annotations in the save JSON under `valleyMap`.
//   - Behemoth `lairHex` fields become cross-links to hex IDs once this exists.
//   - Replace free-text `lairHex` entry with grouped region-aware hex selection:
//     VV/SP default regions, fixed region counts, and special HX01a/HX01b entries.
//
// ── DRIVE SYNC TOKEN ENFORCEMENT ───────────────────
// TODO (by ~2026-07-18): Flip ENFORCE_TOKEN to true in drive-sync.gs and
//   redeploy the script. The tokened script was deployed 2026-07-04 with the
//   flag false, so it claims/stores tokens and applies the payload/creation
//   caps without rejecting stale cached clients. Enforcement is safe once
//   active groups have synced with the tokened client — their tokens are
//   already stored. Only the flag flip + redeploy remain.
//
// ── PUBLISHER PERMISSION / REPO VISIBILITY ─────────
// TODO (by 2026-07-17, ~2 weeks): Change the GitHub repo from public to
//   private — it currently republishes copyrighted game content (mark art,
//   card text). Check the deploy workflow still runs on a private repo
//   (GitHub Actions: fine; GitHub Pages mirror will stop — primary hosting
//   is apps.shadowfoot.com via SSH, unaffected).
//   NOTE: Permission will be sought from the publisher for this app — it is
//   useless without owning the game, and the developer already makes the
//   rulebook and journal freely downloadable, so there's a reasonable case.
//   NOTE: Brian is monitoring analytics.js results to understand where
//   visitors from outside the group are coming from — input to the
//   visibility/permission decision.
//
// ── DRIVE IMAGE UPLOADS ────────────────────────────
// TODO: Upload images (cave wall photos, future map scans) to Google Drive as
//   separate files via drive-sync.gs instead of inlining them in the JSON —
//   keeps the save small while letting the whole group see images. Store the
//   Drive file id in the entry; fetch on demand; cache locally.
//
// ── CODEX ERRATA REVIEW ────────────────────────────
// TODO: Review content derived from the Codex — it is v1 and needs the
//   published errata applied to be v2. Check the marks reference sheet, the
//   provisional crafting CSVs, and any card IDs/text imported from it, and
//   correct anything the errata changed.
//
// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const STORAGE_KEY   = 'stonesaga_v2';
const DRIVE_SYNC_URL = 'https://script.google.com/macros/s/AKfycbyYhWRyscNnJnujY6e_TaDHKd23R--lPKkJ1VqdfWlc1uPOhGPeNFYB6WY3jzVtga6nzw/exec'; 
const APP_VERSION_STAMP = '__APP_VERSION_STAMP__';
const APP_VERSION_STAMP_PLACEHOLDER = '__APP_' + 'VERSION_STAMP__';
const APP_VERSION = (() => {
  if (APP_VERSION_STAMP && APP_VERSION_STAMP !== APP_VERSION_STAMP_PLACEHOLDER) return APP_VERSION_STAMP;
  try {
    const script = [...document.scripts].find(s => /(?:^|\/)app\.js(?:[?#]|$)/.test(s.getAttribute('src') || s.src || ''));
    const src = script?.getAttribute('src') || script?.src || '';
    const v = new URL(src, location.href).searchParams.get('v');
    return v && v !== 'STAMP' ? v : 'dev';
  } catch {
    return 'dev';
  }
})();
const EXPORT_VERSION = 5; // v5: adds codexEntries, culture.outposts, mantle on mantle powers; v4: {deleted:true} tombstones
const PIP_COLORS  = ['Blue','Red','Yellow','Purple','Grey','Green','Orange','Silver'];

// Card/tile IDs are a 2-letter prefix + digits ("IT13", "BH03"). The known
// prefix families — more will be discovered as the campaign unfolds:
const ID_PREFIXES = {
  BH: 'Behemoth',
  IT: 'Item',
  ST: 'Structure',
  OP: 'Outpost Overlay Tile',
  OG: 'Glacier Overlay Tile',
  MA: 'Mantle',
  GB: 'Goal',
  KN: 'Knowledge Card',
  CH: 'Challenge',
  IV: 'Investigation',
  BT: 'Behemoth Secret',
};
const PIP_CSS     = {Blue:'blue',Red:'red',Yellow:'yellow',Purple:'purple',Grey:'grey',Green:'green',Orange:'orange',Silver:'silver'};

// Materials are loaded from materials.json at startup.
// Edit that file to add new materials; the hardcoded list below is a fallback
// used only when the file cannot be fetched (e.g. opening via file://).
const IMG = 'assets/images/materials/';
const KNOWN_MATERIALS_BUILTIN = [
  {name:'Bone',               cat:'animal',  processed:'Bone (carved)',        image:IMG+'bone.webp',              marks:['Blue 2',  'Yellow 2', 'Yellow 3', 'Red 2'  ]},
  {name:'Bone (carved)',      cat:'animal',  processed:null,                   image:IMG+'bone-carved.webp',       marks:['Red 1',   'Yellow 3', 'Red 4',    'Yellow 4']},
  {name:'Hide',               cat:'animal',  processed:'Hide (cured)',         image:IMG+'hide.webp',              marks:null},
  {name:'Hide (cured)',       cat:'animal',  processed:null,                   image:IMG+'hide-cured.webp',        marks:['Blue 3',  'Red 5',    null,       null      ]},
  {name:'Shell',              cat:'animal',  processed:'Shell (sharpened)',    image:IMG+'shell.webp',             marks:null},
  {name:'Shell (sharpened)',  cat:'animal',  processed:null,                   image:IMG+'shell-sharpened.webp',   marks:['Blue 6',  'Red 3',    'Yellow 5', 'Red 1'   ]},
  {name:'Guts',               cat:'animal',  processed:'Guts (cured)',         image:IMG+'guts.webp',              marks:null},
  {name:'Guts (cured)',       cat:'animal',  processed:null,                   image:IMG+'guts-cured.webp',        marks:['Yellow 1','Blue 1',   null,       'Red 3'   ]},
  {name:'Feather',            cat:'animal',  processed:'Feather (cut)',        image:IMG+'feather.webp',           marks:[null,      'Blue 1',   null,       null      ]},
  {name:'Feather (cut)',      cat:'animal',  processed:null,                   image:IMG+'feather-cut.webp',       marks:['Yellow 1',null,       null,       null      ]},
  {name:'Tooth',              cat:'animal',  processed:'Tooth (drilled)',      image:IMG+'tooth.webp',             marks:null},
  {name:'Tooth (drilled)',    cat:'animal',  processed:null,                   image:IMG+'tooth-drilled.webp',     marks:['Blue 2',  null,       'Yellow 2', null      ]},
  {name:'Clay',               cat:'mineral', processed:'Clay (fired)',         image:IMG+'clay.webp',              marks:null},
  {name:'Clay (fired)',       cat:'mineral', processed:null,                   image:IMG+'clay-fired.webp',        marks:['Red 6',   'Red 6',    null,       null      ]},
  {name:'Cloudstone',         cat:'mineral', processed:'Cloudstone (shaped)',  image:IMG+'cloudstone.webp',        marks:null},
  {name:'Cloudstone (shaped)',cat:'mineral', processed:null,                   image:IMG+'cloudstone-shaped.webp', marks:['Blue 5',  'Yellow 4', 'Red 4',    'Blue 2'  ]},
  {name:'Riverstone',         cat:'mineral', processed:'Riverstone (flaked)',  image:IMG+'riverstone.webp',        marks:null},
  {name:'Riverstone (flaked)',cat:'mineral', processed:null,                   image:IMG+'riverstone-flaked.webp', marks:['Red 1',   'Yellow 4', 'Yellow 4', 'Red 3'   ]},
  {name:'Sunstone',           cat:'mineral', processed:'Sunstone (shaped)',    image:IMG+'sunstone.webp',          marks:null},
  {name:'Sunstone (shaped)',  cat:'mineral', processed:null,                   image:IMG+'sunstone-shaped.webp',   marks:['Red 5',   'Yellow 6', null,       null      ]},
  {name:'Wood',               cat:'plant',   processed:'Wood (hardened)',      image:IMG+'wood.webp',              marks:['Blue 2',  'Yellow 2', 'Red 2',    'Yellow 3']},
  {name:'Wood (hardened)',    cat:'plant',   processed:null,                   image:IMG+'wood-hardened.webp',     marks:['Red 1',   'Yellow 2', 'Red 3',    'Yellow 3']},
  {name:'Fiber',              cat:'plant',   processed:'Fiber (woven)',        image:IMG+'fiber.webp',             marks:null},
  {name:'Fiber (woven)',      cat:'plant',   processed:null,                   image:IMG+'fiber-woven.webp',       marks:['Yellow 1','Blue 1',   'Yellow 5', 'Red 5'   ]},
  {name:'Pitch',              cat:'plant',   processed:'Pitch (treated)',      image:IMG+'pitch.webp',             marks:null},
  {name:'Pitch (treated)',    cat:'plant',   processed:null,                   image:IMG+'pitch-treated.webp',     marks:['Red 5',   null,       null,       null      ]},
  {name:'Moonblood',          cat:'rare',    processed:'Moonblood (solid)',    image:IMG+'moonblood.webp',         marks:null},
  {name:'Moonblood (solid)',  cat:'rare',    processed:null,                   image:IMG+'moonblood-solid.webp',   marks:['Red 1',   'Yellow 6', 'Red 2',    'Grey 6'  ]},
  {name:'Coral',              cat:'rare',    processed:'Coral (living)',       image:IMG+'coral.webp',             marks:null},
  {name:'Coral (living)',     cat:'rare',    processed:null,                   image:IMG+'coral-living.webp',      marks:['Purple 6','Red 4',    'Purple 6', 'Yellow 4']},
  {name:'Silk',               cat:'rare',    processed:'Silk (woven)',         image:IMG+'silk.webp',              marks:['Blue 1',  'Yellow 1', 'Red 3',    null      ]},
  {name:'Silk (woven)',       cat:'rare',    processed:null,                   image:IMG+'silk-woven.webp',        marks:['Blue 2',  'Red 5',    null,       null      ]},
];
let BASE_MATERIALS  = KNOWN_MATERIALS_BUILTIN;
let KNOWN_MATERIALS = KNOWN_MATERIALS_BUILTIN;
let KM = Object.fromEntries(KNOWN_MATERIALS.map(m=>[m.name.toLowerCase(),m]));

function parseMaterialsJson(data){
  return Object.entries(data)
    .filter(([k])=>k!=='_readme')
    .map(([name,m])=>({
      name,
      cat: m.cat,
      processed: m.processed,
      image: m.image,
      marks: m.marks ? [m.marks.left, m.marks.right, m.marks.top, m.marks.bottom] : null,
    }));
}

function rebuildMaterials() {
  const baseNames = new Set(BASE_MATERIALS.map(m => norm(m.name)));
  KNOWN_MATERIALS = [
    ...BASE_MATERIALS,
    ...customMaterials
      .filter(c => !c.deleted && !baseNames.has(norm(c.name)))
      .map(c => ({name:c.name, cat:c.cat||'unknown', processed:c.processed||null, image:c.image||null, marks:c.marks||null, notes:c.notes||null}))
  ];
  KM = Object.fromEntries(KNOWN_MATERIALS.map(m => [m.name.toLowerCase(), m]));
  populateExplorerSelects();
}

// A material can participate in crafting only if it has at least one non-null edge mark.
function canCraft(name){ const m=KM[norm(name)]; return !!(m&&m.marks); }

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
let recipes         = [];   // [{id,name,codes:[{color,digits}],mat1Name,mat1Cat,mat2Name,mat2Cat,notes,addedAt}]
let nullCodes       = {};   // {"Blue 1234": {mat1,mat2}}
let tokenData       = {};   // {"wood (hardened)": [[leftColor,leftCount,rightColor,rightCount], ...]}
let customMaterials = [];   // [{name, cat}] — item-card materials added at the table
let lastUpdated     = null;
let driveFileId     = null; // ID of this group's shared Drive file
let driveToken      = null; // shared secret drive-sync.gs requires on every push; travels in the group JSON like driveFileId
let driveLastSynced = null; // ISO timestamp of last successful Drive sync
let driveSyncInFlight = false; // true while a pull/merge is being pushed back to Drive
let drivePostImport = false; // when true, push to Drive after the import modal resolves
let appUpdate       = {state:'idle', latest:null, checkedAt:null, error:null, dismissed:false};
// tokenData key is lowercase material name

// Journal sections — persistence is wired here; each section's UI arrives in its own phase.
// Every list entry carries {id, updatedAt} so imports/Drive sync can merge (union by id, newer wins).
let culture           = emptyCulture();
let behemoths         = [];   // [{id,cardId,name,lairHex,lairOverlay,lairZone:A|B|C,demeanor:1..9,secrets:[{cardId,name,description}],notes,updatedAt}] — legacy secrets are plain strings
let challengeRecord   = [];   // [{id,epoch,name,cardId,goalsCompleted,notes,updatedAt}] — flat list, grouped by epoch at render time
let loomingChallenges = [];   // [{id,name,cardId,prepareByEpoch,notes,order,updatedAt}]
let investigations    = [];   // [{id,omen,cardId,notes,updatedAt}]
let notePages         = [];   // [{id,title,body,updatedAt}]
let caveWall          = [];   // [{id,name,strokes:[{c,w,pts:[x,y,...]}],addedAt,updatedAt}] — vector drawings in a 1000×1000 space
let codexEntries      = [];   // [{id,entry,title,sourceCategory,sourceId,notes,updatedAt}] — codex entries the group has read
let provisionalCodes  = {};   // {"Blue 1111": {cardId,name,flavor,gameText,source,updatedAt}} — unverified external data

// culture.outposts: [{id,name,structures:[structure entry ids],notes,updatedAt}] —
// which known structure types are built in each physical outpost.
function emptyCulture(){
  return {tribeName:'', updatedAt:null, structures:[], mantlePowers:[], knowledgeCards:[], taboos:[], pigments:[], outposts:[]};
}

// Keys of culture that hold entry lists (merge, GC, and counting iterate these).
const CULTURE_LIST_KEYS = ['structures','mantlePowers','knowledgeCards','taboos','pigments','outposts'];

// ═══════════════════════════════════════════════════
// TOKEN DATA
// ═══════════════════════════════════════════════════
// orientation: [leftColor, leftCount, rightColor, rightCount]
// null color = null icon (count 0, must appear in last column of pair)

function importTokenData(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const raw = JSON.parse(e.target.result);
      // normalise keys to lowercase
      const normalised = {};
      for (const [k,v] of Object.entries(raw)) normalised[k.toLowerCase()] = v;
      Object.assign(tokenData, normalised);
      save();
      populateExplorerSelects(); // canBeLeft may change with new pip data
      renderTokenNotice();
      alert(`Token data loaded for: ${Object.keys(normalised).join(', ')}`);
    } catch { alert('Could not parse token data JSON.'); }
  };
  reader.readAsText(file);
}

function triggerImportTokens() {
  document.getElementById('import-tokens-file').value='';
  document.getElementById('import-tokens-file').click();
}

// ═══════════════════════════════════════════════════
// PROVISIONAL CODES (unverified external data)
// ═══════════════════════════════════════════════════
// Imported from community CSV files (Code;Flavor Text;Game Text;Item Name).
// The codes themselves are trusted, but names / card IDs / text are spoilers
// from an unverified source: the card ID is shown so the group can locate the
// physical card, everything else hides behind a Reveal toggle. Saving a recipe
// with a matching code clears the provisional entry (it's now verified).

function triggerImportCodes() {
  document.getElementById('import-codes-file').value='';
  document.getElementById('import-codes-file').click();
}

function colorFromFilename(name) {
  const m = name.match(/blue|red|yellow|purple|gr[ea]y|green|orange|silver/i);
  if (!m) return null;
  const s = m[0].toLowerCase();
  return s === 'gray' ? 'Grey' : titleCase(s);
}

async function importCodesCsv(event) {
  const files = [...event.target.files]; if (!files.length) return;
  const summary = [];
  for (const file of files) {
    let color = colorFromFilename(file.name);
    if (!color) {
      const ans = prompt(`Which pip colour is "${file.name}" for?\n(${PIP_COLORS.join(', ')})`);
      color = ans && PIP_COLORS.find(c => norm(c) === norm(ans));
      if (!color) { summary.push(`${file.name} — skipped (no pip colour)`); continue; }
    }
    try {
      summary.push(`${file.name} — ${parseCodesCsv(await file.text(), color, file.name)}`);
    } catch { summary.push(`${file.name} — could not read file`); }
  }
  save();
  refreshCraftingViews();
  alert(`Provisional codes imported:\n${summary.join('\n')}`);
}

// Parse one CSV (rows: Code;Flavor Text;Game Text;Item Name) into provisionalCodes.
// Item name "None" marks a community-reported dead-end (nothing crafted).
function parseCodesCsv(text, color, source) {
  let added = 0, updated = 0, bad = 0, deadEnds = 0;
  const strip = s => s.trim().replace(/^"(.*)"$/, '$1');
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split(';');
    const digits = parts[0].trim();
    if (!/^\d{4}$/.test(digits)) { if (!/^code$/i.test(digits)) bad++; continue; } // header row skipped silently
    if (parts.length < 4) { bad++; continue; }
    // Fixed outer fields; any embedded semicolons belong to the game text
    const flavor   = strip(parts[1]);
    const gameText = strip(parts.slice(2, -1).join(';'));
    const name     = strip(parts[parts.length-1]);
    const cardId   = (gameText.match(/\bIT\d+\b/i) || [null])[0];
    const isNothing = /^none$/i.test(name);
    const k = codeKey(color, digits);
    const prev = provisionalCodes[k];
    if (isNothing && !prev) deadEnds++;
    provisionalCodes[k] = { cardId: cardId ? cardId.toUpperCase() : null, name: isNothing ? null : name,
                            isNothing, flavor, gameText, source,
                            revealed: prev?.revealed || false, updatedAt: Date.now() };
    prev ? updated++ : added++;
  }
  return `${added} added (${added-deadEnds} items, ${deadEnds} dead-ends), ${updated} updated${bad ? `, ${bad} unparseable row(s)` : ''} (${color})`;
}

function revealProvisional(key) {
  const p = provisionalCodes[key]; if (!p) return;
  p.revealed = true; p.updatedAt = Date.now();
  save(); renderExplorer();
}

function confirmProvisional(key, mat1, mat2) {
  const p = provisionalCodes[key]; if (!p) return;
  const [color, digits] = key.split(' ');
  openModalForPair(mat1, mat2, color, digits, {
    name:   p.name   || '',
    cardId: p.cardId || '',
    notes:  p.gameText ? `[${p.source || 'unverified import'}] ${p.gameText}` : '',
  });
}

function renderTokenNotice() {
  const n = document.getElementById('token-data-notice');
  const count = Object.keys(tokenData).length;
  if (!count) {
    n.className='token-data-notice warn';
    n.textContent='No token pip data loaded. Load a token data JSON to enable automatic combination generation. Without it, only manually recorded codes will appear.';
  // } else {
  //   n.className='token-data-notice';
  //   n.textContent=`Token pip data loaded for ${count} material(s): ${Object.keys(tokenData).map(titleCase).join(', ')}`;
  }
}

// ═══════════════════════════════════════════════════
// COMBINATION ENGINE
// ═══════════════════════════════════════════════════

// Given two material names (A left, B right), compute all valid crafting codes.
// Returns [{color, digits, colCounts, rotA, rotB}] — rotA/rotB are CSS rotation degrees.
// colCounts = [Aleft, Aright, Bleft, Bright] for display.
function computeCodes(matA, matB) {
  const orientA = tokenData[matA.toLowerCase()];
  const orientB = tokenData[matB.toLowerCase()];
  if (!orientA || !orientB) return null; // no pip data

  const results = [];
  for (const [alc, alnCount, arc, arcCount, rotA=0] of orientA) {
    for (const [blc, blCount, brc, brcCount, rotB=0] of orientB) {
      // inner edges match: A-right pip type === B-left pip type
      // null inner edge not allowed (null icons can only be in last column = B-right)
      if (arc === null || blc === null) continue; // null on inner edge: invalid
      if (arc !== blc) continue; // inner edges must share pip type

      // B-right null: must be last column — that's fine, it IS the last column
      // Determine colour: pip type of leftmost column = A-left
      const color = alc; // could be null if A-left is null — but then invalid (null can't be leftmost)
      if (color === null) continue;

      const col1 = alnCount;
      const col2 = arcCount;
      const col3 = blCount;
      const col4 = brcCount ?? 0; // null icon = 0
      const digits = `${col1}${col2}${col3}${col4}`;
      results.push({color, digits, colCounts:[col1,col2,col3,col4], rotA, rotB});
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function norm(s){return s.trim().toLowerCase();}
// Tombstones: deleting keeps the entry in place as {..., deleted:true} with a
// fresh updatedAt, so the deletion syncs like any edit (newer copy wins)
// instead of resurrecting from devices that still hold the entry. Reads go
// through these filters; merge and export see the tombstones.
function live(list){return (list||[]).filter(e=>!e.deleted);}
function liveKeys(obj){return Object.keys(obj||{}).filter(k=>!obj[k]?.deleted);}
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function codeKey(color,digits){return `${color} ${digits}`;}
// One normalizer for every card/tile-ID input: trims, strips inner spaces,
// uppercases ("it13" → "IT13"), and prepends the field's prefix family when
// only digits were typed ("13" → "IT13"). See ID_PREFIXES.
function normalizeCardId(v, prefix){
  const t=(v||'').trim().replace(/\s+/g,'').toUpperCase();
  if(!t) return '';
  return (prefix&&/^\d/.test(t)) ? prefix+t : t;
}
function titleCase(s){return s.replace(/\b\w/g,c=>c.toUpperCase());}

function pipHtml(color){
  return `<span class="pip-icon ${PIP_CSS[color]||'blue'}"></span>`;
}

function appVersionLabel(v=APP_VERSION){return v==='dev'?'local/dev':v;}
function canCompareAppVersion(){return APP_VERSION && APP_VERSION !== 'dev' && APP_VERSION !== 'STAMP' && APP_VERSION !== APP_VERSION_STAMP_PLACEHOLDER;}
function readVersionStamp(data){
  if (typeof data === 'string') return data.trim();
  if (!data || typeof data !== 'object') return '';
  return String(data.version || data.stamp || data.appVersion || '').trim();
}

function appVersionStatusHtml(){
  const cls = appUpdate.state === 'available' ? ' warn' : (appUpdate.state === 'error' ? ' error' : '');
  const checking = appUpdate.state === 'checking';
  let detail = '';
  if (checking) detail = 'Checking for updates...';
  else if (appUpdate.state === 'available') detail = `New version available: <strong>${esc(appUpdate.latest)}</strong>. Reload when ready.`;
  else if (appUpdate.state === 'current') detail = 'Up to date.';
  else if (appUpdate.state === 'error') detail = `Could not check for updates${appUpdate.error ? `: ${esc(appUpdate.error)}` : '.'}`;
  else if (appUpdate.state === 'unavailable') detail = canCompareAppVersion() ? 'Update check unavailable right now.' : 'Local/dev build; no deploy stamp to compare.';

  return `<div class="app-version-box${cls}">
    <div><strong>App version:</strong> ${esc(appVersionLabel())}</div>
    ${detail ? `<div>${detail}</div>` : ''}
    <div class="app-version-actions">
      <button class="btn btn-sm" onclick="checkForAppUpdate()"${checking?' disabled':''}>${checking?'Checking...':'Check for updates'}</button>
      ${appUpdate.state === 'available' ? '<button class="btn btn-sm btn-primary" onclick="reloadForAppUpdate()">Reload</button>' : ''}
    </div>
  </div>`;
}

function renderAppUpdateStatus(){
  for (const id of ['app-version-help','app-version-drive']) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = appVersionStatusHtml();
  }

  const banner = document.getElementById('app-update-banner');
  if (!banner) return;
  const show = appUpdate.state === 'available' && !appUpdate.dismissed;
  banner.classList.toggle('hidden', !show);
  if (show) {
    banner.innerHTML = `<div><strong>New version available.</strong> You are on ${esc(appVersionLabel())}; latest is ${esc(appUpdate.latest)}.</div>
      <div class="app-update-banner-actions">
        <button class="btn btn-sm btn-primary" onclick="reloadForAppUpdate()">Reload</button>
        <button class="btn btn-sm" onclick="dismissAppUpdate()">Dismiss</button>
      </div>`;
  }
}

async function checkForAppUpdate(opts={}){
  const silent = opts.silent === true;
  appUpdate.state = 'checking';
  appUpdate.error = null;
  renderAppUpdateStatus();

  try {
    const res = await fetch('version.json', {cache:'no-store'});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const latest = readVersionStamp(await res.json());
    if (!latest) throw new Error('version.json is missing a version');

    appUpdate.latest = latest;
    appUpdate.checkedAt = new Date().toISOString();
    if (!canCompareAppVersion()) {
      appUpdate.state = 'unavailable';
      appUpdate.error = null;
    } else if (latest !== APP_VERSION) {
      appUpdate.state = 'available';
      appUpdate.dismissed = false;
    } else {
      appUpdate.state = 'current';
      appUpdate.dismissed = false;
    }
  } catch(err) {
    appUpdate.latest = null;
    appUpdate.state = silent ? 'unavailable' : 'error';
    appUpdate.error = silent ? null : err.message;
  }

  renderAppUpdateStatus();
}

function dismissAppUpdate(){
  appUpdate.dismissed = true;
  renderAppUpdateStatus();
}

function reloadForAppUpdate(){
  if (appUpdate.latest) {
    const url = new URL(location.href);
    url.searchParams.set('appv', appUpdate.latest);
    location.assign(url.toString());
  } else {
    location.reload();
  }
}

function allMatNames(){
  // Build a map keyed by lowercase to avoid duplicates between KNOWN_MATERIALS (title case)
  // and tokenData keys (lowercase) or recipe entries with inconsistent casing.
  const map=new Map();
  KNOWN_MATERIALS.forEach(m=>map.set(m.name.toLowerCase(),m.name));
  live(recipes).forEach(r=>{
    if(r.mat1Name){const n=r.mat1Name.trim();if(!map.has(n.toLowerCase()))map.set(n.toLowerCase(),n);}
    if(r.mat2Name){const n=r.mat2Name.trim();if(!map.has(n.toLowerCase()))map.set(n.toLowerCase(),n);}
  });
  Object.keys(tokenData).forEach(k=>{if(!map.has(k))map.set(k,titleCase(k));});
  return [...map.values()].sort((a,b)=>a.localeCompare(b));
}

function catFor(name){
  const k=KM[norm(name)]; if(k) return k.cat;
  for(const r of recipes){
    if(norm(r.mat1Name||'')===norm(name)) return r.mat1Cat||'unknown';
    if(norm(r.mat2Name||'')===norm(name)) return r.mat2Cat||'unknown';
  }
  return 'unknown';
}

// Return [name, processed-form] if known, else just [name]
function withVariant(name){
  const k=KM[norm(name)];
  return k&&k.processed ? [name, k.processed] : [name];
}

// ═══════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════
function switchTab(id,btn){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tabs .tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
  if(id==='workshop') switchWorkshopTab(workshopSubtab); // reopen where the crafter left off
  if(id==='mantle') switchMantleTab(mantleSubtab); // reopen where the player left off
  if(id==='cave-wall') renderCaveWall();
  if(id==='journal-group') switchJournalTab(journalSubtab); // reopen where the reader left off
}

// Crafting, Recipes, and Materials live as sub-tabs under Workshop so the
// top-level navigation stays compact.
let workshopSubtab='explorer';
const WORKSHOP_TAB_RENDER={explorer:renderTokenNotice,recipes:renderJournal,materials:renderMaterials};

function switchWorkshopTab(id){
  workshopSubtab=id;
  document.querySelectorAll('#tab-workshop .subtab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+id));
  document.querySelectorAll('#workshop-subtabs .subtab-btn').forEach(b=>b.classList.toggle('active',b.dataset.sub===id));
  (WORKSHOP_TAB_RENDER[id]||renderTokenNotice)();
}

// ═══════════════════════════════════════════════════
// MANTLE (SATCHEL)
// ═══════════════════════════════════════════════════
// Per-device material counts for the current game session. Lives in its
// own localStorage key, outside the synced save — never exported, merged,
// or pushed to Drive. Keys are norm()'d material names. Base materials
// only: custom/special items are managed differently at the table.
const MANTLE_KEY='stonesaga_mantle';
let mantleCounts=(()=>{try{return JSON.parse(localStorage.getItem(MANTLE_KEY))?.counts||{};}catch{return {};}})();

// Materials / Craftable / Unknown live as sub-tabs under Mantle, mirroring
// the Workshop and Journal sub-tab pattern.
let mantleSubtab='materials';
const MANTLE_TAB_RENDER={materials:renderMantle,craftable:renderMantleCraftable,unknown:renderMantleUnknown};

function switchMantleTab(id){
  mantleSubtab=id;
  document.querySelectorAll('#tab-mantle .subtab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-mantle-'+id));
  document.querySelectorAll('#mantle-subtabs .subtab-btn').forEach(b=>b.classList.toggle('active',b.dataset.sub===id));
  (MANTLE_TAB_RENDER[id]||renderMantle)();
}

// Re-render whichever crafting views are on screen after a recipe or
// null-code change — the Workshop explorer and/or a Mantle crafting subtab.
function refreshCraftingViews(){
  if(document.getElementById('tab-explorer').classList.contains('active')) renderExplorer();
  if(document.getElementById('tab-mantle').classList.contains('active')&&mantleSubtab!=='materials') (MANTLE_TAB_RENDER[mantleSubtab]||renderMantle)();
}

function saveMantle(){
  for(const k of Object.keys(mantleCounts)) if(!(mantleCounts[k]>0)) delete mantleCounts[k];
  try{localStorage.setItem(MANTLE_KEY,JSON.stringify({counts:mantleCounts}));}catch{/* device-local convenience only */}
}

function mantleAdd(name,delta){
  const k=norm(name);
  mantleCounts[k]=Math.max(0,(mantleCounts[k]||0)+delta);
  saveMantle();
  renderMantle();
}

function mantleProcess(name){
  const k=norm(name);
  const target=KM[k]?.processed;
  if(!target||!(mantleCounts[k]>0)) return;
  mantleCounts[k]--;
  mantleCounts[norm(target)]=(mantleCounts[norm(target)]||0)+1;
  saveMantle();
  renderMantle();
}

function mantleNewSession(){
  if(!confirm('Clear all satchel counts and start a new session?')) return;
  mantleCounts={};
  saveMantle();
  renderMantle();
}

function renderMantle(){
  const grid=document.getElementById('mantle-grid');
  if(!grid) return;
  const q=(document.getElementById('mantle-search')?.value||'').toLowerCase();
  const heldOnly=!!document.getElementById('mantle-held-only')?.checked;
  const hasHeld=Object.values(mantleCounts).some(n=>n>0);

  const list=BASE_MATERIALS
    .filter(m=>(!q||m.name.toLowerCase().includes(q))&&(!heldOnly||mantleCounts[norm(m.name)]>0))
    .sort((a,b)=>a.name.localeCompare(b.name));

  if(!list.length){
    grid.innerHTML=`<div class="empty-state"><div class="glyph">◈</div><h2>${hasHeld?'No materials found':'Satchel is empty'}</h2><p>${heldOnly?'Untick “Held only” to browse all materials and add what you acquire.':'Adjust your search, or tap + on a material as you acquire it.'}</p></div>`;
    return;
  }

  grid.innerHTML=list.map(m=>{
    const k=norm(m.name);
    const count=mantleCounts[k]||0;
    return `<div class="material-card${count>0?' mantle-held':''}">
      <div class="material-card-img-wrap">
        ${m.image
          ? `<span class="material-card-img-frame"><img src="${esc(m.image)}" alt="" class="material-card-img" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">${materialMarksPlaceholderHtml(m,'md',true)}</span>`
          : materialMarksPlaceholderHtml(m,'md')}
      </div>
      <div class="material-card-body">
        <div class="material-card-name-row"><span class="material-tag ${m.cat||'unknown'}">${esc(m.name)}</span></div>
        <div class="mantle-stepper">
          <button class="mantle-step-btn" onclick="mantleAdd('${esc(k)}',-1)"${count?'':' disabled'} aria-label="Remove one ${esc(m.name)}">−</button>
          <span class="mantle-count${count?'':' mantle-count-zero'}">${count}</span>
          <button class="mantle-step-btn" onclick="mantleAdd('${esc(k)}',1)" aria-label="Add one ${esc(m.name)}">+</button>
        </div>
        ${m.processed&&count>0?`<button class="btn btn-sm mantle-process-btn" onclick="mantleProcess('${esc(k)}')" title="Convert one ${esc(m.name)} into ${esc(m.processed)}">⚒ Process → ${esc(m.processed)}</button>`:''}
      </div>
    </div>`;
  }).join('');
}

// Unordered pairs of held materials (both counts ≥ 1; a material with itself
// needs 2 copies), using canonical KM names and oriented by the same
// left-token rule as the explorer. No variant expansion — you hold what you
// hold. A satchel is small, so fanning out across every pair stays readable.
function mantleHeldPairs(){
  const held=Object.keys(mantleCounts)
    .filter(k=>mantleCounts[k]>0)
    .map(k=>KM[k]?.name)
    .filter(n=>n&&canCraft(n))
    .sort((x,y)=>x.localeCompare(y));
  const pairs=[];
  for(let i=0;i<held.length;i++){
    for(let j=i;j<held.length;j++){
      const a=held[i],b=held[j];
      if(i===j&&mantleCounts[norm(a)]<2) continue;
      if(canBeLeft(a)) pairs.push([a,b]);
      else if(canBeLeft(b)) pairs.push([b,a]);
    }
  }
  return pairs;
}

// CRAFTABLE — known recipes whose pair is fully held. Display only: no
// craft/consume action here (decided 2026-07-19); players adjust counts on
// the Materials subtab.
function renderMantleCraftable(){
  const out=document.getElementById('mantle-craftable-out');
  if(!out) return;
  const pairs=mantleHeldPairs();
  const items=[];
  for(const r of live(recipes)){
    const matched=pairs.filter(([a,b])=>recipeUsesPair(r,a,b));
    if(matched.length) items.push({r,matched});
  }
  items.sort((x,y)=>x.r.name.localeCompare(y.r.name));
  if(!items.length){
    out.innerHTML=`<div class="empty-state"><div class="glyph">◈</div><h2>Nothing craftable from your satchel yet</h2><p>Add the materials you hold on the Materials subtab — known items you can make appear here.</p></div>`;
    return;
  }
  out.innerHTML=items.map(({r,matched})=>{
    const pairHtml=matched.map(([a,b])=>
      `<div class="recipe-materials">
        <span class="material-tag ${catFor(a)}">${esc(a)}</span>
        <span style="color:var(--flint)">+</span>
        <span class="material-tag ${catFor(b)}">${esc(b)}</span>
      </div>`).join('');
    return `<div class="recipe-card">
      <div class="recipe-card-header">
        <div class="recipe-name">${esc(r.name)}</div>
        ${r.id?`<div class="item-number">${esc(r.id)}</div>`:''}
      </div>
      ${pairHtml}
      ${r.notes?`<div class="recipe-notes">${esc(r.notes)}</div>`:''}
    </div>`;
  }).join('');
}

// UNKNOWN — untried combinations from the satchel, behaving exactly like the
// Workshop explorer's Unknown view (same combo cards, Record discovery and
// Nothing actions). Record discovery routes through mantleRecordDiscovery so
// a saved discovery spends the satchel materials.
function renderMantleUnknown(){
  const out=document.getElementById('mantle-unknown-out');
  if(!out) return;
  const notice=document.getElementById('mantle-token-notice');
  if(notice){
    notice.className=Object.keys(tokenData).length?'':'token-data-notice warn';
    notice.textContent=Object.keys(tokenData).length?'':'No token pip data loaded. Load a token data JSON (Workshop → Crafting) to see computed codes; without it, codes must be entered manually.';
  }
  const pairs=mantleHeldPairs();
  if(!pairs.length){
    out.innerHTML=`<div class="empty-state"><div class="glyph">◈</div><h2>Satchel is empty</h2><p>Add the materials you hold on the Materials subtab — untried combinations appear here.</p></div>`;
    return;
  }
  const liveRecipes=live(recipes);
  const codeOwner={};
  for(const r of liveRecipes) for(const c of (r.codes||[])) codeOwner[codeKey(c.color,c.digits)]=r;
  let html='';
  for(const [a,b] of pairs) html+=comboSectionHtml(a,b,'unknown',liveRecipes,codeOwner,'mantleRecordDiscovery');
  out.innerHTML=html||`<div class="empty-state"><div class="glyph">◈</div><h2>No untried combinations</h2><p>Every combination of your held materials is already discovered or marked as nothing.</p></div>`;
}

// Discovery consumption — the only place satchel counts are spent
// automatically. Saving a discovery started from the Unknown subtab removes
// one of each pair material (two copies of the same material for a
// self-pair), keyed off the pair card tapped, not the modal's editable
// fields. Recording Nothing never consumes: the game usually returns the
// materials on a failed attempt (decided 2026-07-19).
let mantlePendingConsume=null; // {a,b} armed while the record modal is open for a satchel pair

function mantleRecordDiscovery(a,b,color,digits){
  mantlePendingConsume={a,b};
  openModalForPair(a,b,color,digits);
}

function mantleConsumePair(a,b){
  for(const k of [norm(a),norm(b)]) mantleCounts[k]=Math.max(0,(mantleCounts[k]||0)-1);
  saveMantle();
}

// Culture / Behemoths / Challenges / Looming / Investigations / Notes live as
// sub-tabs under the Journal parent tab to keep the top-level tab row phone-sized.
let journalSubtab='culture';
const JOURNAL_TAB_RENDER={culture:renderCulture,behemoths:renderBehemoths,challenges:renderChallenges,looming:renderChallenges,investigations:renderInvestigations,codex:renderCodexEntries,notes:renderNotes};
const BEHEMOTH_DEMEANOR_MIN = 1;
const BEHEMOTH_DEMEANOR_DEFAULT = 4;
const BEHEMOTH_DEMEANOR_MAX = 9;
const BEHEMOTH_DEMEANOR_COLORS = ['#547f46','#689240','#7aa53d','#afab3d','#cab344','#d9a042','#d8843e','#cf653d','#c04a4a'];

function switchJournalTab(id){
  journalSubtab=id;
  document.querySelectorAll('#tab-journal-group .subtab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+id));
  document.querySelectorAll('#journal-subtabs .subtab-btn').forEach(b=>b.classList.toggle('active',b.dataset.sub===id));
  (JOURNAL_TAB_RENDER[id]||renderCulture)();
}

// ═══════════════════════════════════════════════════
// HEADER MENU (import/export actions, collapsed on phones)
// ═══════════════════════════════════════════════════
function toggleHeaderMenu(){
  document.getElementById('header-menu-panel').classList.toggle('open');
}
document.addEventListener('click',e=>{
  const panel=document.getElementById('header-menu-panel');
  if(panel&&panel.classList.contains('open')&&!e.target.closest('#header-menu-toggle'))
    panel.classList.remove('open'); // any click — including a menu action — closes it
});

// ═══════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════
function updateStats(){
  document.getElementById('stat-total').textContent=live(recipes).length;
  document.getElementById('stat-nothing').textContent=liveKeys(nullCodes).length;
}

// ═══════════════════════════════════════════════════
// UNDO TOAST + RECENTLY DELETED
// ═══════════════════════════════════════════════════
// Deletes are soft (tombstones), so they're reversible: each delete shows a
// brief Undo toast, and each tab lists its tombstones under "Recently
// deleted" until the 90-day GC clears them.
let undoToastTimer=null, undoToastFn=null;

function showUndoToast(msg, undoFn){
  document.getElementById('undo-toast-msg').textContent=msg;
  document.getElementById('undo-toast').classList.remove('hidden');
  undoToastFn=undoFn;
  clearTimeout(undoToastTimer);
  undoToastTimer=setTimeout(hideUndoToast, 6000);
}
function hideUndoToast(){
  document.getElementById('undo-toast').classList.add('hidden');
  undoToastFn=null; clearTimeout(undoToastTimer);
}
function undoToastAction(){
  const f=undoToastFn; hideUndoToast(); if(f) f();
}

// "Recently deleted" disclosure appended to a tab's list. items: [{label, restore}]
// where restore is an onclick expression. Spans full width inside grids.
function recentlyDeletedHtml(items){
  if(!items.length) return '';
  return `<details class="recently-deleted" style="grid-column:1/-1">
    <summary>Recently deleted (${items.length})</summary>
    <div class="recently-deleted-list">${items.map(i=>
      `<div class="recently-deleted-row"><span>${i.label}</span><button class="btn btn-sm" onclick="${i.restore}">Restore</button></div>`).join('')}</div>
  </details>`;
}

// ═══════════════════════════════════════════════════
// JOURNAL
// ═══════════════════════════════════════════════════
let matFilterTags=[];

function renderJournal(){
  updateStats();
  const hasFilter=document.getElementById('search').value.trim()||matFilterTags.length;
  document.getElementById('clear-btn').style.display=hasFilter?'block':'none';
  const q=document.getElementById('search').value.toLowerCase();
  const andM=document.getElementById('filter-mode-and').checked;
  const all=live(recipes);
  const list=all.filter(r=>{
    if(matFilterTags.length){
      const mats=pairsOf(r).flatMap(p=>[norm(p.mat1Name||''),norm(p.mat2Name||'')]);
      // Expand each filter tag to include its processed variant:
      // filtering by "Wood" also matches recipes using "Wood (hardened)"
      const tagMatches=t=>withVariant(t).map(norm).some(v=>mats.includes(v));
      if(andM){if(!matFilterTags.every(tagMatches)) return false;}
      else{if(!matFilterTags.some(tagMatches)) return false;}
    }
    if(q){
      const codes=(r.codes||[]).map(c=>`${c.color} ${c.digits}`).join(' ');
      const matNames=pairsOf(r).flatMap(p=>[p.mat1Name,p.mat2Name]).join(' ');
      if(![r.name,r.id,codes,matNames,r.notes].join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a,b)=>(a.name||'').localeCompare(b.name||''));

  const grid=document.getElementById('recipe-grid');
  const deletedBlock=recentlyDeletedHtml(recipes.filter(r=>r.deleted).map(r=>
    ({label:`${esc(r.name)} <span style="color:var(--flint);font-size:.8rem">${esc(r.id)}</span>`, restore:`restoreRecipe('${esc(r.id)}')`})));
  if(!list.length){
    grid.innerHTML=`<div class="empty-state"><div class="glyph">◈</div><h2>${all.length?'No matching recipes':'No recipes recorded yet'}</h2><p>${all.length?'Adjust filters.':'Discover a combination and record it here.'}</p></div>`+deletedBlock;
    return;
  }
  grid.innerHTML=list.map(r=>{
    const chips=(r.codes||[]).map(c=>`<span class="recipe-code">${pipHtml(c.color)} ${esc(c.color)} ${esc(c.digits)}</span>`).join('');
    const altPairs=(r.altPairs||[]).map((p,i)=>({p,i}));
    const alsoPairs=altPairs.filter(x=>!x.p.inferred);
    const inferredPairs=altPairs.filter(x=>x.p.inferred);
    const altPairRows=(items,cls)=>items.map(({p,i})=>`<div class="recipe-materials recipe-materials-alt ${cls}">
        <span class="material-tag ${p.mat1Cat||'unknown'}" title="${esc(p.mat1Name||'?')}">${esc(p.mat1Name||'?')}</span>
        <span class="alt-pair-plus">+</span>
        <span class="material-tag ${p.mat2Cat||'unknown'}" title="${esc(p.mat2Name||'?')}">${esc(p.mat2Name||'?')}</span>
        <button class="alt-pair-remove" onclick="removeAltPair('${r.id}',${i})" title="Remove this combination">×</button>
      </div>`).join('');
    const altPairGroup=(label,items,cls)=>items.length
      ? `<div class="alt-pair-group-title">${label}</div>${altPairRows(items,cls)}`
      : '';
    return `<div class="recipe-card">
      <div class="recipe-card-header">
        <div class="recipe-name">${esc(r.name)}</div>
        ${r.id?`<div class="item-number">${esc(r.id)}</div>`:''}
      </div>
      <div class="recipe-materials">
        <span class="material-tag ${r.mat1Cat||'unknown'}">${esc(r.mat1Name||'?')}</span>
        <span style="color:var(--flint)">+</span>
        <span class="material-tag ${r.mat2Cat||'unknown'}">${esc(r.mat2Name||'?')}</span>
      </div>
      ${altPairGroup('Also crafts with',alsoPairs,'')}
      ${altPairGroup('Inferred pairings',inferredPairs,'is-inferred')}
      <div class="code-chips">${chips||'<span style="color:var(--flint);font-size:.8rem">No codes recorded</span>'}</div>
      ${r.notes?`<div class="recipe-notes">${esc(r.notes)}</div>`:''}
      <div class="card-actions">
        <button class="btn btn-sm" onclick="editRecipe('${r.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteRecipe('${r.id}')">Delete</button>
      </div>
    </div>`;
  }).join('')+deletedBlock;
}

// journal material filter
function renderMatTags(){
  document.getElementById('mat-filter-tags').innerHTML=matFilterTags.map((t,i)=>
    `<span class="mat-filter-tag">${esc(t)}<button onclick="removeMatTag(${i})">×</button></span>`).join('');
}
function addMatTag(name){
  const n=name.trim();
  if(!n||matFilterTags.map(norm).includes(norm(n))) return;
  matFilterTags.push(n); renderMatTags(); renderJournal();
  document.getElementById('mat-filter-input').value='';
  hideAc('mat-autocomplete');
}
function removeMatTag(i){matFilterTags.splice(i,1);renderMatTags();renderJournal();}
function onMatFilterInput(){
  showAcDropdown('mat-autocomplete', document.getElementById('mat-filter-input').value, matFilterTags,
    n=>`addMatTag('${esc(n)}')`);
}
function onMatFilterKey(e){
  acKeyNav(e,'mat-autocomplete',
    idx=>{
      const items=document.querySelectorAll('#mat-autocomplete .mat-autocomplete-item');
      if(idx>=0&&items[idx]) addMatTag(items[idx].dataset.name);
      else addMatTag(document.getElementById('mat-filter-input').value);
    });
  if(e.key==='Backspace'&&!document.getElementById('mat-filter-input').value&&matFilterTags.length)
    removeMatTag(matFilterTags.length-1);
}

// ═══════════════════════════════════════════════════
// EXPLORER
// ═══════════════════════════════════════════════════
let explorerFilter='all'; // 'all' | 'known' | 'unknown'
function setExplorerFilter(val,btn){
  explorerFilter=val;
  document.querySelectorAll('.explorer-filter-btn').forEach(b=>b.classList.toggle('active',b===btn));
  renderExplorer();
}

function clearExplorer(){
  document.getElementById('ex-mat1').value='';
  document.getElementById('ex-mat2').value='';
  document.getElementById('explorer-output').innerHTML='';
}

// A material can be Material A (left token) only if some orientation has a non-null
// inner (right) edge: the code colour comes from the leftmost column and inner edges
// must share a pip type, so a null can never sit on the inside. Materials like
// Feather or Tooth (drilled) only ever expose a null inner edge — right slot only.
function canBeLeft(name){
  const key=norm(name);
  const orients=tokenData[key]||marksToOrientations(KM[key]?.marks);
  return (orients||[]).some(o=>o[2]!=null);
}

// Fill both Explorer selects with craftable materials, grouped by category.
// Right-slot-only materials (e.g. Feather) are included in Material A too —
// renderExplorer flips them to the right side. Called from rebuildMaterials()
// so custom materials appear automatically.
function populateExplorerSelects(){
  const s1=document.getElementById('ex-mat1'), s2=document.getElementById('ex-mat2');
  if(!s1||!s2) return;
  const optsFor=names=>{
    const groups={};
    for(const n of names)(groups[KM[norm(n)]?.cat||'unknown']??=[]).push(n);
    const catOrder=['animal','mineral','plant','rare'];
    const cats=[...catOrder.filter(c=>groups[c]),...Object.keys(groups).filter(c=>!catOrder.includes(c)).sort()];
    return cats.map(c=>
      `<optgroup label="${esc(titleCase(c))}">${groups[c].sort((a,b)=>a.localeCompare(b)).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</optgroup>`
    ).join('');
  };
  const craftable=KNOWN_MATERIALS.filter(m=>canCraft(m.name)).map(m=>m.name);
  const v1=s1.value, v2=s2.value; // keep current picks if still valid
  s1.innerHTML='<option value="">— choose material —</option>'+optsFor(craftable);
  s2.innerHTML='<option value="">All materials</option>'+optsFor(craftable);
  s1.value=v1; s2.value=v2;
}

function renderExplorer(){
  const mat1=document.getElementById('ex-mat1').value.trim();
  const mat2=document.getElementById('ex-mat2').value.trim();
  const out=document.getElementById('explorer-output');
  if(!mat1){out.innerHTML='<p style="color:var(--flint);font-style:italic">Choose Material A to see combinations.</p>';return;}

  // Expand each input to include unprocessed/processed variant,
  // then filter to only materials that actually have pip marks.
  const aSet=[...new Set(withVariant(mat1).filter(canCraft))];
  if(!aSet.length){
    out.innerHTML='<p style="color:var(--flint);font-style:italic">That material has no pip marks and cannot be used in crafting combinations.</p>';
    return;
  }
  const bSet=mat2
    ? [...new Set(withVariant(mat2).filter(canCraft))]
    : allMatNames().filter(canCraft);

  // Build ordered pairs, including a material with itself — the table can hold
  // two tokens of the same material, and independent rotations yield valid codes.
  // The left token needs a non-null inner edge (canBeLeft); a right-slot-only
  // Material A (e.g. Feather) is flipped to the right of each valid partner,
  // so "what combines with a Feather?" still fans out across the catalogue.
  const seen=new Set();
  const pairs=[];
  const addPair=(l,r)=>{
    const key=`${norm(l)}|${norm(r)}`;
    if(!seen.has(key)){seen.add(key);pairs.push([l,r]);}
  };
  for(const a of aSet){
    for(const b of bSet){
      if(canBeLeft(a)) addPair(a,b);
      else if(canBeLeft(b)) addPair(b,a);
    }
  }

  if(!pairs.length){out.innerHTML='<p style="color:var(--flint);font-style:italic">No valid pairings found.</p>';return;}

  // Code → owning recipe, for inferring results on pairs that share a recorded code
  const liveRecipes=live(recipes);
  const codeOwner={};
  for(const r of liveRecipes) for(const c of (r.codes||[])) codeOwner[codeKey(c.color,c.digits)]=r;

  let html='';
  for(const [a,b] of pairs) html+=comboSectionHtml(a,b,explorerFilter,liveRecipes,codeOwner,'openModalForPair');
  out.innerHTML=html;
}

// One material pair's combo section — shared by the Workshop explorer and the
// Mantle Unknown subtab. filter: 'all' | 'known' | 'unknown'. recordFn: name
// of the global function wired into the Record discovery buttons (the Mantle
// variant arms satchel consumption before opening the same modal). Returns ''
// when the filter or content rules skip the pair.
function comboSectionHtml(a,b,filter,liveRecipes,codeOwner,recordFn){
  const computedCodes=computeCodes(a,b); // null if no token data for either
  // Apply filter before building HTML
  const hasKnown=liveRecipes.some(r=>recipeUsesPair(r,a,b));
  if(filter==='known'&&!hasKnown) return '';
  if(filter==='unknown'&&hasKnown) return '';
  const hasTokenData=computedCodes!==null;

  // Recipes crafted with this pair (primary or alternate; order-insensitive)
  const matchingRecipes=liveRecipes.filter(r=>recipeUsesPair(r,a,b));
  const discoveredKeys=new Set(matchingRecipes.flatMap(r=>(r.codes||[]).map(c=>codeKey(c.color,c.digits))));

  // Null codes for this pair (order-insensitive)
  const nullForPair=Object.entries(nullCodes)
    .filter(([,v])=>{
      if(!v||v.deleted||!v.mat1||!v.mat2) return false;
      const m1=norm(v.mat1),m2=norm(v.mat2);
      return (m1===norm(a)&&m2===norm(b))||(m1===norm(b)&&m2===norm(a));
    })
    .map(([k])=>k)
    .filter(k=>!discoveredKeys.has(k));

  // Computed codes not yet discovered or marked nothing
  const nullKeySet=new Set(nullForPair);
  const unknownComputed=hasTokenData
    ? computedCodes.filter(c=>{const k=codeKey(c.color,c.digits);return!discoveredKeys.has(k)&&!nullKeySet.has(k);})
    : [];

  // Skip section entirely when all computed codes are accounted for and nothing to show
  const showNothing=filter!=='known';
  const hasContent=matchingRecipes.length||(showNothing&&(nullForPair.length||unknownComputed.length||!hasTokenData));
  if(!hasContent) return '';

  const catA=catFor(a),catB=catFor(b);
  let sec=`<div class="combo-section">
      <div class="combo-section-header">
        <div class="combo-header-mat"><span class="material-tag ${catA}">${esc(a)}</span></div>
        <span class="combo-header-sep">×</span>
        <div class="combo-header-mat"><span class="material-tag ${catB}">${esc(b)}</span></div>
      </div>
      <div class="combo-grid">`;

    // Discovered
    for(const r of matchingRecipes){
      const rcodes=r.codes||[];
      const chips=rcodes.map(c=>`<span class="recipe-code" style="font-size:.75rem">${pipHtml(c.color)} ${esc(c.color)} ${esc(c.digits)}</span>`).join(' ');
      let rotA=0,rotB=0;
      if(rcodes.length&&computedCodes){
        let found=false;
        for(const c of rcodes){
          const m=computedCodes.find(x=>x.color===c.color&&x.digits===c.digits);
          if(m){rotA=m.rotA;rotB=m.rotB;found=true;break;}
        }
        if(!found) continue; // no code on this recipe matches this material ordering — skip
      }
      sec+=`<div class="combo-card state-discovered">
        ${tokenPairHtml(a,rotA,b,rotB)}
        <div class="combo-item-name">${esc(r.name)}</div>
        ${r.id?`<div class="combo-item-num">${esc(r.id)}</div>`:''}
        <div>${chips}</div>
        <div class="combo-actions"><button class="btn btn-sm" onclick="editRecipe('${r.id}')">Edit</button></div>
      </div>`;
    }

    // Null (tried, nothing)
    if(showNothing) for(const k of nullForPair){
      const [color]=k.split(' ');
      sec+=`<div class="combo-card state-nothing">
        <div class="combo-header">
          <div class="combo-code-display">${pipHtml(color)} ${esc(k)}</div>
          <span class="status-badge nothing">Nothing</span>
        </div>
        <div style="font-size:.8rem;color:var(--flint);font-style:italic">No item crafted with this code</div>
        <div class="combo-actions">
          <button class="btn btn-sm" onclick="openStatusModal(null,'${esc(a)}','${esc(b)}','${esc(k)}')">Change</button>
        </div>
      </div>`;
    }

    // Unknown computed codes (provisional entries from imported CSVs render richer cards)
    if(showNothing) for(const c of unknownComputed){
      const k=codeKey(c.color,c.digits);
      // Code already recorded on a recipe for a different pair — the codex maps
      // code → result, so this combination must craft the same item.
      const owner=codeOwner[k];
      if(owner){
        sec+=`<div class="combo-card state-inferred">
          ${tokenPairHtml(a,c.rotA,b,c.rotB)}
          <div class="combo-header">
            <div class="combo-code-display">${pipHtml(c.color)} ${esc(c.color)} ${esc(c.digits)}</div>
            <span class="status-badge inferred">Inferred</span>
          </div>
          <div class="combo-item-name">${esc(owner.name)}</div>
          ${owner.id?`<div class="combo-item-num">${esc(owner.id)}</div>`:''}
          <div style="font-size:.8rem;color:var(--flint)">Same code recorded for this item — this combination should craft it too.</div>
          <div class="combo-actions">
            <button class="btn btn-sm btn-primary" onclick="attachInferred('${esc(k)}','${esc(a)}','${esc(b)}')">Add to recipe</button>
            <button class="btn btn-sm" onclick="openStatusModal(null,'${esc(a)}','${esc(b)}','${esc(k)}',true)">Nothing</button>
          </div>
        </div>`;
        continue;
      }
      const p=provisionalCodes[k];
      if(p&&!p.deleted){
        const spoiler=p.revealed
          ? `${p.name?`<div class="combo-item-name">${esc(p.name)}</div>`:''}
             ${p.flavor?`<div class="prov-flavor">${esc(p.flavor)}</div>`:''}
             ${p.gameText&&!p.isNothing?`<div class="prov-gametext">${esc(p.gameText)}</div>`:''}`
          : `<div><button class="btn btn-sm" onclick="revealProvisional('${esc(k)}')">${p.isNothing?'Reveal hint':'Reveal spoiler'}</button></div>`;
        const subtitle=p.isNothing
          ? `<div class="combo-item-num">Reported as nothing crafted — the hint may point at the right recipe</div>`
          : (p.cardId?`<div class="combo-item-num">${esc(p.cardId)} — locate this card, then confirm</div>`:'');
        const confirmBtn=p.isNothing?'' :
          `<button class="btn btn-sm btn-primary" onclick="confirmProvisional('${esc(k)}','${esc(a)}','${esc(b)}')">Confirm</button>`;
        sec+=`<div class="combo-card state-provisional">
          ${tokenPairHtml(a,c.rotA,b,c.rotB)}
          <div class="combo-header">
            <div class="combo-code-display">${pipHtml(c.color)} ${esc(c.color)} ${esc(c.digits)}</div>
            <span class="status-badge provisional">Unverified</span>
          </div>
          ${subtitle}
          ${spoiler}
          <div class="prov-source">Source: ${esc(p.source||'unknown')}</div>
          <div class="combo-actions">
            ${confirmBtn}
            <button class="btn btn-sm" onclick="openStatusModal(null,'${esc(a)}','${esc(b)}','${esc(k)}',true)">Nothing</button>
          </div>
        </div>`;
        continue;
      }
      sec+=`<div class="combo-card">
        ${tokenPairHtml(a,c.rotA,b,c.rotB)}
        <div class="combo-header">
          <div class="combo-code-display">${pipHtml(c.color)} ${esc(c.color)} ${esc(c.digits)}</div>
          <span class="status-badge unknown">Unknown</span>
        </div>
        <div class="combo-actions">
          <button class="btn btn-sm btn-primary" onclick="${recordFn}('${esc(a)}','${esc(b)}','${esc(c.color)}','${esc(c.digits)}')">Record discovery</button>
          <button class="btn btn-sm" onclick="openStatusModal(null,'${esc(a)}','${esc(b)}','${esc(k)}',true)">Nothing</button>
        </div>
      </div>`;
    }

    // No pip data: generic unknown card
    if(showNothing&&!hasTokenData){
      sec+=`<div class="combo-card">
        <div class="combo-header"><span class="status-badge unknown">Unknown</span></div>
        <div style="font-size:.8rem;color:var(--flint);font-style:italic;margin-bottom:.4rem">No pip data — enter codes manually</div>
        <div class="combo-actions">
          <button class="btn btn-sm btn-primary" onclick="${recordFn}('${esc(a)}','${esc(b)}')">Record discovery</button>
          <button class="btn btn-sm" onclick="openStatusModal(null,'${esc(a)}','${esc(b)}')">Mark tried — nothing</button>
        </div>
      </div>`;
    }

  sec+=`</div></div>`;
  return sec;
}

// ═══════════════════════════════════════════════════
// CODE SHORTHAND PARSER
// ═══════════════════════════════════════════════════
const PIP_ABBREV = {B:'Blue',R:'Red',Y:'Yellow',P:'Purple',G:'Grey',GN:'Green',O:'Orange',S:'Silver'};

// Parse a string like "B2132, R4210  Y0031" into [{color,digits}, ...]
// Returns {codes, errors}
function parseCodeString(str) {
  const codes = [];
  const errors = [];
  // Split on commas and/or whitespace, filter empty
  const tokens = str.toUpperCase().split(/[\s,]+/).filter(Boolean);
  for (const tok of tokens) {
    const m = tok.match(/^(GN|[BRYPOGS])(\d{4})$/);
    if (!m) { errors.push(tok); continue; }
    const color = PIP_ABBREV[m[1]];
    if (!color) { errors.push(tok); continue; }
    codes.push({ color, digits: m[2] });
  }
  return { codes, errors };
}

// ═══════════════════════════════════════════════════
// STATUS MODAL
// ═══════════════════════════════════════════════════
let smState = {};

function openStatusModal(unused, mat1, mat2, existingKey, directNothing) {
  smState = { mat1, mat2 };
  document.getElementById('sm-title').textContent = 'Mark Tried — Nothing';
  document.getElementById('sm-body').textContent  = `Materials: ${mat1} + ${mat2}`;
  document.getElementById('sm-code-input').value  = existingKey || '';

  // Show existing null codes for this pair with remove buttons
  const existing = Object.entries(nullCodes)
    .filter(([,v]) => v && !v.deleted &&
                      (norm(v.mat1||'') === norm(mat1) && norm(v.mat2||'') === norm(mat2) ||
                       norm(v.mat1||'') === norm(mat2) && norm(v.mat2||'') === norm(mat1)))
    .map(([k]) => k);
  const el = document.getElementById('sm-existing');
  if (existing.length) {
    el.innerHTML = `<div style="font-size:.78rem;color:var(--flint);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.1em">Already marked for this pair</div>` +
      `<div style="display:flex;flex-wrap:wrap;gap:.4rem">` +
      existing.map(k => {
        const [color] = k.split(' ');
        return `<span class="recipe-code" style="font-size:.75rem">${pipHtml(color)} ${esc(k)}
          <button onclick="removeNullCode('${esc(k)}')" style="background:none;border:none;color:var(--pip-red);cursor:pointer;margin-left:.3rem;font-size:.9rem">×</button>
        </span>`;
      }).join('') + `</div>`;
  } else {
    el.innerHTML = '';
  }

  document.getElementById('status-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('sm-code-input').focus(), 50);

  if (directNothing && existingKey) {
    // immediate save when clicking Nothing on a known computed code
    nullCodes[existingKey] = { mat1, mat2, updatedAt: Date.now() };
    save(); updateStats(); refreshCraftingViews();
    document.getElementById('status-overlay').classList.add('hidden');
  }
}

function removeNullCode(key) {
  const v = nullCodes[key];
  if (v) nullCodes[key] = { ...v, deleted: true, updatedAt: Date.now() };
  save(); updateStats();
  // re-render the existing list in-place
  openStatusModal(null, smState.mat1, smState.mat2);
  refreshCraftingViews();
}

function setCodeStatus(status) {
  const raw = document.getElementById('sm-code-input').value.trim();
  if (status === 'nothing') {
    if (!raw) { alert('Enter a code.'); return; }
    const { codes, errors } = parseCodeString(raw);
    if (errors.length || codes.length !== 1) {
      alert(`Enter a single code, e.g. B2132.\n\nCould not parse: ${raw}`);
      return;
    }
    const c = codes[0];
    nullCodes[codeKey(c.color, c.digits)] = { mat1: smState.mat1, mat2: smState.mat2, updatedAt: Date.now() };
  }
  save(); updateStats();
  refreshCraftingViews();
  closeStatusModal();
}

function closeStatusModal() { document.getElementById('status-overlay').classList.add('hidden'); }

// ═══════════════════════════════════════════════════
// RECIPE MODAL
// ═══════════════════════════════════════════════════
let editingId=null;
let pendingCodes=[];

function renderCodeList(){
  const el=document.getElementById('f-code-list');
  if(!pendingCodes.length){el.innerHTML='<div style="font-size:.8rem;color:var(--flint);font-style:italic;padding:.2rem 0">No codes added yet</div>';return;}
  el.innerHTML=pendingCodes.map((c,i)=>
    `<div class="code-entry">
      <span class="pip-icon ${PIP_CSS[c.color]||'blue'}"></span>
      <span class="code-digits">${esc(c.color)} ${esc(c.digits)}</span>
      <button class="btn btn-danger btn-sm" onclick="removeCode(${i})">×</button>
    </div>`).join('');
}
function addCodes(){
  const raw=document.getElementById('new-code-input').value.trim();
  if(!raw) return;
  const {codes,errors}=parseCodeString(raw);
  if(errors.length){alert(`Could not parse: ${errors.join(', ')}\n\nUse format like B2132 or R4210.`);return;}
  const conflicts=[];
  codes.forEach(c=>{
    const key=codeKey(c.color,c.digits);
    // Check against all other recipes (exclude the one currently being edited)
    const clash=recipes.find(r=>r.id!==editingId&&!r.deleted&&(r.codes||[]).some(x=>codeKey(x.color,x.digits)===key));
    if(clash){ conflicts.push(`${key} is already recorded for "${clash.name}"`); return; }
    if(!pendingCodes.some(x=>x.color===c.color&&x.digits===c.digits)) pendingCodes.push(c);
  });
  if(conflicts.length) alert(`Code conflict:\n${conflicts.join('\n')}\n\nA code can only belong to one item.`);
  document.getElementById('new-code-input').value='';
  renderCodeList();
}
function removeCode(i){pendingCodes.splice(i,1);renderCodeList();}

function openModal(id){
  editingId=id||null;
  document.getElementById('modal-title').textContent=id?'Edit Recipe':'Record Recipe';
  if(id){
    const r=recipes.find(x=>x.id===id); if(!r) return;
    pendingCodes=[...(r.codes||[])];
    document.getElementById('f-name').value=r.name||'';
    document.getElementById('f-item-num').value=r.id||'';
    document.getElementById('f-mat1-name').value=r.mat1Name||'';
    document.getElementById('f-mat2-name').value=r.mat2Name||'';
    document.getElementById('f-notes').value=r.notes||'';
  } else {
    pendingCodes=[];
    ['f-name','f-item-num','f-mat1-name','f-mat2-name','f-notes','new-code-input'].forEach(i=>document.getElementById(i).value='');
  }
  renderCodeList();
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('f-name').focus();
}

let pickState={};

// All material pairs that craft this recipe: the primary pair plus any alternates.
// A recipe gains altPairs when the same code is discovered via a different combination.
function pairsOf(r){
  return [
    {mat1Name:r.mat1Name||'', mat1Cat:r.mat1Cat, mat2Name:r.mat2Name||'', mat2Cat:r.mat2Cat},
    ...(r.altPairs||[]),
  ];
}

function recipeUsesPair(r,a,b){
  return pairsOf(r).some(p=>{
    const m1=norm(p.mat1Name||''),m2=norm(p.mat2Name||'');
    return (m1===norm(a)&&m2===norm(b))||(m1===norm(b)&&m2===norm(a));
  });
}

// Attach mat1+mat2 as an alternate combination on recipe r. `inferred` marks pairs
// deduced from pip equivalence rather than crafted at the table. Returns false if
// the recipe already uses the pair (order-insensitive).
function attachPairToRecipe(r,mat1,mat2,inferred){
  if(recipeUsesPair(r,mat1,mat2)) return false;
  const p={
    mat1Name:mat1, mat1Cat:KM[norm(mat1)]?.cat||'unknown',
    mat2Name:mat2, mat2Cat:KM[norm(mat2)]?.cat||'unknown',
  };
  if(inferred) p.inferred=true;
  (r.altPairs??=[]).push(p);
  r.updatedAt=Date.now(); // attached pairs must survive sync merges
  return true;
}

// The prefill code already belongs to another recipe: offer to record mat1+mat2 as an
// additional material combination on it. Returns true when handled (added or already known).
function offerPairToClashingRecipe(clash,mat1,mat2,key){
  if(recipeUsesPair(clash,mat1,mat2)){
    alert(`${key} is already recorded for "${clash.name}" with ${mat1} + ${mat2}.`);
    return true;
  }
  if(!confirm(`${key} is already recorded for "${clash.name}" (${clash.mat1Name||'?'} + ${clash.mat2Name||'?'}).\n\nAdd ${mat1} + ${mat2} as another material combination for "${clash.name}"?`)) return false;
  attachPairToRecipe(clash,mat1,mat2);
  save(); renderJournal();
  refreshCraftingViews();
  return true;
}

// One-tap attach from an Explorer "Inferred" card: the code is already recorded on a
// recipe, so this pair must craft the same item (the codex maps code → result).
function attachInferred(key,mat1,mat2){
  const owner=recipes.find(r=>!r.deleted&&(r.codes||[]).some(c=>codeKey(c.color,c.digits)===key));
  if(!owner||!attachPairToRecipe(owner,mat1,mat2,true)) return;
  save(); renderJournal(); renderExplorer();
}

// Bulk sweep: for every recorded code, find every material pair whose pip alignment
// produces that code and attach the missing ones as inferred alternate combinations.
function inferCombinations(){
  const mats=allMatNames().filter(canCraft);
  const codeToPairs={};
  for(const a of mats){
    if(!canBeLeft(a)) continue;
    for(const b of mats){
      const cc=computeCodes(a,b); if(!cc) continue;
      for(const c of cc)(codeToPairs[codeKey(c.color,c.digits)]??=[]).push([a,b]);
    }
  }
  let added=0; const touched=new Set();
  for(const r of live(recipes)){
    for(const c of (r.codes||[])){
      for(const [a,b] of (codeToPairs[codeKey(c.color,c.digits)]||[])){
        if(attachPairToRecipe(r,a,b,true)){added++;touched.add(r.name);}
      }
    }
  }
  if(added){
    save(); renderJournal();
    refreshCraftingViews();
  }
  alert(added
    ? `Inferred ${added} additional combination(s) across ${touched.size} recipe(s). They're marked "inferred" on the recipe cards until crafted at the table.`
    : 'No new combinations could be inferred from the recorded codes.');
}

function removeAltPair(id,i){
  const r=recipes.find(x=>x.id===id);
  const p=r?.altPairs?.[i]; if(!p) return;
  r.altPairs.splice(i,1);
  r.updatedAt=Date.now(); // removal wins merges against copies that still have the pair
  save(); renderJournal();
  refreshCraftingViews();
  showUndoToast(`Removed ${p.mat1Name} + ${p.mat2Name} from "${r.name}"`,()=>{
    r.altPairs.splice(Math.min(i,r.altPairs.length),0,p);
    r.updatedAt=Date.now();
    save(); renderJournal();
    refreshCraftingViews();
  });
}

// extra = optional {name, cardId, notes} prefill for a new recipe (used by provisional Confirm)
function openModalForPair(mat1,mat2,prefillColor,prefillDigits,extra){
  const existing=live(recipes).filter(r=>recipeUsesPair(r,mat1,mat2));
  if(existing.length){
    openPickModal(existing,mat1,mat2,prefillColor,prefillDigits,extra);
    return;
  }
  _openNewRecipeForPair(mat1,mat2,prefillColor,prefillDigits,extra);
}

function openPickModal(existing,mat1,mat2,prefillColor,prefillDigits,extra){
  pickState={mat1,mat2,prefillColor,prefillDigits,extra};
  const codeLabel=prefillColor&&prefillDigits?`${prefillColor} ${prefillDigits}`:'the new code';
  document.getElementById('pick-body').textContent=`Add ${codeLabel} to an existing recipe, or create a new one.`;
  document.getElementById('pick-list').innerHTML=existing.map(r=>`
    <button class="btn" style="text-align:left;width:100%;padding:.5rem .9rem" onclick="pickRecipe('${esc(r.id)}')">
      <strong>${esc(r.name)}</strong> <span style="color:var(--flint);font-size:.8rem;margin-left:.4rem">${esc(r.id)}</span>
    </button>`).join('');
  document.getElementById('pick-overlay').classList.remove('hidden');
}

function closePick(){document.getElementById('pick-overlay').classList.add('hidden');}
function openHelp(){renderAppUpdateStatus();document.getElementById('help-overlay').classList.remove('hidden');}
function closeHelp(){document.getElementById('help-overlay').classList.add('hidden');}

function pickRecipe(id){
  closePick();
  const {mat1,mat2,prefillColor,prefillDigits}=pickState;
  openModal(id);
  if(prefillColor&&prefillDigits){
    const key=codeKey(prefillColor,prefillDigits);
    const alreadyOnThis=pendingCodes.some(c=>codeKey(c.color,c.digits)===key);
    const clash=!alreadyOnThis&&recipes.find(r=>r.id!==id&&!r.deleted&&(r.codes||[]).some(x=>codeKey(x.color,x.digits)===key));
    if(clash){
      // The code belongs to a different recipe — offer to attach this combination there instead
      if(offerPairToClashingRecipe(clash,mat1,mat2,key)) closeModal();
    }
    else if(!alreadyOnThis){pendingCodes.push({color:prefillColor,digits:prefillDigits});renderCodeList();}
  }
}

function pickNew(){
  closePick();
  const {mat1,mat2,prefillColor,prefillDigits,extra}=pickState;
  _openNewRecipeForPair(mat1,mat2,prefillColor,prefillDigits,extra);
}

function _openNewRecipeForPair(mat1,mat2,prefillColor,prefillDigits,extra){
  let prefillCode=!!(prefillColor&&prefillDigits);
  if(prefillCode){
    const key=codeKey(prefillColor,prefillDigits);
    const clash=recipes.find(r=>!r.deleted&&(r.codes||[]).some(x=>codeKey(x.color,x.digits)===key));
    if(clash){
      if(offerPairToClashingRecipe(clash,mat1,mat2,key)) return; // combination attached — no new recipe needed
      prefillCode=false; // declined — open the form without the code
    }
  }
  openModal();
  document.getElementById('f-mat1-name').value=mat1;
  document.getElementById('f-mat2-name').value=mat2;
  if(extra){
    document.getElementById('f-name').value=extra.name||'';
    document.getElementById('f-item-num').value=extra.cardId||'';
    document.getElementById('f-notes').value=extra.notes||'';
  }
  if(prefillCode){pendingCodes.push({color:prefillColor,digits:prefillDigits});renderCodeList();}
}

function closeModal(){document.getElementById('modal-overlay').classList.add('hidden');mantlePendingConsume=null;}
function outsideClose(e,id){if(e.target===document.getElementById(id)) document.getElementById(id).classList.add('hidden');}

function saveRecipe(){
  const name=document.getElementById('f-name').value.trim();
  const itemNum=normalizeCardId(document.getElementById('f-item-num').value,'IT'); // "13" / "it13" → "IT13"
  if(!name){alert('Item name is required.');return;}
  if(!itemNum){alert('Item number is required.');return;}
  // Check for duplicate item number (only when adding new, or changing the number on edit).
  // A tombstoned recipe doesn't block its number — saving over it revives the id.
  if(itemNum!==(editingId||'')&&recipes.some(r=>r.id===itemNum&&!r.deleted)){
    alert(`Item number ${itemNum} is already used by "${recipes.find(r=>r.id===itemNum).name}".`);return;
  }
  const recipe={
    id:itemNum,
    name,
    codes:[...pendingCodes],
    mat1Name:document.getElementById('f-mat1-name').value.trim(),
    mat1Cat:KM[norm(document.getElementById('f-mat1-name').value.trim())]?.cat||'unknown',
    mat2Name:document.getElementById('f-mat2-name').value.trim(),
    mat2Cat:KM[norm(document.getElementById('f-mat2-name').value.trim())]?.cat||'unknown',
    notes:document.getElementById('f-notes').value.trim(),
    addedAt:editingId?(recipes.find(r=>r.id===editingId)?.addedAt||Date.now()):Date.now(),
    updatedAt:Date.now(), // newest copy wins on sync merges
  };
  // The form edits only the primary pair — keep any alternate combinations
  const prevAlt=editingId&&recipes.find(r=>r.id===editingId)?.altPairs;
  if(prevAlt?.length) recipe.altPairs=prevAlt;
  if(editingId){const i=recipes.findIndex(r=>r.id===editingId);if(i!==-1)recipes[i]=recipe;else recipes.push(recipe);}
  else{const i=recipes.findIndex(r=>r.id===recipe.id);if(i!==-1)recipes[i]=recipe;else recipes.push(recipe);} // replaces a tombstone holding this id, if any
  // A saved recipe is table-verified — tombstone any provisional entries for its
  // codes so the clearing propagates instead of resurfacing from other devices
  for(const c of recipe.codes){
    const k=codeKey(c.color,c.digits), p=provisionalCodes[k];
    if(p&&!p.deleted) provisionalCodes[k]={...p,deleted:true,updatedAt:Date.now()};
  }
  // Discovery from the Mantle Unknown subtab: spend the satchel materials.
  // recipeUsesPair guards against stale pending state from an abandoned modal.
  if(mantlePendingConsume&&recipeUsesPair(recipe,mantlePendingConsume.a,mantlePendingConsume.b))
    mantleConsumePair(mantlePendingConsume.a,mantlePendingConsume.b);
  mantlePendingConsume=null;
  save(); renderJournal(); closeModal();
  refreshCraftingViews();
}

function editRecipe(id){
  openModal(id);
}
function deleteRecipe(id){
  const r=recipes.find(x=>x.id===id&&!x.deleted);
  if(!r) return;
  r.deleted=true; r.updatedAt=Date.now();
  save(); renderJournal();
  refreshCraftingViews();
  showUndoToast(`Deleted "${r.name}"`,()=>restoreRecipe(id));
}
function restoreRecipe(id){
  const r=recipes.find(x=>x.id===id&&x.deleted);
  if(!r) return;
  delete r.deleted; r.updatedAt=Date.now(); // the restore must also win merges
  save(); renderJournal();
  refreshCraftingViews();
}
function clearJournalFilters(){
  document.getElementById('search').value='';
  document.getElementById('filter-mode-and').checked=false;
  matFilterTags=[];
  renderMatTags(); renderJournal();
}

// ═══════════════════════════════════════════════════
// AUTOCOMPLETE ENGINE
// ═══════════════════════════════════════════════════
let acIdxMap={};

function materialMarksPlaceholderHtml(m, size='md', hidden=false){
  const rawMarks = m?.marks || [];
  const marks=rawMarks.map(mark => mark ? parseMark(mark) : { color:null, count:0, isNull:true });
  const hasAny=rawMarks.some(mark => mark !== undefined);
  const hiddenAttr = hidden ? ' style="display:none"' : '';
  if(!hasAny){
    const baseClass = size==='lg' ? 'combo-token-img combo-token-placeholder'
      : size==='sm' ? 'mat-ac-img mat-ac-img-placeholder'
      : 'material-card-img-placeholder';
    return `<span class="${baseClass}"${hiddenAttr}></span>`;
  }
  const edgeClasses=['left','right','top','bottom'];
  const hasReal = i => !!marks[i] && !marks[i].isNull;
  const showNull = [
    hasReal(1) && !hasReal(0),
    hasReal(0) && !hasReal(1),
    hasReal(3) && !hasReal(2),
    hasReal(2) && !hasReal(3),
  ];
  return `<span class="mark-token mark-token-${size}" title="${esc(m?.name||'Material')}"${hiddenAttr}>${marks.map((mark,i)=>{
    if(!mark) return '';
    if(mark.isNull && !showNull[i]) return '';
    const pip = mark.isNull
      ? '<span class="null-pip-icon" aria-hidden="true"></span>'
      : pipHtml(mark.color);
    return `<span class="mark-token-edge ${edgeClasses[i]}">
      ${pip}
      <span class="mark-token-count">${esc(mark.count)}</span>
    </span>`;
  }).join('')}</span>`;
}

function matImgHtml(name){
  const m=KM[norm(name)];
  if(!m||!m.image) return materialMarksPlaceholderHtml(m,'sm');
  return `<span class="mat-ac-img-wrap"><img src="${esc(m.image)}" alt="" class="mat-ac-img" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">${materialMarksPlaceholderHtml(m,'sm',true)}</span>`;
}

function comboTokenImg(name, deg=0){
  const m=KM[norm(name)];
  if(!m||!m.image) return `<span class="combo-token-img-wrap" style="transform:rotate(${deg}deg)" title="${esc(name)} (${deg}°)">${materialMarksPlaceholderHtml(m,'lg')}</span>`;
  return `<span class="combo-token-img-wrap" style="transform:rotate(${deg}deg)" title="${esc(name)} (${deg}°)"><img src="${esc(m.image)}" alt="${esc(name)}" class="combo-token-img" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">${materialMarksPlaceholderHtml(m,'lg',true)}</span>`;
}

function tokenPairHtml(a, rotA, b, rotB){
  return `<div class="combo-token-pair">${comboTokenImg(a,rotA)}${comboTokenImg(b,rotB)}</div>`;
}

function showAcDropdown(acId,q,exclude,onClickFn,filterFn){
  const all=allMatNames();
  const exNorm=exclude.map(norm);
  const matches=all
    .filter(n=>!exNorm.includes(norm(n))&&(!q||n.toLowerCase().includes(q.toLowerCase())))
    .filter(n=>!filterFn||filterFn(n))
    .slice(0,14);
  const ac=document.getElementById(acId); if(!ac) return;
  if(!matches.length){ac.classList.add('hidden');return;}
  ac.innerHTML=matches.map((name,i)=>{
    const cat=catFor(name);
    return `<div class="mat-autocomplete-item" data-idx="${i}" data-name="${esc(name)}" onmousedown="${onClickFn(name)}">
      ${matImgHtml(name)}<span class="mat-cat-dot ${cat}"></span>${esc(name)}
    </div>`;
  }).join('');
  ac.classList.remove('hidden');
  acIdxMap[acId]=-1;
}

function hideAc(id){const el=document.getElementById(id);if(el) el.classList.add('hidden');}

function acKeyNav(e,acId,onConfirm,idxMap,mapKey){
  const map=idxMap||acIdxMap; const key=mapKey||acId;
  const ac=document.getElementById(acId);
  const items=ac?ac.querySelectorAll('.mat-autocomplete-item'):[];
  let idx=map[key]??-1;
  if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(idx+1,items.length-1);items.forEach((el,i)=>el.classList.toggle('active',i===idx));map[key]=idx;}
  else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(idx-1,-1);items.forEach((el,i)=>el.classList.toggle('active',i===idx));map[key]=idx;}
  else if(e.key==='Enter'){e.preventDefault();onConfirm(idx);map[key]=-1;}
  else if(e.key==='Escape'||e.key==='Tab'){hideAc(acId);map[key]=-1;}
}

// form material autocomplete
let fmIdxMap={};
function fmAcShow(inputId,acId){
  let q=document.getElementById(inputId).value;
  if(KM[norm(q)]) q=''; // already a known material — show the full list so switching is easy
  const matches=allMatNames().filter(n=>!q||n.toLowerCase().includes(q.toLowerCase())).slice(0,12);
  const ac=document.getElementById(acId); if(!ac) return;
  if(!matches.length){ac.classList.add('hidden');return;}
  ac.innerHTML=matches.map((name,i)=>{
    const cat=catFor(name);
    return `<div class="mat-autocomplete-item" data-idx="${i}" data-name="${esc(name)}"
      onmousedown="fmPick('${esc(name)}','${acId}','${inputId}')">
      ${matImgHtml(name)}<span class="mat-cat-dot ${cat}"></span>${esc(name)}
    </div>`;
  }).join('');
  ac.classList.remove('hidden');
  fmIdxMap[acId]=-1;
}
function fmAcKey(e,inputId,acId){
  acKeyNav(e,acId,idx=>{
    const items=document.querySelectorAll(`#${acId} .mat-autocomplete-item`);
    if(idx>=0&&items[idx]) fmPick(items[idx].dataset.name,acId,inputId);
    else hideAc(acId);
  },fmIdxMap,acId);
}
function fmPick(name,acId,inputId){
  document.getElementById(inputId).value=name;
  hideAc(acId); fmIdxMap[acId]=-1;
}

document.addEventListener('click',e=>{
  ['mat-autocomplete','fac1','fac2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el&&!el.parentElement?.contains(e.target)) hideAc(id);
  });
});

// ═══════════════════════════════════════════════════
// IMPORT / EXPORT
// ═══════════════════════════════════════════════════

let pendingImport = null; // {recipes, nullCodes, meta} awaiting user choice

// persist() writes localStorage without touching lastUpdated — for sync
// bookkeeping (driveLastSynced etc). Content edits go through save(), which
// stamps lastUpdated so the unsynced indicator can compare it to the last push.
function persist() {
  const json = JSON.stringify({
    recipes, nullCodes, tokenData, customMaterials,
    culture, behemoths, challengeRecord, loomingChallenges, investigations, notePages, caveWall, codexEntries, provisionalCodes,
    lastUpdated, driveFileId, driveToken, driveLastSynced,
  });
  storageLastBytes = json.length * 2; // localStorage is UTF-16: ~2 bytes per char
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    alert('Saving FAILED — browser storage is full, so your latest change is NOT saved locally.\n\nExport JSON or sync to Drive now to avoid losing work, then free space (cave wall drawings are the biggest consumers).');
    updateSyncBadge();
    return;
  }
  warnIfStorageNearlyFull();
  updateSyncBadge();
}

// ── Storage size guard ──
// save() used to swallow quota errors silently — data loss without a symptom.
// Now the size is measured on every write, a visible warning fires as the
// ~5MB quota approaches, and the Drive modal shows the current size.
const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024;
const STORAGE_WARN_RATIO  = 0.8;
let storageLastBytes = 0;
let storageWarnedAt  = 0; // bytes at last warning — re-warn only after 5% more growth

function storageSizeBytes() {
  if (!storageLastBytes) {
    const raw = localStorage.getItem(STORAGE_KEY);
    storageLastBytes = raw ? raw.length * 2 : 0;
  }
  return storageLastBytes;
}

function fmtBytes(n) {
  return n >= 1024*1024 ? `${(n/1024/1024).toFixed(1)} MB` : `${Math.round(n/1024)} KB`;
}

function warnIfStorageNearlyFull() {
  if (storageLastBytes > STORAGE_QUOTA_BYTES * STORAGE_WARN_RATIO && storageLastBytes > storageWarnedAt * 1.05) {
    storageWarnedAt = storageLastBytes;
    alert(`Browser storage is ${Math.round(storageLastBytes / STORAGE_QUOTA_BYTES * 100)}% full (${fmtBytes(storageLastBytes)} of ~${fmtBytes(STORAGE_QUOTA_BYTES)}).\n\nExport JSON as a backup. Cave wall drawings are the biggest consumers — deleting unneeded ones frees the most space.`);
  }
}

function save() {
  lastUpdated = new Date().toISOString();
  persist();
}

// Local data newer than the last Drive push (or never pushed at all) is one
// browser-storage eviction away from gone — surface that on the Drive button.
function hasUnsyncedChanges() {
  if (driveSyncInFlight) return false;
  return !!lastUpdated && (!driveLastSynced || lastUpdated > driveLastSynced);
}

function updateSyncBadge() {
  const b = document.getElementById('drive-sync-open-btn');
  if (b) {
    b.classList.toggle('has-unsynced', hasUnsyncedChanges());
    b.title = hasUnsyncedChanges() ? 'There are local changes not yet synced to the group' : '';
  }
}

// Nudge before leaving with unpushed changes — only for groups that actually
// sync (a solo, Drive-less journal shouldn't nag on every close).
window.addEventListener('beforeunload', e => {
  if (driveFileId && hasUnsyncedChanges()) { e.preventDefault(); e.returnValue = ''; }
});

function fmtDate(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short'});
}

function exportSchemaVersion(d) {
  const v = Number(d?.version || 0);
  return Number.isFinite(v) ? v : 0;
}

function newerSchemaMessage(d) {
  return `Group file was written by a newer version of the app (schema v${exportSchemaVersion(d)}; this app supports v${EXPORT_VERSION}) — reload to update, then sync.`;
}

function buildExportPayload() {
  return {
    app: 'Stonesaga Crafting Journal',
    version: EXPORT_VERSION,

    exportedAt: new Date().toISOString(),
    lastUpdated: lastUpdated || new Date().toISOString(),
    recipes,
    nullCodes,
    customMaterials,
    culture,
    behemoths,
    challengeRecord,
    loomingChallenges,
    investigations,
    notePages,
    caveWall,
    codexEntries,
    provisionalCodes,
    driveFileId,
    driveToken,
  };
}

function journalEntryCount(d) {
  return live(d.behemoths).length + live(d.challengeRecord).length + live(d.loomingChallenges).length
       + live(d.investigations).length + live(d.notePages).length + live(d.caveWall).length
       + live(d.codexEntries).length
       + liveKeys(d.provisionalCodes).length
       + (d.culture ? (d.culture.tribeName?1:0) + CULTURE_LIST_KEYS
           .reduce((n,k)=>n+live(d.culture[k]).length,0) : 0);
}

// Pretty-print the export, but keep numeric arrays (cave wall stroke pts) on
// one line — split across lines they are ~97% of the output and quadruple it.
function exportJsonString(payload) {
  return JSON.stringify(payload, null, 2).replace(/\[[\s\d,.-]+\]/g, m => m.replace(/\s+/g, ''));
}

function exportData() {
  if (!live(recipes).length && !liveKeys(nullCodes).length && !live(customMaterials).length
      && !journalEntryCount({culture, behemoths, challengeRecord, loomingChallenges, investigations, notePages, caveWall, codexEntries, provisionalCodes})) {
    alert('Nothing to export.'); return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportJsonString(buildExportPayload())], {type:'application/json'}));
  const ts = new Date().toISOString().replace('T',' ').slice(0,16).replace(/[: ]/g,'-');
  a.download = `stonesaga-${ts}.json`;
  a.click();
}

function triggerImport() {
  document.getElementById('import-file').value = '';
  document.getElementById('import-file').click();
}

function detectImportConflicts(incoming, inNull) {
  const conflicts = [];

  // Build a lookup: code key → recipe id, for current data
  const codeToId = {};
  for (const r of live(recipes))
    for (const c of (r.codes||[])) codeToId[codeKey(c.color,c.digits)] = r.id;

  // Each conflict carries what's needed to apply a per-conflict resolution
  // after the merge, plus `def` — the side the newest-wins merge would pick,
  // used as the pre-selected choice.
  for (const r of live(incoming)) {
    const existing = recipes.find(x => x.id === r.id && !x.deleted);
    if (existing) {
      const def = (existing.updatedAt||0) >= (r.updatedAt||0) ? 'yours' : 'theirs';
      if (existing.name !== r.name)
        conflicts.push({type:'name', id:r.id, yours:existing.name, theirs:r.name, def});
      const m1 = norm(existing.mat1Name||'')!==norm(r.mat1Name||'');
      const m2 = norm(existing.mat2Name||'')!==norm(r.mat2Name||'');
      if (m1||m2)
        conflicts.push({type:'materials', id:r.id, name:r.name, def,
          yours:`${existing.mat1Name||'?'} + ${existing.mat2Name||'?'}`,
          theirs:`${r.mat1Name||'?'} + ${r.mat2Name||'?'}`,
          yoursPair:{mat1Name:existing.mat1Name, mat1Cat:existing.mat1Cat, mat2Name:existing.mat2Name, mat2Cat:existing.mat2Cat},
          theirsPair:{mat1Name:r.mat1Name, mat1Cat:r.mat1Cat, mat2Name:r.mat2Name, mat2Cat:r.mat2Cat}});
    }

    for (const c of (r.codes||[])) {
      const k = codeKey(c.color,c.digits);
      // Code belongs to a different item in current data
      if (codeToId[k] && codeToId[k] !== r.id) {
        const owner = recipes.find(x=>x.id===codeToId[k]);
        conflicts.push({type:'code-clash', code:k, def:'yours',
          yoursId:codeToId[k], theirsId:r.id,
          yours:`${owner?.name||codeToId[k]}`, theirs:r.name});
      }
      // Code is "Nothing" in current data but a discovery in the file
      if (nullCodes[k] && !nullCodes[k].deleted)
        conflicts.push({type:'discovery-vs-nothing', code:k, theirs:r.name, theirsId:r.id, direction:'file-is-discovery', def:'discovery'});
    }
  }

  // Code is a discovery in current data but "Nothing" in the file
  for (const k of liveKeys(inNull)) {
    const owner = recipes.find(r=>!r.deleted&&(r.codes||[]).some(c=>codeKey(c.color,c.digits)===k));
    if (owner)
      conflicts.push({type:'discovery-vs-nothing', code:k, yours:owner.name, yoursId:owner.id, direction:'file-is-nothing', def:'discovery'});
  }

  return conflicts;
}

function cfRadio(i, value, label, checked){
  return `<label class="cf-opt"><input type="radio" name="cf-${i}" value="${value}"${checked?' checked':''} onchange="cfChanged(${i})"> ${label}</label>`;
}

// Each conflict renders as a choice; the picks are read back from the DOM
// when Merge is clicked. The pre-selected side is what newest-wins would do.
function renderConflicts(conflicts) {
  const el = document.getElementById('im-conflicts');
  if (!conflicts.length) { el.innerHTML=''; return; }
  const rows = conflicts.map((c,i) => {
    let desc='', opts='';
    switch(c.type) {
      case 'name':
        desc=`<strong>${esc(c.id)}:</strong> name differs`;
        opts=cfRadio(i,'yours',`Yours: <em>${esc(c.yours)}</em>`,c.def==='yours')
            +cfRadio(i,'theirs',`File: <em>${esc(c.theirs)}</em>`,c.def==='theirs')
            +`<input class="form-control cf-name-input" id="cf-name-${i}" value="${esc(c.def==='yours'?c.yours:c.theirs)}" title="Edit to use a different name entirely">`;
        break;
      case 'materials':
        desc=`<strong>${esc(c.id)} ${esc(c.name)}:</strong> materials differ`;
        opts=cfRadio(i,'yours',`Yours: <em>${esc(c.yours)}</em>`,c.def==='yours')
            +cfRadio(i,'theirs',`File: <em>${esc(c.theirs)}</em>`,c.def==='theirs');
        break;
      case 'code-clash':
        desc=`<strong>${esc(c.code)}:</strong> recorded on two different items`;
        opts=cfRadio(i,'yours',`Keep on <em>${esc(c.yours)}</em> (yours)`,c.def==='yours')
            +cfRadio(i,'theirs',`Move to <em>${esc(c.theirs)}</em> (file)`,c.def==='theirs');
        break;
      case 'discovery-vs-nothing': {
        const item = c.direction==='file-is-discovery' ? c.theirs : c.yours;
        const side = c.direction==='file-is-discovery' ? 'file'   : 'yours';
        desc=`<strong>${esc(c.code)}:</strong> a discovery on one side, a dead-end on the other`;
        opts=cfRadio(i,'discovery',`Keep item <em>${esc(item)}</em> (${side})`,c.def==='discovery')
            +cfRadio(i,'nothing','Keep dead-end',c.def==='nothing');
        break;
      }
    }
    return `<li>${desc}<div class="cf-opts">${opts}</div></li>`;
  }).join('');
  el.innerHTML = `<div class="im-conflict-header">⚠ ${conflicts.length} conflict${conflicts.length>1?'s':''} — pick a side for each (applied on Merge)</div><ul class="im-conflict-list">${rows}</ul>`;
}

// Keep a name conflict's editable input in step with the chosen side
function cfChanged(i){
  const c = pendingImport?.conflicts?.[i];
  if (!c || c.type !== 'name') return;
  const pick = document.querySelector(`input[name="cf-${i}"]:checked`)?.value;
  const input = document.getElementById(`cf-name-${i}`);
  if (input) input.value = pick === 'yours' ? c.yours : c.theirs;
}

// Runs after the merge: forces each conflict's chosen value onto the merged
// entry. Anything changed gets a fresh updatedAt so the resolution outranks
// BOTH sides on future syncs — otherwise the losing copy re-conflicts.
function applyConflictResolutions(conflicts) {
  const byId = id => recipes.find(r => r.id === id);
  const dropCode = (r, code) => {
    if (!r) return;
    const before = (r.codes||[]).length;
    r.codes = (r.codes||[]).filter(x => codeKey(x.color,x.digits) !== code);
    if (r.codes.length !== before) r.updatedAt = Date.now();
  };
  conflicts.forEach((c,i) => {
    const pick = document.querySelector(`input[name="cf-${i}"]:checked`)?.value || c.def;
    switch(c.type) {
      case 'name': {
        const r = byId(c.id); if (!r) break;
        const name = (document.getElementById(`cf-name-${i}`)?.value||'').trim() || (pick==='yours'?c.yours:c.theirs);
        if (r.name !== name) { r.name = name; r.updatedAt = Date.now(); }
        break;
      }
      case 'materials': {
        const r = byId(c.id); if (!r) break;
        const m = pick==='yours' ? c.yoursPair : c.theirsPair;
        if (m && (r.mat1Name!==m.mat1Name || r.mat2Name!==m.mat2Name)) { Object.assign(r, m); r.updatedAt = Date.now(); }
        break;
      }
      case 'code-clash':
        // the losing recipe gives up the code
        dropCode(byId(pick==='yours' ? c.theirsId : c.yoursId), c.code);
        break;
      case 'discovery-vs-nothing': {
        const recId = c.direction==='file-is-discovery' ? c.theirsId : c.yoursId;
        const n = nullCodes[c.code];
        if (pick === 'discovery') {
          if (n && !n.deleted) nullCodes[c.code] = {...n, deleted:true, updatedAt:Date.now()};
        } else {
          dropCode(byId(recId), c.code);
          if (n && n.deleted) { const nn = {...n, updatedAt:Date.now()}; delete nn.deleted; nullCodes[c.code] = nn; }
        }
        break;
      }
    }
  });
}

function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      const incoming = d.recipes || (Array.isArray(d) ? d : null);
      if (!incoming) { alert('Unrecognised file format.'); return; }
      const inNull = d.nullCodes || {};
      pendingImport = { recipes: incoming, nullCodes: inNull, customMaterials: d.customMaterials || [], driveFileId: d.driveFileId || null, driveToken: d.driveToken || null, meta: d };

      const fileUpdated = d.lastUpdated ? fmtDate(d.lastUpdated) : (d.exportedAt ? fmtDate(d.exportedAt) : 'unknown');
      const nullCount   = liveKeys(inNull).length;
      document.getElementById('im-summary').innerHTML =
        `<strong>File:</strong> ${esc(file.name)}<br>` +
        `<strong>Last updated:</strong> ${esc(fileUpdated)}<br>` +
        `<strong>Recipes:</strong> ${live(incoming).length} &nbsp;·&nbsp; <strong>Dead-end codes:</strong> ${nullCount}` +
        (journalEntryCount(d) ? ` &nbsp;·&nbsp; <strong>Journal entries:</strong> ${journalEntryCount(d)}` : '') +
        (exportSchemaVersion(d) > EXPORT_VERSION ? `<br><em>⚠ This file is from a newer version of the app — consider refreshing before importing.</em>` : '');

      const curUpdated = fmtDate(lastUpdated);
      document.getElementById('im-current').innerHTML =
        `Your current data: ${live(recipes).length} recipe(s), ${liveKeys(nullCodes).length} dead-end code(s) — last updated ${esc(curUpdated)}`;

      pendingImport.conflicts = detectImportConflicts(incoming, inNull);
      renderConflicts(pendingImport.conflicts);
      document.getElementById('import-overlay').classList.remove('hidden');
    } catch { alert('Could not parse JSON file.'); }
  };
  reader.readAsText(file);
}

// Union by entry id; on a shared id the entry with the newer updatedAt wins.
function mergeById(local, incoming) {
  const map = Object.fromEntries(local.map(e => [e.id, e]));
  for (const e of incoming || []) {
    const cur = map[e.id];
    if (!cur || (e.updatedAt||0) > (cur.updatedAt||0)) map[e.id] = e;
  }
  return Object.values(map);
}

// Same idea for keyed objects (e.g. provisionalCodes keyed by "Blue 1111").
function mergeByKey(local, incoming) {
  const out = {...local};
  for (const [k,v] of Object.entries(incoming || {})) {
    const cur = out[k];
    if (!cur || (v.updatedAt||0) > (cur.updatedAt||0)) out[k] = v;
  }
  return out;
}

// customMaterials have no ids — key by normalised name, newer updatedAt wins
// (legacy entries without a timestamp count as 0, so any real edit beats them).
function mergeByName(local, incoming) {
  const map = Object.fromEntries(local.map(m => [norm(m.name), m]));
  for (const m of incoming || []) {
    const k = norm(m.name||''), cur = map[k];
    if (!cur || (m.updatedAt||0) > (cur.updatedAt||0)) map[k] = m;
  }
  return Object.values(map);
}

function mergeCulture(local, incoming) {
  if (!incoming) return local;
  const incomingNewer = (incoming.updatedAt||0) > (local.updatedAt||0);
  return {
    tribeName: (incomingNewer && incoming.tribeName) ? incoming.tribeName : (local.tribeName || incoming.tribeName || ''),
    updatedAt: Math.max(local.updatedAt||0, incoming.updatedAt||0) || null,
    ...Object.fromEntries(CULTURE_LIST_KEYS.map(k => [k, mergeById(local[k]||[], incoming[k])])),
  };
}

function doImport(mode) {
  if (!pendingImport) return;
  const { recipes: incoming, nullCodes: inNull, customMaterials: inMats, driveFileId: inDriveId } = pendingImport;
  const meta = (pendingImport.meta && !Array.isArray(pendingImport.meta)) ? pendingImport.meta : {};
  if (mode === 'merge') {
    // Union by card id; when both sides have a recipe, the most recently
    // edited copy wins (untouched legacy copies count as 0, so any real edit
    // beats them). Previously incoming always won, which meant a local rename
    // was reverted by the very sync meant to publish it.
    recipes = mergeById(recipes, incoming);
    nullCodes = mergeByKey(nullCodes, inNull);
    customMaterials = mergeByName(customMaterials, inMats);
    culture           = mergeCulture(culture, meta.culture);
    behemoths         = mergeById(behemoths,         meta.behemoths);
    challengeRecord   = mergeById(challengeRecord,   meta.challengeRecord);
    loomingChallenges = mergeById(loomingChallenges, meta.loomingChallenges);
    investigations    = mergeById(investigations,    meta.investigations);
    notePages         = mergeById(notePages,         meta.notePages);
    caveWall          = mergeById(caveWall,          meta.caveWall);
    codexEntries      = mergeById(codexEntries,      meta.codexEntries);
    provisionalCodes  = mergeByKey(provisionalCodes, meta.provisionalCodes);
    applyConflictResolutions(pendingImport.conflicts || []);
  } else {
    recipes         = incoming;
    nullCodes       = inNull;
    customMaterials = inMats;
    culture           = meta.culture           || emptyCulture();
    behemoths         = meta.behemoths         || [];
    challengeRecord   = meta.challengeRecord   || [];
    loomingChallenges = meta.loomingChallenges || [];
    investigations    = meta.investigations    || [];
    notePages         = meta.notePages         || [];
    caveWall          = meta.caveWall          || [];
    codexEntries      = meta.codexEntries      || [];
    provisionalCodes  = meta.provisionalCodes  || {};
  }
  // Adopt the group's Drive connection: the file id if we have none, and the
  // sync token whenever the incoming data belongs to our file — tokens never
  // rotate, so a mismatch means ours is a stale self-minted one and the
  // group's copy wins.
  if (!driveFileId && inDriveId) driveFileId = inDriveId;
  if (inDriveId && inDriveId === driveFileId && pendingImport.driveToken) driveToken = pendingImport.driveToken;
  pendingImport = null;
  rebuildMaterials();
  save(); renderJournal();
  closeImportModal();
  refreshCraftingViews();
  if (drivePostImport) {
    drivePostImport = false;
    _pushToDrive().catch(err => alert(`Push to Drive failed: ${err.message}`));
  }
}

function closeImportModal() {
  pendingImport = null;
  document.getElementById('import-overlay').classList.add('hidden');
}

// ═══════════════════════════════════════════════════
// MARKS → ORIENTATIONS
// ═══════════════════════════════════════════════════
// Each material has 4 edge marks [left, right, top, bottom].
// Rotating the token 90° clockwise cycles: left←bottom, right←top, top←left, bottom←right.
// So the 4 rotations give these [left_active, right_active] pairs:
//   0°  : [L, R]
//   90° : [B, T]
//   180°: [R, L]
//   270°: [T, B]
// Only rotations where the left (outer) edge is non-null are valid.

function parseMark(s) {
  if (!s) return null;
  const i = s.indexOf(' ');
  return { color: s.slice(0, i), count: parseInt(s.slice(i + 1)) };
}

function marksToOrientations(marks) {
  if (!marks) return [];
  const [L, R, T, B] = marks.map(parseMark);
  // [left_edge, right_edge, css_rotation_degrees]
  const rots = [[L, R, 0], [B, T, 90], [R, L, 180], [T, B, 270]];
  return rots
    .filter(([l]) => l !== null)
    .map(([l, r, deg]) => [l.color, l.count, r ? r.color : null, r ? r.count : 0, deg]);
}

// Pre-populate tokenData from built-in marks for any material not already in tokenData.
// User-loaded token data (via JSON file) takes priority and is preserved.
function seedTokenDataFromMarks() {
  for (const m of KNOWN_MATERIALS) {
    const key = m.name.toLowerCase();
    if (tokenData[key]) continue;
    const orients = marksToOrientations(m.marks);
    if (orients.length) tokenData[key] = orients;
  }
}

// ═══════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      recipes         = d.recipes         || [];
      nullCodes       = d.nullCodes       || {};
      tokenData       = d.tokenData       || {};
      customMaterials = d.customMaterials || [];
      culture           = d.culture           || emptyCulture();
      behemoths         = d.behemoths         || [];
      challengeRecord   = d.challengeRecord   || [];
      loomingChallenges = d.loomingChallenges || [];
      investigations    = d.investigations    || [];
      notePages         = d.notePages         || [];
      caveWall          = d.caveWall          || [];
      codexEntries      = d.codexEntries      || [];
      provisionalCodes  = d.provisionalCodes  || {};
      lastUpdated     = d.lastUpdated     || null;
      driveFileId     = d.driveFileId     || null;
      driveToken      = d.driveToken      || null;
      driveLastSynced = d.driveLastSynced || null;
    }
  } catch { /* corrupted storage — start fresh */ }
  gcTombstones();
  rebuildMaterials();
  seedTokenDataFromMarks();
}

// Tombstones older than this are dropped on load — long enough for every
// device in the group to have synced the deletion by then.
const TOMBSTONE_MAX_AGE = 90*24*60*60*1000;

function gcTombstones() {
  const cutoff = Date.now() - TOMBSTONE_MAX_AGE;
  const fresh = e => !(e?.deleted && (e.updatedAt||0) < cutoff);
  recipes           = recipes.filter(fresh);
  behemoths         = behemoths.filter(fresh);
  challengeRecord   = challengeRecord.filter(fresh);
  loomingChallenges = loomingChallenges.filter(fresh);
  investigations    = investigations.filter(fresh);
  notePages         = notePages.filter(fresh);
  caveWall          = caveWall.filter(fresh);
  codexEntries      = codexEntries.filter(fresh);
  customMaterials   = customMaterials.filter(fresh);
  for (const k of CULTURE_LIST_KEYS)
    culture[k] = (culture[k]||[]).filter(fresh);
  for (const o of [nullCodes, provisionalCodes])
    for (const k of Object.keys(o)) if (!fresh(o[k])) delete o[k];
}

// ═══════════════════════════════════════════════════
// CUSTOM MATERIALS
// ═══════════════════════════════════════════════════
let editingMaterialName = null;

// Normalise a mark string "Blue 2" — returns the canonical string, null (blank/ok), or false (invalid).
function normalizeMark(v) {
  if (!v) return null;
  const t = v.trim(); if (!t) return null;
  const i = t.indexOf(' ');
  if (i < 1) return false;
  const color = t.slice(0, i).charAt(0).toUpperCase() + t.slice(1, i).toLowerCase();
  const count = parseInt(t.slice(i + 1));
  if (!PIP_COLORS.includes(color) || isNaN(count) || count < 1 || count > 6) return false;
  return `${color} ${count}`;
}

function openAddMaterialModal(nameToEdit) {
  editingMaterialName = nameToEdit || null;
  document.getElementById('am-title').textContent = nameToEdit ? 'Edit Material' : 'Add Material';

  // Populate category datalist from all known categories
  const cats = [...new Set([...KNOWN_MATERIALS.map(m => m.cat), 'animal','plant','mineral','rare','unknown'])].filter(Boolean).sort();
  document.getElementById('am-cat-list').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');

  const m = nameToEdit ? KM[norm(nameToEdit)] : null;
  document.getElementById('am-name').value      = m?.name      || '';
  document.getElementById('am-cat').value       = m?.cat       || 'unknown';
  document.getElementById('am-processed').value = m?.processed || '';
  document.getElementById('am-image').value     = m?.image     || '';
  document.getElementById('am-mark-left').value   = m?.marks?.[0] || '';
  document.getElementById('am-mark-right').value  = m?.marks?.[1] || '';
  document.getElementById('am-mark-top').value    = m?.marks?.[2] || '';
  document.getElementById('am-mark-bottom').value = m?.marks?.[3] || '';
  document.getElementById('am-notes').value     = m?.notes     || '';

  document.getElementById('am-name').readOnly = !!(nameToEdit && !customMaterials.some(c => norm(c.name) === norm(nameToEdit)));
  document.getElementById('add-material-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById(nameToEdit ? 'am-cat' : 'am-name').focus(), 50);
}

function closeAddMaterialModal() { document.getElementById('add-material-overlay').classList.add('hidden'); }

function editCustomMaterial(name) { openAddMaterialModal(name); }

function deleteCustomMaterial(name) {
  const m = customMaterials.find(x => norm(x.name) === norm(name) && !x.deleted);
  if (!m) return;
  m.deleted = true; m.updatedAt = Date.now();
  rebuildMaterials(); save(); renderMaterials();
  showUndoToast(`Deleted "${name}"`, () => restoreCustomMaterial(name));
}

function restoreCustomMaterial(name) {
  const m = customMaterials.find(x => norm(x.name) === norm(name) && x.deleted);
  if (!m) return;
  delete m.deleted; m.updatedAt = Date.now(); // the restore must also win merges
  rebuildMaterials(); save(); renderMaterials();
}

function saveCustomMaterial() {
  const name = document.getElementById('am-name').value.trim();
  if (!name) { alert('Name is required.'); return; }

  // Validate marks
  const markIds = ['am-mark-left','am-mark-right','am-mark-top','am-mark-bottom'];
  const marks = [];
  for (const id of markIds) {
    const normalized = normalizeMark(document.getElementById(id).value);
    if (normalized === false) {
      alert(`Invalid mark in "${id.replace('am-mark-','')}": use "Colour N", e.g. Blue 2.\nValid colours: ${PIP_COLORS.join(', ')}.`);
      return;
    }
    marks.push(normalized);
  }
  const hasMarks = marks.some(m => m !== null);

  const entry = {
    name,
    cat:       (document.getElementById('am-cat').value.trim()       || 'unknown'),
    processed: (document.getElementById('am-processed').value.trim() || null),
    image:     (document.getElementById('am-image').value.trim()     || null),
    marks:     hasMarks ? marks : null,
    notes:     (document.getElementById('am-notes').value.trim()     || null),
    updatedAt: Date.now(), // newest copy wins on sync merges
  };

  if (editingMaterialName) {
    const isBuiltin = !customMaterials.some(c => norm(c.name) === norm(editingMaterialName));
    if (isBuiltin) { alert('Built-in materials cannot be edited.'); return; }
    const idx = customMaterials.findIndex(m => norm(m.name) === norm(editingMaterialName));
    if (norm(name) !== norm(editingMaterialName) && KM[norm(name)]) {
      alert(`"${name}" is already a known material.`); return;
    }
    if (idx !== -1) customMaterials[idx] = entry; else customMaterials.push(entry);
  } else {
    if (KM[norm(name)]) { alert(`"${name}" is already a known material.`); return; }
    // KM excludes tombstones, so a matching index here is a deleted custom
    // material being recreated — replace it rather than duplicating the name
    const idx = customMaterials.findIndex(m => norm(m.name) === norm(name));
    if (idx !== -1) customMaterials[idx] = entry; else customMaterials.push(entry);
  }

  rebuildMaterials(); save(); closeAddMaterialModal(); renderMaterials();
}

function renderMaterials() {
  const q          = (document.getElementById('mat-search')?.value     || '').toLowerCase();
  const catFilter  =  document.getElementById('mat-cat-filter')?.value || '';
  const customNames = new Set(customMaterials.map(m => norm(m.name)));

  // Refresh category filter options
  const catFilterEl = document.getElementById('mat-cat-filter');
  if (catFilterEl) {
    const cats = [...new Set(KNOWN_MATERIALS.map(m => m.cat))].filter(Boolean).sort();
    catFilterEl.innerHTML = '<option value="">All categories</option>' +
      cats.map(c => `<option value="${esc(c)}"${c === catFilter ? ' selected' : ''}>${esc(titleCase(c))}</option>`).join('');
  }

  const list = KNOWN_MATERIALS
    .filter(m => (!q || m.name.toLowerCase().includes(q)) && (!catFilter || m.cat === catFilter))
    .sort((a, b) => a.name.localeCompare(b.name));

  const grid = document.getElementById('materials-grid');
  if (!grid) return;
  const deletedBlock = recentlyDeletedHtml(customMaterials.filter(m => m.deleted).map(m =>
    ({label: esc(m.name), restore: `restoreCustomMaterial('${esc(m.name)}')`})));
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><div class="glyph">◈</div><h2>No materials found</h2><p>Adjust your search or add a new material.</p></div>` + deletedBlock;
    return;
  }

  const edgeLabels = ['L','R','T','B'];
  grid.innerHTML = list.map(m => {
    const isCustom = customNames.has(norm(m.name));
    const markHtml = m.marks
      ? m.marks.map((mark, i) => {
          if (!mark) return '';
          const pm = parseMark(mark); if (!pm) return '';
          return `<span class="mat-mark-chip">${pipHtml(pm.color)} ${edgeLabels[i]}: ${pm.count}</span>`;
        }).join('')
      : '';
    return `<div class="material-card${isCustom ? ' material-card-custom' : ''}">
      <div class="material-card-img-wrap">
        ${m.image
          ? `<span class="material-card-img-frame"><img src="${esc(m.image)}" alt="" class="material-card-img" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">${materialMarksPlaceholderHtml(m,'md',true)}</span>`
          : materialMarksPlaceholderHtml(m,'md')}
      </div>
      <div class="material-card-body">
        <div class="material-card-name-row">
          <span class="material-tag ${m.cat||'unknown'}">${esc(m.name)}</span>
          ${isCustom ? '<span class="custom-badge">custom</span>' : ''}
        </div>
        ${m.processed ? `<div class="material-card-detail">→ ${esc(m.processed)}</div>` : ''}
        ${markHtml    ? `<div class="material-card-marks">${markHtml}</div>` : ''}
        ${m.notes     ? `<div class="material-card-notes">${esc(m.notes)}</div>` : ''}
        ${isCustom ? `<div class="card-actions">
          <button class="btn btn-sm" onclick="editCustomMaterial('${esc(m.name)}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomMaterial('${esc(m.name)}')">Delete</button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('') + deletedBlock;
}

// ═══════════════════════════════════════════════════
// DRIVE SYNC
// ═══════════════════════════════════════════════════
function openDriveModal()  { renderDriveModal(); document.getElementById('drive-overlay').classList.remove('hidden'); }
function closeDriveModal() { document.getElementById('drive-overlay').classList.add('hidden'); }

function renderDriveModal() {
  const statusEl  = document.getElementById('drive-modal-status');
  const actionsEl = document.getElementById('drive-modal-actions');
  const sizeHtml = `<div class="drive-synced">Local save size: ${fmtBytes(storageSizeBytes())} of ~${fmtBytes(STORAGE_QUOTA_BYTES)} browser storage</div>`;
  const versionHtml = sizeHtml + '<div id="app-version-drive"></div>';

  if (!DRIVE_SYNC_URL) {
    statusEl.innerHTML  = '<p class="drive-notice">Drive sync is not yet configured — set <code>DRIVE_SYNC_URL</code> in app.js after deploying drive-sync.gs.</p>' + versionHtml;
    actionsEl.innerHTML = '';
    renderAppUpdateStatus();
    return;
  }

  if (!driveFileId) {
    statusEl.innerHTML  = '<p>No group file yet. Create one to share your journal with the table — everyone who imports your JSON will connect to it automatically.</p>' + versionHtml;
    actionsEl.innerHTML = '<button class="btn btn-primary" id="drive-create-btn" onclick="createDriveFile()">Create group file</button>';
    renderAppUpdateStatus();
    return;
  }

  const driveLink = `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/view?usp=sharing`;
  statusEl.innerHTML =
    `<div class="drive-file-row">Group file: <a href="${driveLink}" target="_blank" rel="noopener" class="drive-file-link">View in Drive ↗</a></div>` +
    `<div class="drive-synced">Last synced: ${esc(driveLastSynced ? fmtDate(driveLastSynced) : 'never')}</div>` +
    (hasUnsyncedChanges() ? `<div class="drive-unsynced-note">● You have local changes not yet synced to the group.</div>` : '') +
    versionHtml;
  actionsEl.innerHTML = '<button class="btn btn-primary" id="drive-sync-btn" onclick="syncWithDrive()">Sync</button>';
  renderAppUpdateStatus();
}

async function createDriveFile() {
  const btn = document.getElementById('drive-create-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
  try {
    const res = await fetch(DRIVE_SYNC_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'create', data: buildExportPayload() }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    driveFileId = d.fileId;
    driveToken  = d.token || null;
    await _pushToDrive();
    renderDriveModal();
  } catch(err) {
    alert(`Could not create Drive file: ${err.message}`);
    renderDriveModal();
  }
}

async function _pushToDrive() {
  // Pre-token group file (created before auth existed): mint a token here —
  // the script stores it on first push, and the group JSON distributes it.
  if (!driveToken) driveToken = crypto.randomUUID();
  driveSyncInFlight = true;
  updateSyncBadge();
  try {
    const res = await fetch(DRIVE_SYNC_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'push', fileId: driveFileId, token: driveToken, data: buildExportPayload() }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    // Mark exactly the pushed state as synced — a fresh timestamp here would
    // leave lastUpdated forever "newer" once save() re-stamps it.
    driveLastSynced = lastUpdated || new Date().toISOString();
    persist();
  } finally {
    driveSyncInFlight = false;
    updateSyncBadge();
  }
}

async function syncWithDrive() {
  if (!DRIVE_SYNC_URL || !driveFileId) return;
  const btn = document.getElementById('drive-sync-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing…'; }
  try {
    const res = await fetch(`${DRIVE_SYNC_URL}?fileId=${encodeURIComponent(driveFileId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    if (exportSchemaVersion(d) > EXPORT_VERSION) throw new Error(newerSchemaMessage(d));
    drivePostImport = true;
    closeDriveModal();
    _loadDriveImport(d);
  } catch(err) {
    drivePostImport = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Sync'; }
    alert(`Sync failed: ${err.message}`);
  }
}

function _loadDriveImport(d) {
  if (exportSchemaVersion(d) > EXPORT_VERSION) {
    drivePostImport = false;
    alert(newerSchemaMessage(d));
    return;
  }
  const incoming = d.recipes || (Array.isArray(d) ? d : null);
  if (!incoming) { drivePostImport = false; alert('Unrecognised format received from Drive.'); return; }
  const inNull = d.nullCodes || {};
  pendingImport = { recipes: incoming, nullCodes: inNull, customMaterials: d.customMaterials || [], driveFileId: d.driveFileId || null, driveToken: d.driveToken || null, meta: d };

  const fileUpdated = d.lastUpdated ? fmtDate(d.lastUpdated) : (d.exportedAt ? fmtDate(d.exportedAt) : 'unknown');
  document.getElementById('im-summary').innerHTML =
    `<strong>Source:</strong> Drive<br>` +
    `<strong>Last updated:</strong> ${esc(fileUpdated)}<br>` +
    `<strong>Recipes:</strong> ${live(incoming).length} &nbsp;·&nbsp; <strong>Dead-end codes:</strong> ${liveKeys(inNull).length}` +
    (journalEntryCount(d) ? ` &nbsp;·&nbsp; <strong>Journal entries:</strong> ${journalEntryCount(d)}` : '');
  document.getElementById('im-current').innerHTML =
    `Your current data: ${live(recipes).length} recipe(s), ${liveKeys(nullCodes).length} dead-end code(s) — last updated ${esc(fmtDate(lastUpdated))}`;
  pendingImport.conflicts = detectImportConflicts(incoming, inNull);
  renderConflicts(pendingImport.conflicts);
  document.getElementById('import-overlay').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════
// JOURNAL SECTIONS (Culture, Behemoths, Challenges, Looming, Investigations, Notes)
// ═══════════════════════════════════════════════════
// One spec-driven editor covers every section: fields describe the form, get/set
// point at the backing list, render redraws the tab. Entries are {id, ...fields,
// updatedAt} so the Phase-0 merge logic (union by id, newer wins) applies as-is.

// Base-game mantles; expansions add more, so mantle entry is a datalist (free
// text with suggestions) rather than a closed select.
const MANTLES = ['Protector','Seeker','Storyteller','Wanderer'];
// "mantle of the seeker" / "Seeker" → "Seeker"
function mantleName(v){
  return titleCase(v.replace(/^mantle of( the)?\s+/i,'').trim());
}
function knownMantles(){
  return [...new Set([...MANTLES, ...live(culture.mantlePowers).map(e=>e.mantle).filter(Boolean)])].sort();
}

// Codex-entry source families → the card-ID prefix to assume for digits-only entry
const CODEX_SOURCES = {
  'Behemoth card':'BH', 'Journey card':'', 'Night card':'', 'Challenge card':'CH',
  'Investigation card':'IV', 'Item card':'IT', 'Structure':'ST', 'Mantle':'MA', 'Other':'',
};

const JOURNAL_SECTIONS = {
  structure: {label:'Structure', get:()=>culture.structures, set:v=>culture.structures=v, render:()=>renderCulture(), fields:[
    {key:'cardId', label:'Card ID', placeholder:'e.g. ST02', normalize:v=>normalizeCardId(v,'ST')},
    {key:'name',  label:'Name', required:true, placeholder:'e.g. Fire Pit'},
    {key:'notes', label:'Notes', type:'textarea'},
  ]},
  mantle: {label:'Mantle Power', get:()=>culture.mantlePowers, set:v=>culture.mantlePowers=v, render:()=>renderCulture(), fields:[
    {key:'cardId', label:'Card ID', placeholder:'e.g. MA01', normalize:v=>normalizeCardId(v,'MA')},
    {key:'mantle', label:'Mantle', type:'datalist', options:()=>knownMantles(), placeholder:'e.g. Seeker', normalize:v=>mantleName(v)},
    {key:'name', label:'Name', required:true},
    {key:'description', label:'Description', type:'textarea'},
  ]},
  knowledge: {label:'Knowledge Card', get:()=>culture.knowledgeCards, set:v=>culture.knowledgeCards=v, render:()=>renderCulture(), fields:[
    {key:'cardId', label:'Card ID', placeholder:'e.g. KN04', normalize:v=>normalizeCardId(v,'KN')},
    {key:'name', label:'Name', required:true},
  ]},
  taboo: {label:'Taboo', get:()=>culture.taboos, set:v=>culture.taboos=v, render:()=>renderCulture(), fields:[
    {key:'text', label:'Taboo', required:true},
  ]},
  pigment: {label:'Pigment', get:()=>culture.pigments, set:v=>culture.pigments=v, render:()=>renderCulture(), fields:[
    {key:'name', label:'Pigment', required:true, placeholder:'e.g. Red ochre'},
  ]},
  outpost: {label:'Outpost', get:()=>culture.outposts, set:v=>culture.outposts=v, render:()=>renderCulture(), fields:[
    {key:'cardId', label:'Overlay tile ID', placeholder:'e.g. OP01', normalize:v=>normalizeCardId(v,'OP')},
    {key:'name', label:'Name', required:true, placeholder:'e.g. First Camp'},
    {key:'structures', label:'Structures built here', type:'checks',
      options:()=>live(culture.structures).map(s=>({value:s.id,label:s.name})),
      emptyText:'No structures known yet — add structure types under Structures first.'},
    {key:'notes', label:'Notes', type:'textarea'},
  ]},
  codex: {label:'Codex Entry', get:()=>codexEntries, set:v=>codexEntries=v, render:()=>renderCodexEntries(), fields:[
    {key:'entry', label:'Codex entry', required:true, placeholder:'e.g. 117'},
    {key:'title', label:'Title', placeholder:'optional'},
    {key:'sourceCategory', label:'Source type', type:'select', defaultValue:'', options:['',...Object.keys(CODEX_SOURCES)]},
    {key:'sourceId', label:'Source card ID', placeholder:'e.g. BH03', normalize:(v,e)=>normalizeCardId(v,CODEX_SOURCES[e.sourceCategory]||'')},
    {key:'notes', label:'Notes', type:'textarea', rows:3},
  ]},
  behemoth: {label:'Behemoth', get:()=>behemoths, set:v=>behemoths=v, render:()=>renderBehemoths(), fields:[
    {key:'cardId', label:'Card ID', placeholder:'e.g. BH03', normalize:v=>normalizeCardId(v,'BH')},
    {key:'name', label:'Name', required:true},
    {key:'lairHex', label:'Lair hex', placeholder:'e.g. VV02', normalize:v=>normalizeCardId(v), group:'lair'},
    {key:'lairOverlay', label:'Lair overlay tile', placeholder:'tile ID', normalize:v=>normalizeCardId(v), group:'lair'},
    {key:'lairZone', label:'Overlay zone', type:'select', defaultValue:'', options:['','A','B','C'], group:'lair'},
    {key:'demeanor', label:'Demeanor', type:'number', required:true, min:BEHEMOTH_DEMEANOR_MIN, max:BEHEMOTH_DEMEANOR_MAX, defaultValue:BEHEMOTH_DEMEANOR_DEFAULT, placeholder:'1-9'},
    {key:'secrets', label:'Revealed secrets (in reveal order)', type:'secrets'},
    {key:'notes', label:'Notes', type:'textarea'},
  ]},
  challenge: {label:'Challenge', get:()=>challengeRecord, set:v=>challengeRecord=v, render:()=>renderChallenges(), fields:[
    {key:'status', label:'Status', type:'select', defaultValue:'current', options:['current','looming','resolved']},
    {key:'epoch', label:'Epoch', type:'number', placeholder:'e.g. 2'},
    {key:'prepareBy', label:'Prepare by (epoch)', placeholder:'e.g. 3'},
    {key:'name', label:'Name', required:true},
    {key:'cardId', label:'Card ID', placeholder:'e.g. CH08', normalize:v=>normalizeCardId(v,'CH')},
    {key:'goalsCompleted', label:'Goals completed', type:'textarea', rows:3},
    {key:'notes', label:'Notes', type:'textarea'},
  ]},
  looming: {label:'Looming Challenge', get:()=>loomingChallenges, set:v=>loomingChallenges=v, render:()=>renderChallenges(),
    onNew:e=>{e.order=loomingChallenges.reduce((m,x)=>Math.max(m,x.order??-1),-1)+1;}, fields:[
    {key:'name', label:'Name', required:true},
    {key:'cardId', label:'Card ID', normalize:v=>normalizeCardId(v,'CH')},
    {key:'prepareBy', label:'Prepare by (epoch)', placeholder:'e.g. 3'},
    {key:'notes', label:'Notes', type:'textarea'},
  ]},
  investigation: {label:'Investigation', get:()=>investigations, set:v=>investigations=v, render:()=>renderInvestigations(), fields:[
    {key:'omen', label:'Omen (the trigger / sign)', required:true},
    {key:'cardId', label:'Investigation card ID', placeholder:'e.g. IV03', normalize:v=>normalizeCardId(v,'IV')},
    {key:'notes', label:'Notes / findings', type:'textarea', rows:4},
  ]},
  note: {label:'Note Page', get:()=>notePages, set:v=>notePages=v, render:()=>renderNotes(), fields:[
    {key:'title', label:'Title', required:true},
    {key:'body', label:'Text', type:'textarea', rows:12},
  ]},
};

let jeState = null; // {section, id, sourceSection} while the entry modal is open

function jeFieldHtml(f, val){
  const id='je-f-'+f.key;
  const label=`<label>${esc(f.label)}${f.required?' *':''}</label>`;
  if(f.type==='textarea'||f.type==='lines')
    return `<div class="form-group">${label}<textarea class="form-control" id="${id}" rows="${f.rows||3}" placeholder="${esc(f.placeholder||'')}">${esc(val)}</textarea></div>`;
  if(f.type==='select')
    return `<div class="form-group">${label}<select class="form-control" id="${id}">${f.options.map(o=>`<option value="${esc(o)}"${o===val?' selected':''}>${esc(o)||'—'}</option>`).join('')}</select></div>`;
  if(f.type==='checks'){ // multi-pick from a dynamic option list; val is an array of option values
    const opts=typeof f.options==='function'?f.options():f.options;
    if(!opts.length)
      return `<div class="form-group">${label}<p class="journal-empty">${esc(f.emptyText||'Nothing to pick from yet.')}</p></div>`;
    return `<div class="form-group">${label}<div class="je-checks" id="${id}">${opts.map(o=>
      `<label class="je-check"><input type="checkbox" value="${esc(o.value)}"${(val||[]).includes(o.value)?' checked':''}> ${esc(o.label)}</label>`).join('')}</div></div>`;
  }
  if(f.type==='datalist'){ // free text with suggestions — for open-ended sets like mantles
    const opts=typeof f.options==='function'?f.options():f.options;
    return `<div class="form-group">${label}<input class="form-control" id="${id}" list="${id}-list" placeholder="${esc(f.placeholder||'')}" value="${esc(val)}"><datalist id="${id}-list">${opts.map(o=>`<option value="${esc(o)}">`).join('')}</datalist></div>`;
  }
  if(f.type==='secrets'){ // behemoth secrets: repeatable {cardId, name, description} rows
    return `<div class="form-group">${label}
      <div class="je-secrets" id="${id}-rows">${(val||[]).map(jeSecretRowHtml).join('')}</div>
      <button type="button" class="btn btn-sm" onclick="jeAddSecretRow()">+ Add secret</button></div>`;
  }
  const extraAttrs = f.type==='number'
    ? ` min="${f.min??''}" max="${f.max??''}" step="${f.step??1}"`
    : '';
  return `<div class="form-group">${label}<input class="form-control" id="${id}" type="${f.type==='number'?'number':'text'}"${extraAttrs} placeholder="${esc(f.placeholder||'')}" value="${esc(val)}"></div>`;
}

function jeFieldValue(f, v){
  return f.type==='lines' ? (v||[]).join('\n') : (f.type==='checks'||f.type==='secrets') ? (v||[]) : (v??'');
}

// One secret = {cardId, name, description}; legacy secrets are plain strings
// (pre-2026-07-05 saves and copies merged in from older devices) — treat the
// string as the name everywhere.
function secretObj(s){return typeof s==='string'?{name:s}:(s||{});}

function jeSecretRowHtml(s){
  const o=secretObj(s);
  return `<div class="je-secret-row">
    <input class="form-control je-secret-id" placeholder="BT01" value="${esc(o.cardId||'')}">
    <input class="form-control je-secret-name" placeholder="Name" value="${esc(o.name||'')}">
    <input class="form-control je-secret-desc" placeholder="Description" value="${esc(o.description||'')}">
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" title="Remove secret">×</button>
  </div>`;
}
function jeAddSecretRow(){
  const rows=document.getElementById('je-f-secrets-rows');
  if(rows) rows.insertAdjacentHTML('beforeend', jeSecretRowHtml());
}

// Render a spec's fields; consecutive fields sharing a `group` sit side by
// side in one .form-row (e.g. the behemoth lair hex / overlay / zone trio).
function jeFieldsHtml(spec, entry){
  const html=[];
  const fieldHtml=f=>{
    const v=entry ? entry[f.key] : (f.defaultValue ?? undefined);
    return jeFieldHtml(f, jeFieldValue(f, v));
  };
  for(let i=0;i<spec.fields.length;i++){
    const f=spec.fields[i];
    if(f.group){
      const run=[fieldHtml(f)];
      while(i+1<spec.fields.length && spec.fields[i+1].group===f.group) run.push(fieldHtml(spec.fields[++i]));
      html.push(`<div class="form-row">${run.join('')}</div>`);
    } else html.push(fieldHtml(f));
  }
  return html.join('');
}

// Read every field of the entry form back into `entry`, validating as we go.
// Shared by saveJournalEntry and saveChallengeEntry. Returns null (after an
// alert) when validation fails.
function readJournalFields(spec, entry){
  for(const f of spec.fields){
    let v;
    if(f.type==='checks'){
      v=[...document.querySelectorAll('#je-f-'+f.key+' input:checked')].map(i=>i.value);
    }else if(f.type==='secrets'){
      v=[...document.querySelectorAll('#je-f-'+f.key+'-rows .je-secret-row')].map(r=>({
        cardId:normalizeCardId(r.querySelector('.je-secret-id').value,'BT'),
        name:r.querySelector('.je-secret-name').value.trim(),
        description:r.querySelector('.je-secret-desc').value.trim(),
      })).filter(s=>s.cardId||s.name||s.description);
    }else{
      v=document.getElementById('je-f-'+f.key).value;
      if(f.type==='lines') v=v.split('\n').map(s=>s.trim()).filter(Boolean);
      else v=v.trim();
    }
    if(f.required&&((f.type==='lines'||f.type==='checks'||f.type==='secrets')?!v.length:!v)){alert(`${f.label} is required.`);return null;}
    if(f.type==='number'&&v){
      const n=Number(v);
      if(!Number.isFinite(n)){alert(`${f.label} must be a number.`);return null;}
      const min=f.min??n;
      const max=f.max??n;
      if(n<min||n>max){alert(`${f.label} must be between ${min} and ${max}.`);return null;}
      v=Math.round(n);
    }
    if(f.normalize&&typeof v==='string'&&v) v=f.normalize(v, entry);
    entry[f.key]=v;
  }
  return entry;
}

function openJournalEntry(section, id){
  if(section==='challenge' || section==='looming') return openChallengeEntry(section, id);
  const spec=JOURNAL_SECTIONS[section];
  const entry=id?spec.get().find(e=>e.id===id):null;
  if(id&&!entry) return;
  jeState={section, id:id||null};
  document.getElementById('je-title').textContent=(entry?'Edit ':'Add ')+spec.label;
  document.getElementById('je-fields').innerHTML=jeFieldsHtml(spec, entry);
  document.getElementById('je-overlay').classList.remove('hidden');
  document.getElementById('je-f-'+spec.fields[0].key)?.focus();
}

function openChallengeEntry(sourceSection='challenge', id){
  const isLooming = sourceSection==='looming';
  const sourceList = isLooming ? loomingChallenges : challengeRecord;
  const raw = id ? sourceList.find(e=>e.id===id) : null;
  if(id && !raw) return;
  const entry = raw ? {
    ...raw,
    status: isLooming ? 'looming' : (raw.status || 'current'),
    prepareBy: isLooming ? (raw.prepareBy || '') : (raw.prepareBy || ''),
    epoch: isLooming ? '' : (raw.epoch ?? ''),
    goalsCompleted: raw.goalsCompleted || '',
  } : null;
  const spec=JOURNAL_SECTIONS.challenge;
  jeState={section:'challenge', sourceSection, id:id||null};
  document.getElementById('je-title').textContent=(entry?'Edit ':'Add ')+spec.label;
  document.getElementById('je-fields').innerHTML=jeFieldsHtml(spec, entry);
  document.getElementById('je-overlay').classList.remove('hidden');
  document.getElementById('je-f-'+spec.fields[0].key)?.focus();
}

function closeJournalEntry(){document.getElementById('je-overlay').classList.add('hidden');jeState=null;}

function saveJournalEntry(){
  if(!jeState) return;
  if(jeState.section==='challenge') return saveChallengeEntry();
  const spec=JOURNAL_SECTIONS[jeState.section];
  const entry=readJournalFields(spec, {id:jeState.id||genId(), updatedAt:Date.now()});
  if(!entry) return;
  if(!jeState.id&&spec.onNew) spec.onNew(entry);
  const list=spec.get();
  const i=list.findIndex(e=>e.id===entry.id);
  if(i!==-1) list[i]={...list[i],...entry}; // keep fields not on the form (e.g. looming order)
  else list.push(entry);
  save(); closeJournalEntry(); spec.render();
}

function saveChallengeEntry(){
  const spec=JOURNAL_SECTIONS.challenge;
  const entry=readJournalFields(spec, {id:jeState.id||genId(), updatedAt:Date.now()});
  if(!entry) return;
  if(entry.status!=='looming' && !entry.epoch){alert('Epoch is required for current and resolved challenges.');return;}
  const sourceSection=jeState.sourceSection||'challenge';
  if(sourceSection==='looming'){
    const old=loomingChallenges.find(e=>e.id===entry.id);
    if(old && entry.status!=='looming'){ old.deleted=true; old.updatedAt=Date.now(); }
  } else {
    const old=challengeRecord.find(e=>e.id===entry.id);
    if(old && entry.status==='looming'){ old.deleted=true; old.updatedAt=Date.now(); }
  }
  if(entry.status==='looming'){
    const loomingEntry={
      id: entry.id,
      name: entry.name,
      cardId: entry.cardId||'',
      prepareBy: entry.prepareBy||'',
      notes: entry.notes||'',
      order: (() => {
        const existing=loomingChallenges.find(e=>e.id===entry.id);
        return existing?.order ?? loomingChallenges.reduce((m,x)=>Math.max(m,x.order??-1),-1)+1;
      })(),
      updatedAt: entry.updatedAt,
    };
    const i=loomingChallenges.findIndex(e=>e.id===entry.id);
    if(i!==-1) loomingChallenges[i]={...loomingChallenges[i],...loomingEntry, deleted:false};
    else loomingChallenges.push(loomingEntry);
  } else {
    const challengeEntry={
      id: entry.id,
      status: entry.status||'current',
      epoch: entry.epoch,
      name: entry.name,
      cardId: entry.cardId||'',
      goalsCompleted: entry.goalsCompleted||'',
      notes: entry.notes||'',
      updatedAt: entry.updatedAt,
    };
    const i=challengeRecord.findIndex(e=>e.id===entry.id);
    if(i!==-1) challengeRecord[i]={...challengeRecord[i],...challengeEntry, deleted:false};
    else challengeRecord.push(challengeEntry);
  }
  save(); closeJournalEntry(); renderChallenges();
}

function jeLabelOf(e){return e.name||e.title||e.omen||e.text||(e.entry?`Entry ${e.entry}`:'entry');}

function deleteJournalEntry(section, id){
  const spec=JOURNAL_SECTIONS[section];
  const e=spec.get().find(x=>x.id===id&&!x.deleted);
  if(!e) return;
  e.deleted=true; e.updatedAt=Date.now();
  save(); spec.render();
  showUndoToast(`Deleted ${spec.label.toLowerCase()} "${jeLabelOf(e)}"`,()=>restoreJournalEntry(section,id));
}

function restoreJournalEntry(section, id){
  const spec=JOURNAL_SECTIONS[section];
  const e=spec.get().find(x=>x.id===id&&x.deleted);
  if(!e) return;
  delete e.deleted; e.updatedAt=Date.now(); // the restore must also win merges
  save(); spec.render();
}

function deletedJournalItems(section, list){
  return (list||[]).filter(e=>e.deleted).map(e=>
    ({label:esc(jeLabelOf(e)), restore:`restoreJournalEntry('${section}','${e.id}')`}));
}

function journalCardActions(section, id){
  return `<div class="journal-actions">
    <button class="btn btn-sm" onclick="openJournalEntry('${section}','${id}')">Edit</button>
    <button class="btn btn-sm btn-danger" onclick="deleteJournalEntry('${section}','${id}')">Delete</button>
  </div>`;
}

function challengeStatus(c){
  return c.status==='resolved' ? 'resolved' : 'current';
}

function setChallengeStatus(id, status){
  const c=challengeRecord.find(x=>x.id===id&&!x.deleted);
  if(!c) return;
  c.status=status;
  c.updatedAt=Date.now();
  save();
  renderChallenges();
}

function promoteLoomingToCurrent(id){
  const looming=loomingChallenges.find(x=>x.id===id&&!x.deleted);
  if(!looming) return;
  challengeRecord.push({
    id: genId(),
    status:'current',
    epoch:'',
    name: looming.name,
    cardId: looming.cardId||'',
    goalsCompleted:'',
    notes: looming.notes||'',
    updatedAt: Date.now(),
  });
  looming.deleted=true;
  looming.updatedAt=Date.now();
  save();
  renderChallenges();
}

function clampBehemothDemeanor(v){
  const n=Number(v);
  if(!Number.isFinite(n)) return null;
  return Math.min(BEHEMOTH_DEMEANOR_MAX, Math.max(BEHEMOTH_DEMEANOR_MIN, Math.round(n)));
}

function behemothDemeanorTrackHtml(value){
  const demeanor=clampBehemothDemeanor(value);
  if(demeanor==null) return '';
  return `<div class="behemoth-demeanor">
    <div class="behemoth-demeanor-number">Demeanor ${demeanor}</div>
    <div class="behemoth-demeanor-track" aria-hidden="true">${Array.from({length:BEHEMOTH_DEMEANOR_MAX},(_,i)=>{
      const filled=i<demeanor;
      const color=BEHEMOTH_DEMEANOR_COLORS[i];
      const style=filled?` style="background:${color};border-color:${color}"`:'';
      return `<span class="behemoth-demeanor-segment${filled?' is-filled':''}"${style}></span>`;
    }).join('')}</div>
  </div>`;
}

function adjustBehemothDemeanor(id, delta){
  const e=behemoths.find(x=>x.id===id&&!x.deleted);
  if(!e) return;
  const current=clampBehemothDemeanor(e.demeanor) ?? BEHEMOTH_DEMEANOR_MIN;
  e.demeanor=Math.min(BEHEMOTH_DEMEANOR_MAX, Math.max(BEHEMOTH_DEMEANOR_MIN, current+delta));
  e.updatedAt=Date.now();
  save();
  renderBehemoths();
}

// ── Culture ──
function saveTribeName(v){
  culture.tribeName=v.trim();
  culture.updatedAt=Date.now();
  save();
}

function cultureRowHtml(sec, e, fmt){
  return `
        <div class="culture-row">
          <div style="flex:1">${fmt(e)}</div>
          <button class="btn btn-sm" onclick="openJournalEntry('${sec}','${e.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteJournalEntry('${sec}','${e.id}')">Del</button>
        </div>`;
}

// Mantle powers grouped by their parent mantle; powers without one gather
// under "Unassigned". A flat list is kept while nothing is assigned yet.
function mantlePowersHtml(list, fmt){
  const groups={};
  for(const e of list)(groups[e.mantle||'']??=[]).push(e);
  const names=Object.keys(groups).filter(Boolean).sort((a,b)=>a.localeCompare(b));
  if(!names.length) return list.map(e=>cultureRowHtml('mantle',e,fmt)).join('');
  const section=(title,es)=>`<div class="culture-group-title">${esc(title)}</div>`+es.map(e=>cultureRowHtml('mantle',e,fmt)).join('');
  return names.map(m=>section(`Mantle of the ${m}`,groups[m])).join('')
    +(groups['']?section('Unassigned',groups['']):'');
}

function outpostStructureNames(e){
  return (e.structures||[])
    .map(id=>(culture.structures||[]).find(s=>s.id===id&&!s.deleted)?.name)
    .filter(Boolean);
}

function renderCulture(){
  document.getElementById('culture-tribe').value=culture.tribeName||'';
  // [section, title, entries, row formatter, optional custom list renderer]
  const idChip=e=>e.cardId?`<span class="recipe-code" style="font-size:.75rem">${esc(e.cardId)}</span> `:'';
  const blocks=[
    ['structure','Structures',live(culture.structures),e=>`${idChip(e)}<strong>${esc(e.name)}</strong>${e.notes?` — ${esc(e.notes)}`:''}`],
    ['outpost','Outposts',live(culture.outposts),e=>{
      const names=outpostStructureNames(e);
      return `${idChip(e)}<strong>${esc(e.name)}</strong>${names.length?` — ${esc(names.join(', '))}`:' — <em>no structures yet</em>'}${e.notes?`<div class="culture-row-notes">${esc(e.notes)}</div>`:''}`;
    }],
    ['mantle','Mantle Powers',live(culture.mantlePowers),e=>`${idChip(e)}<strong>${esc(e.name)}</strong>${e.description?` — ${esc(e.description)}`:''}`,mantlePowersHtml],
    ['knowledge','Knowledge Cards',live(culture.knowledgeCards),e=>`${e.cardId?`<span class="recipe-code" style="font-size:.75rem">${esc(e.cardId)}</span> `:''}<strong>${esc(e.name)}</strong>`],
    ['taboo','Taboos',live(culture.taboos),e=>esc(e.text)],
    ['pigment','Pigments',live(culture.pigments),e=>esc(e.name)],
  ];
  const deletedBlock=recentlyDeletedHtml([
    ['structure',culture.structures],['outpost',culture.outposts],['mantle',culture.mantlePowers],
    ['knowledge',culture.knowledgeCards],['taboo',culture.taboos],['pigment',culture.pigments],
  ].flatMap(([sec,list])=>deletedJournalItems(sec,list)));
  document.getElementById('culture-lists').innerHTML=blocks.map(([sec,title,list,fmt,listHtml])=>`
    <div class="culture-block">
      <h3>${title}<button class="btn btn-sm" onclick="openJournalEntry('${sec}')">+ Add</button></h3>
      ${list.length?(listHtml?listHtml(list,fmt):list.map(e=>cultureRowHtml(sec,e,fmt)).join(''))
      :'<p class="journal-empty">None yet.</p>'}
    </div>`).join('')+deletedBlock;
}

// ── Behemoths ──
function renderBehemoths(){
  const el=document.getElementById('behemoths-list');
  const list=live(behemoths);
  el.innerHTML=(list.length?list.map(e=>`
    <div class="journal-card">
      <div class="journal-card-title">${e.cardId?`<span class="recipe-code" style="font-size:.75rem">${esc(e.cardId)}</span> `:''}${esc(e.name)}</div>
      ${clampBehemothDemeanor(e.demeanor)!=null?`
        <div class="behemoth-demeanor-row">
          ${behemothDemeanorTrackHtml(e.demeanor)}
          <div class="behemoth-demeanor-actions">
            <button class="btn btn-sm" onclick="adjustBehemothDemeanor('${e.id}',-1)" title="Placate">-</button>
            <button class="btn btn-sm" onclick="adjustBehemothDemeanor('${e.id}',1)" title="Aggravate">+</button>
          </div>
        </div>`:''}
      ${(e.lairHex||e.lairOverlay||e.lairZone)?`<div class="journal-card-sub">Lair: ${esc([
        e.lairHex, e.lairOverlay?`overlay ${e.lairOverlay}`:'', e.lairZone?`zone ${e.lairZone}`:'',
      ].filter(Boolean).join(' · '))}</div>`:''}
      ${(e.secrets||[]).length?`<div class="journal-card-sub">Revealed secrets</div><ol class="secret-list">${e.secrets.map(s=>{
        const o=secretObj(s);
        return `<li>${o.cardId?`<span class="recipe-code" style="font-size:.7rem">${esc(o.cardId)}</span> `:''}<strong>${esc(o.name||'')}</strong>${o.description?` — ${esc(o.description)}`:''}</li>`;
      }).join('')}</ol>`:''}
      ${e.notes?`<div class="journal-card-body">${esc(e.notes)}</div>`:''}
      ${journalCardActions('behemoth',e.id)}
    </div>`).join('')
  :'<p class="journal-empty">No behemoths encountered yet.</p>')
  +recentlyDeletedHtml(deletedJournalItems('behemoth',behemoths));
}

// ── Challenge Record (grouped by epoch, newest first, newest open) ──
function renderChallenges(){
  const el=document.getElementById('challenges-list');
  const current=live(challengeRecord)
    .filter(c=>challengeStatus(c)==='current')
    .sort((a,b)=>Number(b.epoch||0)-Number(a.epoch||0) || (b.updatedAt||0)-(a.updatedAt||0));
  const resolved=live(challengeRecord)
    .filter(c=>challengeStatus(c)==='resolved')
    .sort((a,b)=>Number(b.epoch||0)-Number(a.epoch||0) || (b.updatedAt||0)-(a.updatedAt||0));
  const looming=loomingSorted();
  const deletedBlock=recentlyDeletedHtml([
    ...deletedJournalItems('challenge',challengeRecord),
    ...deletedJournalItems('looming',loomingChallenges),
  ]);
  if(!current.length&&!resolved.length&&!looming.length){
    el.innerHTML='<p class="journal-empty">No challenges recorded yet.</p>'+deletedBlock;
    return;
  }
  const currentHtml=current.length?`
    <div class="challenge-section">
      <h3 class="challenge-section-title">Current</h3>
      <div class="journal-grid">${current.map(c=>`
        <div class="journal-card challenge-card status-current">
          <div class="challenge-card-head">
            <div class="journal-card-title">${esc(c.name)}</div>
            <span class="challenge-status-chip status-current">Current</span>
          </div>
          <div class="journal-card-sub">${c.cardId?`Card ${esc(c.cardId)}`:''}${c.cardId&&c.epoch?' · ':''}${c.epoch?`Epoch ${esc(c.epoch)}`:''}</div>
          ${c.goalsCompleted?`<div class="journal-card-sub">Goals completed</div><div class="journal-card-body">${esc(c.goalsCompleted)}</div>`:''}
          ${c.notes?`<div class="journal-card-body">${esc(c.notes)}</div>`:''}
          <div class="journal-actions">
            <button class="btn btn-sm" onclick="setChallengeStatus('${c.id}','resolved')">Resolve</button>
            <button class="btn btn-sm" onclick="openChallengeEntry('challenge','${c.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteJournalEntry('challenge','${c.id}')">Delete</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`:'';
  const loomingHtml=looming.length?`
    <div class="challenge-section">
      <h3 class="challenge-section-title">Looming</h3>
      <div class="looming-list">${looming.map((e,i)=>`
        <div class="journal-card looming-card status-looming">
          <div class="looming-order">
            <button class="btn btn-sm"${i===0?' disabled':''} onclick="moveLooming('${e.id}',-1)">▲</button>
            <button class="btn btn-sm"${i===looming.length-1?' disabled':''} onclick="moveLooming('${e.id}',1)">▼</button>
          </div>
          <div class="looming-main">
            <div class="challenge-card-head">
              <div class="journal-card-title">${i+1}. ${esc(e.name)}</div>
              <span class="challenge-status-chip status-looming">Looming</span>
            </div>
            <div class="journal-card-sub">${e.cardId?`Card ${esc(e.cardId)}`:''}${e.cardId&&e.prepareBy?' · ':''}${e.prepareBy?`Prepare by epoch ${esc(e.prepareBy)}`:''}</div>
            ${e.notes?`<div class="journal-card-body">${esc(e.notes)}</div>`:''}
            <div class="journal-actions">
              <button class="btn btn-sm" onclick="promoteLoomingToCurrent('${e.id}')">Make Current</button>
              <button class="btn btn-sm" onclick="openChallengeEntry('looming','${e.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteJournalEntry('looming','${e.id}')">Delete</button>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>`:'';
  const byEpoch={};
  for(const c of resolved)(byEpoch[c.epoch||'—']??=[]).push(c);
  const epochs=Object.keys(byEpoch).sort((a,b)=>{
    if(a==='—') return 1;
    if(b==='—') return -1;
    return Number(b)-Number(a);
  });
  const resolvedHtml=resolved.length?`
    <div class="challenge-section">
      <h3 class="challenge-section-title">Resolved</h3>
      ${epochs.map((ep,i)=>`
    <details class="epoch-group"${i===0?' open':''}>
      <summary>Epoch ${esc(ep)} — ${byEpoch[ep].length} challenge${byEpoch[ep].length>1?'s':''}</summary>
      <div class="journal-grid">${byEpoch[ep].map(c=>`
        <div class="journal-card challenge-card status-resolved">
          <div class="challenge-card-head">
            <div class="journal-card-title">${esc(c.name)}</div>
            <span class="challenge-status-chip status-resolved">Resolved</span>
          </div>
          ${c.cardId?`<div class="journal-card-sub">Card ${esc(c.cardId)}</div>`:''}
          ${c.goalsCompleted?`<div class="journal-card-sub">Goals completed</div><div class="journal-card-body">${esc(c.goalsCompleted)}</div>`:''}
          ${c.notes?`<div class="journal-card-body">${esc(c.notes)}</div>`:''}
          <div class="journal-actions">
            <button class="btn btn-sm" onclick="setChallengeStatus('${c.id}','current')">Reopen</button>
            <button class="btn btn-sm" onclick="openChallengeEntry('challenge','${c.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteJournalEntry('challenge','${c.id}')">Delete</button>
          </div>
        </div>`).join('')}
      </div>
    </details>`).join('')}
    </div>`:'';
  el.innerHTML=currentHtml+loomingHtml+resolvedHtml+deletedBlock;
}

// ── Looming Challenges (ordered, ▲▼ reorder) ──
function loomingSorted(){return live(loomingChallenges).sort((a,b)=>(a.order??0)-(b.order??0));}

function moveLooming(id, dir){
  const s=loomingSorted();
  const i=s.findIndex(e=>e.id===id), j=i+dir;
  if(i<0||j<0||j>=s.length) return;
  [s[i],s[j]]=[s[j],s[i]];
  s.forEach((e,idx)=>{e.order=idx;e.updatedAt=Date.now();});
  save(); renderChallenges();
}

// ── Investigations ──
function renderInvestigations(){
  const el=document.getElementById('investigations-list');
  const list=live(investigations);
  el.innerHTML=(list.length?list.map(e=>`
    <div class="journal-card">
      <div class="journal-card-title">${esc(e.omen)}</div>
      ${e.cardId?`<div class="journal-card-sub">Card ${esc(e.cardId)}</div>`:''}
      ${e.notes?`<div class="journal-card-body">${esc(e.notes)}</div>`:''}
      ${journalCardActions('investigation',e.id)}
    </div>`).join('')
  :'<p class="journal-empty">No investigations recorded yet.</p>')
  +recentlyDeletedHtml(deletedJournalItems('investigation',investigations));
}

// ── Codex Entries Read ──
// Sorted by entry number so "have we read 117?" is a quick scan.
function renderCodexEntries(){
  const el=document.getElementById('codex-list');
  const list=live(codexEntries).sort((a,b)=>{
    const na=parseInt(a.entry,10), nb=parseInt(b.entry,10);
    if(Number.isFinite(na)&&Number.isFinite(nb)&&na!==nb) return na-nb;
    return String(a.entry||'').localeCompare(String(b.entry||''));
  });
  el.innerHTML=(list.length?list.map(e=>`
    <div class="journal-card">
      <div class="journal-card-title">Entry ${esc(e.entry)}${e.title?` — ${esc(e.title)}`:''}</div>
      ${(e.sourceCategory||e.sourceId)?`<div class="journal-card-sub">Source: ${esc([e.sourceCategory,e.sourceId].filter(Boolean).join(' · '))}</div>`:''}
      ${e.notes?`<div class="journal-card-body">${esc(e.notes)}</div>`:''}
      ${journalCardActions('codex',e.id)}
    </div>`).join('')
  :'<p class="journal-empty">No codex entries recorded yet. When a card sends you to the codex, log it here.</p>')
  +recentlyDeletedHtml(deletedJournalItems('codex',codexEntries));
}

// ── Cave Wall ──────────────────────────────────────
// Vector cave drawings. Strokes are captured with PointerEvents in a fixed
// 1000×1000 logical space and rendered as SVG, so drawings are a few KB of
// JSON that export, merge, and Drive-sync like every other section.
// Stroke: {c: pencil index, w: width, pts: [x,y,x,y,...] integer coords}.
const CAVE_PENCILS=[
  {name:'Black',      hex:'#2c1d1c'},
  {name:'Blue',       hex:'#4a90c4'},
  {name:'Red',        hex:'#c04a4a'},
  {name:'Dark Green', hex:'#3d6b47'},
  {name:'Orange',     hex:'#c47a3a'},
  {name:'Silver',     hex:'#9a9ea6'},
];
const CAVE_WIDTHS=[6,14,28]; // stroke widths in logical units
const CAVE_SIZE=1000;

// The full mark list from the game's reference sheet (Codex p.114); every name
// has a tracing image at assets/images/marks/<Name>.webp. Names added here
// without an image still work — they just pre-fill the drawing name.
const MARKS=[
  'Arrival', 'Battle', 'Beastslayer', 'Behemoth’s Blood', 'BH1', 'BH2',
  'BH3', 'BH4', 'Blackened Sky', 'Blaze', 'Bond', 'Broken Earth',
  'Caravan', 'Caution', 'City', 'Conclusion', 'Coral', 'Cultivation',
  'Defender', 'Discovery', 'Doom', 'Exodus', 'Familiar', 'Feast',
  'Filch', 'Glacier', 'Growth', 'Harrowing', 'Herbalism', 'Hold',
  'Hunter', 'Ice', 'Mediator', 'Misfortune', 'Mists', 'Moonblood',
  'Mount', 'Mystery', 'Mystic', 'Orrox', 'Plague', 'Plenty',
  'Prophecy', 'Protector', 'Rebellion', 'Relic', 'Rescuer', 'Schism',
  'Scout', 'Scribe', 'Seeker', 'Skyreach Plateau', 'Songweaver', 'Starlit Sea',
  'Storyteller', 'Taboo', 'Tangle', 'Underworld', 'Verdant Vale', 'Volcanic Wastes',
  'Wanderer', 'Wrath',
];
function markImagePath(name){return encodeURI(`assets/images/marks/${name}.webp`);}

let cwState=null;       // {id,strokes,cur,pointerId,colorIdx,widthIdx,redo,penSeen,dirty} while editor open
let cwCanvasReady=false;

// Smooth a flat point list into an SVG path (quadratics through midpoints).
function cwStrokePath(pts){
  if(pts.length<2) return '';
  if(pts.length===2) return `M${pts[0]} ${pts[1]} l.01 0`; // dot via round linecap
  let d=`M${pts[0]} ${pts[1]}`;
  if(pts.length===4) return d+` L${pts[2]} ${pts[3]}`;
  for(let i=2;i<pts.length-2;i+=2)
    d+=` Q${pts[i]} ${pts[i+1]} ${(pts[i]+pts[i+2])/2} ${(pts[i+1]+pts[i+3])/2}`;
  return d+` L${pts[pts.length-2]} ${pts[pts.length-1]}`;
}

function cwStrokesInner(strokes){
  return strokes.map(s=>
    `<path d="${cwStrokePath(s.pts)}" stroke="${CAVE_PENCILS[s.c]?.hex||'#2c1d1c'}" stroke-width="${s.w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  ).join('');
}

function cwSvg(strokes){
  return `<svg viewBox="0 0 ${CAVE_SIZE} ${CAVE_SIZE}" preserveAspectRatio="xMidYMid meet">${cwStrokesInner(strokes)}</svg>`;
}

// View order is a per-device preference, not shared state — it lives in its
// own localStorage key, outside the synced save.
let caveWallSort=(()=>{try{return localStorage.getItem('stonesaga_cave_sort')||'added';}catch{return 'added';}})();
function toggleCaveWallSort(){
  caveWallSort=caveWallSort==='name'?'added':'name';
  try{localStorage.setItem('stonesaga_cave_sort',caveWallSort);}catch{/* view pref only */}
  renderCaveWall();
}

function renderCaveWall(){
  const el=document.getElementById('cave-wall-list');
  const sortBtn=document.getElementById('cave-sort');
  if(sortBtn) sortBtn.textContent=caveWallSort==='name'?'Sorted: A–Z':'Sorted: oldest first';
  // Default: creation order, oldest first — the wall fills up as the saga
  // unfolds. Alphabetical helps find a specific mark once the wall is large.
  const list=live(caveWall).sort(caveWallSort==='name'
    ?(a,b)=>(a.name||'').localeCompare(b.name||'')
    :(a,b)=>(a.addedAt||0)-(b.addedAt||0));
  el.innerHTML=(list.length?list.map(e=>`
    <div class="cave-card">
      <div class="cave-thumb" onclick="openCaveEditor('${e.id}')" title="Tap to edit">${cwSvg(e.strokes||[])}</div>
      <div class="cave-card-name">${esc(e.name)}<button class="cave-del" onclick="deleteCaveDrawing('${e.id}')" title="Delete">×</button></div>
    </div>`).join('')
  :'<p class="journal-empty">Nothing painted on the cave wall yet.</p>')
  +recentlyDeletedHtml(caveWall.filter(e=>e.deleted).map(e=>
    ({label:esc(e.name), restore:`restoreCaveDrawing('${e.id}')`})));
}

function deleteCaveDrawing(id){
  const e=caveWall.find(x=>x.id===id&&!x.deleted);
  if(!e) return;
  e.deleted=true; e.updatedAt=Date.now();
  save(); renderCaveWall();
  showUndoToast(`Deleted "${e.name}"`,()=>restoreCaveDrawing(id));
}
function restoreCaveDrawing(id){
  const e=caveWall.find(x=>x.id===id&&x.deleted);
  if(!e) return;
  delete e.deleted; e.updatedAt=Date.now(); // the restore must also win merges
  save(); renderCaveWall();
}

// ── Cave Wall editor ──
function openCaveEditor(id){
  const e=id?caveWall.find(x=>x.id===id):null;
  if(id&&!e) return;
  cwState={
    id:id||null,
    strokes:e?(e.strokes||[]).map(s=>({c:s.c,w:s.w,pts:[...s.pts]})):[],
    cur:null, pointerId:null, colorIdx:0, widthIdx:1, redo:[], penSeen:false, dirty:false,
    mark:(e&&MARKS.includes(e.name))?e.name:'', traceHidden:false, // re-trace when the drawing is named after a mark
  };
  document.getElementById('cw-name').value=e?e.name:'';
  document.getElementById('cw-mark').innerHTML='<option value="">Copy a mark…</option>'+
    MARKS.map(m=>`<option value="${esc(m)}"${m===cwState.mark?' selected':''}>${esc(m)}</option>`).join('');
  cwInitCanvas();
  document.body.classList.add('cave-editor-open');
  document.getElementById('cave-overlay').classList.remove('hidden');
  cwFitCanvas();
  cwRenderTools(); cwRender();
}

function closeCaveEditor(){
  if(!cwState) return;
  if(cwState.dirty&&!confirm('Discard changes to this drawing?')) return;
  document.getElementById('cave-overlay').classList.add('hidden');
  document.body.classList.remove('cave-editor-open');
  cwState=null;
}

function saveCaveDrawing(){
  if(!cwState) return;
  const name=document.getElementById('cw-name').value.trim();
  if(!name){alert('Give the drawing a name.');return;}
  // Simplify on save too — compacts legacy drawings recorded before cwSimplify
  const strokes=cwState.strokes.map(s=>({...s,pts:cwSimplify(s.pts)}));
  if(cwState.id){
    const e=caveWall.find(x=>x.id===cwState.id);
    if(e){e.name=name;e.strokes=strokes;e.updatedAt=Date.now();}
  }else{
    caveWall.push({id:genId(),name,strokes,addedAt:Date.now(),updatedAt:Date.now()});
  }
  document.getElementById('cave-overlay').classList.add('hidden');
  document.body.classList.remove('cave-editor-open');
  cwState=null;
  save(); renderCaveWall();
}

// Square canvas sized in JS so pointer→viewBox mapping stays a simple linear scale.
function cwFitCanvas(){
  const wrap=document.getElementById('cw-canvas-wrap'), svg=document.getElementById('cw-canvas');
  if(!wrap||!svg||document.getElementById('cave-overlay').classList.contains('hidden')) return;
  const s=Math.max(1,Math.floor(Math.min(wrap.clientWidth,wrap.clientHeight)));
  svg.style.width=s+'px'; svg.style.height=s+'px';
}
window.addEventListener('resize',cwFitCanvas);

function cwRenderTools(){
  document.getElementById('cw-palette').innerHTML=CAVE_PENCILS.map((p,i)=>
    `<button class="cave-swatch${i===cwState.colorIdx?' active':''}" style="background:${p.hex}" title="${p.name}" onclick="cwSetColor(${i})"></button>`).join('');
  document.getElementById('cw-widths').innerHTML=CAVE_WIDTHS.map((w,i)=>
    `<button class="cave-width-btn${i===cwState.widthIdx?' active':''}" onclick="cwSetWidth(${i})"><span class="cave-width-dot" style="width:${5+i*5}px;height:${5+i*5}px;background:${CAVE_PENCILS[cwState.colorIdx].hex}"></span></button>`).join('');
}
function cwSetColor(i){if(cwState){cwState.colorIdx=i;cwRenderTools();}}
function cwSetWidth(i){if(cwState){cwState.widthIdx=i;cwRenderTools();}}

// Choosing a mark pre-fills the drawing name and lays a ghosted tracing
// underlay in the canvas. The underlay is never part of the saved drawing.
function cwSetMark(name){
  if(!cwState) return;
  cwState.mark=name; cwState.traceHidden=false;
  if(name) document.getElementById('cw-name').value=name;
  cwRender();
}

function cwToggleTrace(){
  if(!cwState) return;
  cwState.traceHidden=!cwState.traceHidden;
  cwRender();
}

// Redraw committed strokes; the in-progress stroke updates a dedicated live path.
function cwRender(){
  const svg=document.getElementById('cw-canvas');
  const trace=(cwState.mark&&!cwState.traceHidden)
    ? `<image href="${esc(markImagePath(cwState.mark))}" x="0" y="0" width="${CAVE_SIZE}" height="${CAVE_SIZE}" opacity="0.35" preserveAspectRatio="xMidYMid meet"/>`
    : '';
  svg.innerHTML=trace+cwStrokesInner(cwState.strokes)+'<path id="cw-live" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  document.getElementById('cw-undo').disabled=!cwState.strokes.length;
  document.getElementById('cw-redo').disabled=!cwState.redo.length;
  const tbtn=document.getElementById('cw-trace-toggle');
  tbtn.style.display=cwState.mark?'':'none';
  tbtn.textContent=cwState.traceHidden?'Show mark':'Hide mark';
}

function cwDrawLive(){
  const live=document.getElementById('cw-live');
  if(!live||!cwState?.cur) return;
  live.setAttribute('d',cwStrokePath(cwState.cur.pts));
  live.setAttribute('stroke',CAVE_PENCILS[cwState.cur.c].hex);
  live.setAttribute('stroke-width',cwState.cur.w);
}

function cwUndo(){if(!cwState||!cwState.strokes.length)return;cwState.redo.push(cwState.strokes.pop());cwState.dirty=true;cwRender();}
function cwRedo(){if(!cwState||!cwState.redo.length)return;cwState.strokes.push(cwState.redo.pop());cwState.dirty=true;cwRender();}
function cwClear(){
  if(!cwState||!cwState.strokes.length)return;
  if(!confirm('Clear the whole drawing?'))return;
  cwState.redo=[];cwState.strokes=[];cwState.dirty=true;cwRender();
}

function cwPoint(e,svg){
  const r=svg.getBoundingClientRect();
  const x=Math.round(Math.min(CAVE_SIZE,Math.max(0,(e.clientX-r.left)/r.width*CAVE_SIZE)));
  const y=Math.round(Math.min(CAVE_SIZE,Math.max(0,(e.clientY-r.top)/r.height*CAVE_SIZE)));
  return [x,y];
}

// Pointer sampling keeps near-every-pixel points; Ramer–Douglas–Peucker at
// ~1.5 units in the 1000-unit space drops most of them with no visible change
// (rendering smooths through midpoints anyway). Strokes are 97% of save size,
// so this is the main defence against the localStorage quota.
const CW_SIMPLIFY_EPS=1.5;
function cwSimplify(pts,eps=CW_SIMPLIFY_EPS){
  const n=pts.length/2;
  if(n<=2) return pts;
  const keep=new Uint8Array(n); keep[0]=keep[n-1]=1;
  const stack=[[0,n-1]];
  while(stack.length){
    const [a,b]=stack.pop();
    const ax=pts[2*a],ay=pts[2*a+1],dx=pts[2*b]-ax,dy=pts[2*b+1]-ay;
    const len=Math.hypot(dx,dy)||1e-9;
    let maxD=0,idx=-1;
    for(let i=a+1;i<b;i++){
      const d=Math.abs((pts[2*i]-ax)*dy-(pts[2*i+1]-ay)*dx)/len;
      if(d>maxD){maxD=d;idx=i;}
    }
    if(maxD>eps){keep[idx]=1;stack.push([a,idx],[idx,b]);}
  }
  const out=[];
  for(let i=0;i<n;i++) if(keep[i]) out.push(pts[2*i],pts[2*i+1]);
  return out;
}

// Palm rejection: once a real pen has been seen this session, ignore touch pointers.
function cwIgnorePointer(e){
  if(e.pointerType==='pen') cwState.penSeen=true;
  return e.pointerType==='touch'&&cwState.penSeen;
}

function cwPointerDown(e){
  if(!cwState||cwIgnorePointer(e)||cwState.pointerId!=null) return;
  e.preventDefault();
  const svg=document.getElementById('cw-canvas');
  try{svg.setPointerCapture(e.pointerId);}catch{/* not supported / stale id */}
  cwState.pointerId=e.pointerId;
  const [x,y]=cwPoint(e,svg);
  cwState.cur={c:cwState.colorIdx,w:CAVE_WIDTHS[cwState.widthIdx],pts:[x,y]};
  cwDrawLive();
}

function cwPointerMove(e){
  if(!cwState?.cur||e.pointerId!==cwState.pointerId) return;
  e.preventDefault();
  const svg=document.getElementById('cw-canvas');
  const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];
  const p=cwState.cur.pts;
  for(const ev of evs){
    const [x,y]=cwPoint(ev,svg);
    const dx=x-p[p.length-2], dy=y-p[p.length-1];
    if(dx*dx+dy*dy<4) continue; // thin points closer than 2 units
    p.push(x,y);
  }
  cwDrawLive();
}

function cwPointerUp(e){
  if(!cwState?.cur||e.pointerId!==cwState.pointerId) return;
  e.preventDefault();
  cwState.cur.pts=cwSimplify(cwState.cur.pts);
  cwState.strokes.push(cwState.cur);
  const svg=document.getElementById('cw-canvas');
  try{svg.releasePointerCapture(e.pointerId);}catch{/* already released / unsupported */}
  cwState.cur=null; cwState.pointerId=null;
  cwState.redo=[]; cwState.dirty=true;
  cwRender();
}

function cwPreventCanvasGesture(e){
  if(cwState) e.preventDefault();
}

function cwInitCanvas(){
  if(cwCanvasReady) return;
  const svg=document.getElementById('cw-canvas');
  const wrap=document.getElementById('cw-canvas-wrap');
  svg.addEventListener('pointerdown',cwPointerDown);
  svg.addEventListener('pointermove',cwPointerMove);
  svg.addEventListener('pointerup',cwPointerUp);
  svg.addEventListener('pointercancel',cwPointerUp); // commit what we have on system-cancel
  const opts={passive:false};
  svg.addEventListener('touchstart',cwPreventCanvasGesture,opts);
  svg.addEventListener('touchmove',cwPreventCanvasGesture,opts);
  wrap.addEventListener('touchstart',cwPreventCanvasGesture,opts);
  wrap.addEventListener('touchmove',cwPreventCanvasGesture,opts);
  cwCanvasReady=true;
}

// ── Notes ──
function renderNotes(){
  const el=document.getElementById('notes-list');
  const list=live(notePages);
  el.innerHTML=(list.length?list.map(e=>`
    <div class="journal-card">
      <div class="journal-card-title">${esc(e.title)}</div>
      ${e.body?`<div class="journal-card-body">${esc(e.body)}</div>`:''}
      ${journalCardActions('note',e.id)}
    </div>`).join('')
  :'<p class="journal-empty">No notes yet.</p>')
  +recentlyDeletedHtml(deletedJournalItems('note',notePages));
}

// ═══════════════════════════════════════════════════
// KEYBOARD
// ═══════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeModal();closeStatusModal();closeImportModal();closePick();closeHelp();closeAddMaterialModal();closeDriveModal();closeJournalEntry();closeCaveEditor();}
  if(e.key==='n'&&!e.target.matches('input,textarea,select')) openModal();
});

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
(async()=>{
  try{
    const res=await fetch('materials.json');
    if(res.ok){
      const data=await res.json();
      BASE_MATERIALS=parseMaterialsJson(data);
    }
  }catch(e){ /* fetch unavailable (file://); built-in list remains active */ }
  load();
  renderJournal();
  renderTokenNotice();
  updateSyncBadge();
  renderAppUpdateStatus();
  checkForAppUpdate({silent:true});
})();
