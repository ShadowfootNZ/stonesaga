// ═══════════════════════════════════════════════════
// TODO — JOURNAL TRANSFORMATION
// Convert this app from a crafting helper into a full campaign journal.
// Each section below becomes its own tab (or collapsible panel) alongside
// the existing Crafting / Recipes tabs.
//
// ── VALLEY MAP ─────────────────────────────────────
// TODO: Add a Valley Map section.
//   - Display a hex-grid map of the valley (SVG or canvas).
//   - Allow players to label hexes (terrain type, name, notes).
//   - Support uploading a scanned map image as a background layer.
//   - Store hex annotations in the save JSON under `valleyMap`.
//
// ── CULTURE ────────────────────────────────────────
// TODO: Add a Culture section with fields for:
//   - Tribe name
//   - Structures (list, each with name + notes)
//   - Mantle Powers (list with name + description)
//   - Knowledge Cards (list with card ID + name)
//   - Taboos (list of text entries)
//   - Pigments (list of discovered pigment names/colours)
//   Store in `culture` object in the save JSON.
//
// ── BEHEMOTHS ──────────────────────────────────────
// TODO: Add a Behemoths section — a list of behemoth entries, each with:
//   - Name
//   - Lair hex (cross-reference with Valley Map hex IDs)
//   - Revealed secrets (ordered list that unlocks progressively)
//   - Demeanor (text, e.g. "Aggressive", "Dormant")
//   Store as `behemoths: []` in the save JSON.
//
// ── CHALLENGE RECORD ───────────────────────────────
// TODO: Add a Challenge Record section grouped by Epoch.
//   - Each epoch contains a list of challenges: name, card ID, outcome (won/lost/fled), notes.
//   - Display as collapsible epoch groups, newest epoch first.
//   Store as `challengeRecord: { epoch1: [...], epoch2: [...], ... }` in the save JSON.
//
// ── LOOMING CHALLENGES ─────────────────────────────
// TODO: Add a Looming Challenges section — an ordered list of upcoming challenges.
//   - Each entry: name, card ID, notes, and a "prepare by" epoch marker.
//   - Allow re-ordering (drag-and-drop or up/down buttons).
//   Store as `loomingChallenges: []` in the save JSON.
//
// ── INVESTIGATIONS ─────────────────────────────────
// TODO: Add an Investigations section — a list of investigation entries, each with:
//   - Omen (the trigger/sign)
//   - Investigation card ID
//   - Notes (findings, progress)
//   Store as `investigations: []` in the save JSON.
//
// ── PROVISIONAL TEXT (applies to Crafting, Investigations, Behemoths, Challenges) ──
// TODO: Support provisional entries where the card ID and associated text come from an
//   uncertified source — e.g. community data files, old transcriptions, or inferences
//   rather than reading directly off the physical card.
//
//   Concrete example: crafting-blue.txt (Blue crafting codes, CSV format):
//     Code ; Flavor Text ; Game Text ; Item Name
//     1111 ; "You've made rope!…" ; "…gain the Rope item card (IT29)…" ; Rope
//   This file is ~2 years old and may not match the current edition. Codes are
//   reliable (you already rolled them at the table), but item names, card IDs (IT##),
//   flavor text, and game text are spoilers from an unverified external source.
//
//   Reveal order when provisional:
//     1. Crafting code (always visible — the player already knows this).
//     2. Item card ID (IT##) — show this next so the group can locate the physical card.
//     3. Item name, flavor text, game text — hidden behind a "Reveal" toggle until
//        the group confirms the physical card matches the ID.
//
//   Implementation:
//   - Add `provisional: true` and optionally `provisionalSource: string` to any
//     recipe or entry populated from unverified external data.
//   - Render provisional recipes with an "Unverified source" badge in the recipe card.
//   - Spoiler fields (name, notes, flavor) are collapsed by default; a "Reveal spoiler"
//     button expands them.
//   - A "Confirm" button (or edit + save) clears the provisional flag once someone
//     at the table has verified the content against the physical card.
//
// TODO: Add an importer for the crafting-blue.txt format (and equivalent files for
//   other pip colours). Parse the semicolon-delimited rows, extract the card ID from
//   the Game Text (e.g. "IT29" from "search the Item Card deck facedown for IT29"),
//   and import each row as a provisional recipe. This lets the group pre-populate
//   known codes without manually entering them, while the provisional flag ensures
//   no spoilers are shown until physically verified.
//
// ── CAVE WALL ──────────────────────────────────────
// TODO: Add a Cave Wall section for pictographic records.
//   - Display a grid/gallery of named cave drawings.
//   - Each entry has a name (always recorded) and an optional image.
//   - Support uploading an image file (photo of a physical drawing).
//   - Consider an in-browser SVG drawing canvas for simple silhouette-style
//     figures (think cave-painting style: single stroke, filled shapes).
//     If an Apple Pencil / iPad + web app is the target, a basic PointerEvent
//     canvas with SVG path capture could work without a native app.
//   - Store image references as base64 data URIs or as filenames with a
//     side-channel image store (IndexedDB is better than localStorage for blobs).
//   Store as `caveWall: [{ name, svgData|imageDataUrl, addedAt }]` in the save JSON.
//
// ── NOTES ──────────────────────────────────────────
// TODO: Add a free-form Notes section.
//   - Simple textarea (or lightweight Markdown editor).
//   - Optionally support multiple named note pages.
//   Store as `notes: string` (or `notes: [{ title, body }]`) in the save JSON.
//
// ── GOOGLE DRIVE SYNC ──────────────────────────────
// TODO: Add Google Drive URL-based JSON sync so everyone at the table can share state.
//   - Store a Google Drive file sharing URL inside the JSON itself (field: `driveUrl`).
//     Once someone has the JSON, the URL travels with it — no separate setup needed.
//   - The shared file must be a publicly editable Google Drive file (owner sets
//     "Anyone with the link can edit"), which exposes a direct download URL.
//   - Add "Sync from Drive" and "Push to Drive" buttons (or auto-sync on every save).
//   - Use the Google Drive API (or the public fetch-by-file-ID URL trick) to GET the
//     latest JSON, run the existing merge logic, then PUT the merged result back.
//   - Note: direct Drive writes from a plain HTML page require either the Drive API
//     with OAuth, or a small proxy/Apps Script Web App the group controls.
//   - Consider a "Last synced" timestamp and conflict warning if both local and Drive
//     were updated since the last sync.
//
// ── APPLE HOME SCREEN ICON ─────────────────────────
// TODO: Add an Apple touch icon so the app looks polished when saved to an iOS
//   home screen (the primary play surface — iPad with Apple Pencil).
//   - Create a 180×180px PNG icon (apple-touch-icon.png) and place it in the root.
//   - Add to index.html <head>:
//       <link rel="apple-touch-icon" href="apple-touch-icon.png">
//       <meta name="apple-mobile-web-app-capable" content="yes">
//       <meta name="apple-mobile-web-app-title" content="Stonesaga">
//   - Optionally add a web app manifest (manifest.json) for Android / Chrome install
//     support alongside the Apple meta tags.
//   - The icon design should fit the game's aesthetic (cave/stone motif).
//
// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const STORAGE_KEY   = 'stonesaga_v2';
const DRIVE_SYNC_URL = 'https://script.google.com/macros/s/AKfycbyYhWRyscNnJnujY6e_TaDHKd23R--lPKkJ1VqdfWlc1uPOhGPeNFYB6WY3jzVtga6nzw/exec'; 
const PIP_COLORS  = ['Blue','Red','Yellow','Purple','Grey','Green','Orange','Silver'];
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
      .filter(c => !baseNames.has(norm(c.name)))
      .map(c => ({name:c.name, cat:c.cat||'unknown', processed:c.processed||null, image:c.image||null, marks:c.marks||null, notes:c.notes||null}))
  ];
  KM = Object.fromEntries(KNOWN_MATERIALS.map(m => [m.name.toLowerCase(), m]));
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
let driveLastSynced = null; // ISO timestamp of last successful Drive sync
let drivePostImport = false; // when true, push to Drive after the import modal resolves
// tokenData key is lowercase material name

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
function codeKey(color,digits){return `${color} ${digits}`;}
function titleCase(s){return s.replace(/\b\w/g,c=>c.toUpperCase());}

function pipHtml(color){
  return `<span class="pip-icon ${PIP_CSS[color]||'blue'}"></span>`;
}

function allMatNames(){
  // Build a map keyed by lowercase to avoid duplicates between KNOWN_MATERIALS (title case)
  // and tokenData keys (lowercase) or recipe entries with inconsistent casing.
  const map=new Map();
  KNOWN_MATERIALS.forEach(m=>map.set(m.name.toLowerCase(),m.name));
  recipes.forEach(r=>{
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
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
  if(id==='explorer') renderTokenNotice();
  if(id==='materials') renderMaterials();
}

// ═══════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════
function updateStats(){
  document.getElementById('stat-total').textContent=recipes.length;
  document.getElementById('stat-nothing').textContent=Object.keys(nullCodes).length;
}

// ═══════════════════════════════════════════════════
// JOURNAL
// ═══════════════════════════════════════════════════
let matFilterTags=[];

function renderJournal(){
  updateStats();
  document.getElementById('clear-btn').style.display=recipes.length?'block':'none';
  const q=document.getElementById('search').value.toLowerCase();
  const andM=document.getElementById('filter-mode-and').checked;
  const list=recipes.filter(r=>{
    if(matFilterTags.length){
      const mats=[norm(r.mat1Name||''),norm(r.mat2Name||'')];
      // Expand each filter tag to include its processed variant:
      // filtering by "Wood" also matches recipes using "Wood (hardened)"
      const tagMatches=t=>withVariant(t).map(norm).some(v=>mats.includes(v));
      if(andM){if(!matFilterTags.every(tagMatches)) return false;}
      else{if(!matFilterTags.some(tagMatches)) return false;}
    }
    if(q){
      const codes=(r.codes||[]).map(c=>`${c.color} ${c.digits}`).join(' ');
      if(![r.name,r.id,codes,r.mat1Name,r.mat2Name,r.notes].join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a,b)=>(a.name||'').localeCompare(b.name||''));

  const grid=document.getElementById('recipe-grid');
  if(!list.length){
    grid.innerHTML=`<div class="empty-state"><div class="glyph">◈</div><h2>${recipes.length?'No matching recipes':'No recipes recorded yet'}</h2><p>${recipes.length?'Adjust filters.':'Discover a combination and record it here.'}</p></div>`;
    return;
  }
  grid.innerHTML=list.map(r=>{
    const chips=(r.codes||[]).map(c=>`<span class="recipe-code">${pipHtml(c.color)} ${esc(c.color)} ${esc(c.digits)}</span>`).join('');
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
      <div class="code-chips">${chips||'<span style="color:var(--flint);font-size:.8rem">No codes recorded</span>'}</div>
      ${r.notes?`<div class="recipe-notes">${esc(r.notes)}</div>`:''}
      <div class="card-actions">
        <button class="btn btn-sm" onclick="editRecipe('${r.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteRecipe('${r.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
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

let exAcIdxMap={};
function exAcShow(inputId,acId){
  const q=document.getElementById(inputId).value;
  showAcDropdown(acId,q,[],n=>`pickExMat('${esc(n)}','${inputId}','${acId}')`,canCraft);
  exAcIdxMap[acId]=-1;
}
function exAcKey(e,inputId,acId){
  acKeyNav(e,acId,idx=>{
    const items=document.querySelectorAll(`#${acId} .mat-autocomplete-item`);
    if(idx>=0&&items[idx]){
      pickExMat(items[idx].dataset.name,inputId,acId);
    } else {
      // Enter with no dropdown selection — use typed value as-is and run search
      hideAc(acId);
      if(e.key==='Enter') renderExplorer();
    }
  },exAcIdxMap,acId);
}
function pickExMat(name,inputId,acId){
  document.getElementById(inputId).value=name;
  hideAc(acId);
  // Move focus to Material B if we just filled Material A, otherwise run search
  if(inputId==='ex-mat1'){
    document.getElementById('ex-mat2').focus();
  } else {
    renderExplorer();
  }
}

function renderExplorer(){
  const mat1=document.getElementById('ex-mat1').value.trim();
  const mat2=document.getElementById('ex-mat2').value.trim();
  const out=document.getElementById('explorer-output');
  if(!mat1){out.innerHTML='<p style="color:var(--flint);font-style:italic">Enter at least Material A.</p>';return;}

  // Expand each input to include unprocessed/processed variant,
  // then filter to only materials that actually have pip marks.
  const aSet=[...new Set(withVariant(mat1).filter(canCraft))];
  if(!aSet.length){
    out.innerHTML='<p style="color:var(--flint);font-style:italic">That material has no pip marks and cannot be used in crafting combinations.</p>';
    return;
  }
  const bSet=mat2
    ? [...new Set(withVariant(mat2).filter(canCraft))]
    : allMatNames().filter(n=>!aSet.map(norm).includes(norm(n))&&canCraft(n));

  // Build ordered pairs: (A,B) and (B,A) if A≠B
  const seen=new Set();
  const pairs=[];
  for(const a of aSet){
    for(const b of bSet){
      if(norm(a)===norm(b)) continue;
      const fwd=`${norm(a)}|${norm(b)}`;
      if(!seen.has(fwd)){seen.add(fwd);pairs.push([a,b]);}
    }
  }

  if(!pairs.length){out.innerHTML='<p style="color:var(--flint);font-style:italic">No valid pairings found.</p>';return;}

  let html='';
  for(const [a,b] of pairs){
    const computedCodes=computeCodes(a,b); // null if no token data for either
    // Apply filter before building HTML
    const hasKnown=recipes.some(r=>{const m1=norm(r.mat1Name||''),m2=norm(r.mat2Name||'');return(m1===norm(a)&&m2===norm(b))||(m1===norm(b)&&m2===norm(a));});
    if(explorerFilter==='known'&&!hasKnown) continue;
    if(explorerFilter==='unknown'&&hasKnown) continue;
    const hasTokenData=computedCodes!==null;

    // Recipes that match this ordered pair
    const matchingRecipes=recipes.filter(r=>{
      const m1=norm(r.mat1Name||''),m2=norm(r.mat2Name||'');
      // recipes don't distinguish order, so match either way
      return (m1===norm(a)&&m2===norm(b))||(m1===norm(b)&&m2===norm(a));
    });
    const discoveredKeys=new Set(matchingRecipes.flatMap(r=>(r.codes||[]).map(c=>codeKey(c.color,c.digits))));

    // Null codes for this pair (order-insensitive)
    const nullForPair=Object.entries(nullCodes)
      .filter(([,v])=>{
        if(!v||!v.mat1||!v.mat2) return false;
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
    const showNothing=explorerFilter!=='known';
    const hasContent=matchingRecipes.length||(showNothing&&(nullForPair.length||unknownComputed.length||!hasTokenData));
    if(!hasContent) continue;

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

    // Unknown computed codes
    if(showNothing) for(const c of unknownComputed){
      const k=codeKey(c.color,c.digits);
      sec+=`<div class="combo-card">
        ${tokenPairHtml(a,c.rotA,b,c.rotB)}
        <div class="combo-header">
          <div class="combo-code-display">${pipHtml(c.color)} ${esc(c.color)} ${esc(c.digits)}</div>
          <span class="status-badge unknown">Unknown</span>
        </div>
        <div class="combo-actions">
          <button class="btn btn-sm btn-primary" onclick="openModalForPair('${esc(a)}','${esc(b)}','${esc(c.color)}','${esc(c.digits)}')">Record discovery</button>
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
          <button class="btn btn-sm btn-primary" onclick="openModalForPair('${esc(a)}','${esc(b)}')">Record discovery</button>
          <button class="btn btn-sm" onclick="openStatusModal(null,'${esc(a)}','${esc(b)}')">Mark tried — nothing</button>
        </div>
      </div>`;
    }

    sec+=`</div></div>`;
    html+=sec;
  }
  out.innerHTML=html;
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
    .filter(([,v]) => v && norm(v.mat1||'') === norm(mat1) && norm(v.mat2||'') === norm(mat2) ||
                      v && norm(v.mat1||'') === norm(mat2) && norm(v.mat2||'') === norm(mat1))
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
    nullCodes[existingKey] = { mat1, mat2 };
    save(); updateStats(); renderExplorer();
    document.getElementById('status-overlay').classList.add('hidden');
  }
}

function removeNullCode(key) {
  delete nullCodes[key];
  save(); updateStats();
  // re-render the existing list in-place
  openStatusModal(null, smState.mat1, smState.mat2);
  if (document.getElementById('tab-explorer').classList.contains('active')) renderExplorer();
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
    nullCodes[codeKey(c.color, c.digits)] = { mat1: smState.mat1, mat2: smState.mat2 };
  }
  save(); updateStats();
  if (document.getElementById('tab-explorer').classList.contains('active')) renderExplorer();
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
    const clash=recipes.find(r=>r.id!==editingId&&(r.codes||[]).some(x=>codeKey(x.color,x.digits)===key));
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

function openModalForPair(mat1,mat2,prefillColor,prefillDigits){
  const existing=recipes.filter(r=>{
    const m1=norm(r.mat1Name||''),m2=norm(r.mat2Name||'');
    return (m1===norm(mat1)&&m2===norm(mat2))||(m1===norm(mat2)&&m2===norm(mat1));
  });
  if(existing.length){
    openPickModal(existing,mat1,mat2,prefillColor,prefillDigits);
    return;
  }
  _openNewRecipeForPair(mat1,mat2,prefillColor,prefillDigits);
}

function openPickModal(existing,mat1,mat2,prefillColor,prefillDigits){
  pickState={mat1,mat2,prefillColor,prefillDigits};
  const codeLabel=prefillColor&&prefillDigits?`${prefillColor} ${prefillDigits}`:'the new code';
  document.getElementById('pick-body').textContent=`Add ${codeLabel} to an existing recipe, or create a new one.`;
  document.getElementById('pick-list').innerHTML=existing.map(r=>`
    <button class="btn" style="text-align:left;width:100%;padding:.5rem .9rem" onclick="pickRecipe('${esc(r.id)}')">
      <strong>${esc(r.name)}</strong> <span style="color:var(--flint);font-size:.8rem;margin-left:.4rem">${esc(r.id)}</span>
    </button>`).join('');
  document.getElementById('pick-overlay').classList.remove('hidden');
}

function closePick(){document.getElementById('pick-overlay').classList.add('hidden');}
function openHelp(){document.getElementById('help-overlay').classList.remove('hidden');}
function closeHelp(){document.getElementById('help-overlay').classList.add('hidden');}

function pickRecipe(id){
  closePick();
  const {prefillColor,prefillDigits}=pickState;
  openModal(id);
  if(prefillColor&&prefillDigits){
    const key=codeKey(prefillColor,prefillDigits);
    const alreadyOnThis=pendingCodes.some(c=>codeKey(c.color,c.digits)===key);
    const clash=!alreadyOnThis&&recipes.find(r=>r.id!==id&&(r.codes||[]).some(x=>codeKey(x.color,x.digits)===key));
    if(clash) alert(`${key} is already recorded for "${clash.name}".`);
    else if(!alreadyOnThis){pendingCodes.push({color:prefillColor,digits:prefillDigits});renderCodeList();}
  }
}

function pickNew(){
  closePick();
  const {mat1,mat2,prefillColor,prefillDigits}=pickState;
  _openNewRecipeForPair(mat1,mat2,prefillColor,prefillDigits);
}

function _openNewRecipeForPair(mat1,mat2,prefillColor,prefillDigits){
  openModal();
  document.getElementById('f-mat1-name').value=mat1;
  document.getElementById('f-mat2-name').value=mat2;
  if(prefillColor&&prefillDigits){
    const key=codeKey(prefillColor,prefillDigits);
    const clash=recipes.find(r=>(r.codes||[]).some(x=>codeKey(x.color,x.digits)===key));
    if(clash) alert(`${key} is already recorded for "${clash.name}". Opening modal without the code pre-filled.`);
    else{pendingCodes.push({color:prefillColor,digits:prefillDigits});renderCodeList();}
  }
}

function closeModal(){document.getElementById('modal-overlay').classList.add('hidden');}
function outsideClose(e,id){if(e.target===document.getElementById(id)) document.getElementById(id).classList.add('hidden');}

function saveRecipe(){
  const name=document.getElementById('f-name').value.trim();
  const itemNum=document.getElementById('f-item-num').value.trim();
  if(!name){alert('Item name is required.');return;}
  if(!itemNum){alert('Item number is required.');return;}
  // Check for duplicate item number (only when adding new, or changing the number on edit)
  if(itemNum!==(editingId||'')&&recipes.some(r=>r.id===itemNum)){
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
  };
  if(editingId){const i=recipes.findIndex(r=>r.id===editingId);if(i!==-1)recipes[i]=recipe;else recipes.push(recipe);}
  else recipes.push(recipe);
  save(); renderJournal(); closeModal();
  if(document.getElementById('tab-explorer').classList.contains('active')) renderExplorer();
}

function editRecipe(id){
  openModal(id);
}
function deleteRecipe(id){
  const r=recipes.find(x=>x.id===id);
  if(!r||!confirm(`Delete "${r.name}"?`)) return;
  recipes=recipes.filter(x=>x.id!==id);
  save(); renderJournal();
  if(document.getElementById('tab-explorer').classList.contains('active')) renderExplorer();
}
function clearAllConfirm(){
  if(!confirm(`Delete all ${recipes.length} recipe(s)? This cannot be undone.`)) return;
  recipes=[]; nullCodes={};
  save(); renderJournal();
}

// ═══════════════════════════════════════════════════
// AUTOCOMPLETE ENGINE
// ═══════════════════════════════════════════════════
let acIdxMap={};

function matImgHtml(name){
  const m=KM[norm(name)];
  if(!m||!m.image) return '<span class="mat-ac-img mat-ac-img-placeholder"></span>';
  return `<img src="${esc(m.image)}" alt="" class="mat-ac-img" onerror="this.classList.add('mat-ac-img-placeholder')">`;
}

function comboTokenImg(name, deg=0){
  const m=KM[norm(name)];
  if(!m||!m.image) return '';
  return `<img src="${esc(m.image)}" alt="${esc(name)}" class="combo-token-img" style="transform:rotate(${deg}deg)" title="${esc(name)} (${deg}°)" onerror="this.style.display='none'">`;
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
  const q=document.getElementById(inputId).value;
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
  ['mat-autocomplete','ex-ac1','ex-ac2','fac1','fac2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el&&!el.parentElement?.contains(e.target)) hideAc(id);
  });
});

// ═══════════════════════════════════════════════════
// IMPORT / EXPORT
// ═══════════════════════════════════════════════════

let pendingImport = null; // {recipes, nullCodes, meta} awaiting user choice

function save() {
  lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({recipes, nullCodes, tokenData, customMaterials, lastUpdated, driveFileId, driveLastSynced}));
}

function fmtDate(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short'});
}

function buildExportPayload() {
  return {
    app: 'Stonesaga Crafting Journal',
    version: 2,
    exportedAt: new Date().toISOString(),
    lastUpdated: lastUpdated || new Date().toISOString(),
    recipes,
    nullCodes,
    customMaterials,
    driveFileId,
  };
}

function exportData() {
  if (!recipes.length && !Object.keys(nullCodes).length && !customMaterials.length) { alert('Nothing to export.'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(buildExportPayload(),null,2)], {type:'application/json'}));
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
  for (const r of recipes)
    for (const c of (r.codes||[])) codeToId[codeKey(c.color,c.digits)] = r.id;

  for (const r of incoming) {
    const existing = recipes.find(x => x.id === r.id);
    if (existing) {
      if (existing.name !== r.name)
        conflicts.push({type:'name', id:r.id, yours:existing.name, theirs:r.name});
      const m1 = norm(existing.mat1Name||'')!==norm(r.mat1Name||'');
      const m2 = norm(existing.mat2Name||'')!==norm(r.mat2Name||'');
      if (m1||m2)
        conflicts.push({type:'materials', id:r.id, name:r.name,
          yours:`${existing.mat1Name||'?'} + ${existing.mat2Name||'?'}`,
          theirs:`${r.mat1Name||'?'} + ${r.mat2Name||'?'}`});
    }

    for (const c of (r.codes||[])) {
      const k = codeKey(c.color,c.digits);
      // Code belongs to a different item in current data
      if (codeToId[k] && codeToId[k] !== r.id) {
        const owner = recipes.find(x=>x.id===codeToId[k]);
        conflicts.push({type:'code-clash', code:k,
          yours:`${owner?.name||codeToId[k]}`, theirs:r.name});
      }
      // Code is "Nothing" in current data but a discovery in the file
      if (nullCodes[k])
        conflicts.push({type:'discovery-vs-nothing', code:k, theirs:r.name, direction:'file-is-discovery'});
    }
  }

  // Code is a discovery in current data but "Nothing" in the file
  for (const k of Object.keys(inNull)) {
    const owner = recipes.find(r=>(r.codes||[]).some(c=>codeKey(c.color,c.digits)===k));
    if (owner)
      conflicts.push({type:'discovery-vs-nothing', code:k, yours:owner.name, direction:'file-is-nothing'});
  }

  return conflicts;
}

function renderConflicts(conflicts) {
  const el = document.getElementById('im-conflicts');
  if (!conflicts.length) { el.innerHTML=''; return; }
  const rows = conflicts.map(c => {
    switch(c.type) {
      case 'name':
        return `<li><strong>${esc(c.id)}:</strong> name differs — yours <em>${esc(c.yours)}</em>, file <em>${esc(c.theirs)}</em></li>`;
      case 'materials':
        return `<li><strong>${esc(c.id)} ${esc(c.name)}:</strong> materials differ — yours <em>${esc(c.yours)}</em>, file <em>${esc(c.theirs)}</em></li>`;
      case 'code-clash':
        return `<li><strong>${esc(c.code)}:</strong> yours belongs to <em>${esc(c.yours)}</em>, file assigns it to <em>${esc(c.theirs)}</em></li>`;
      case 'discovery-vs-nothing':
        return c.direction==='file-is-discovery'
          ? `<li><strong>${esc(c.code)}:</strong> you marked as dead-end, file records it as <em>${esc(c.theirs)}</em></li>`
          : `<li><strong>${esc(c.code)}:</strong> you have it as <em>${esc(c.yours)}</em>, file marks it as dead-end</li>`;
    }
  }).join('');
  el.innerHTML = `<div class="im-conflict-header">⚠ ${conflicts.length} conflict${conflicts.length>1?'s':''} found</div><ul class="im-conflict-list">${rows}</ul>`;
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
      pendingImport = { recipes: incoming, nullCodes: inNull, customMaterials: d.customMaterials || [], driveFileId: d.driveFileId || null, meta: d };

      const fileUpdated = d.lastUpdated ? fmtDate(d.lastUpdated) : (d.exportedAt ? fmtDate(d.exportedAt) : 'unknown');
      const nullCount   = Object.keys(inNull).length;
      document.getElementById('im-summary').innerHTML =
        `<strong>File:</strong> ${esc(file.name)}<br>` +
        `<strong>Last updated:</strong> ${esc(fileUpdated)}<br>` +
        `<strong>Recipes:</strong> ${incoming.length} &nbsp;·&nbsp; <strong>Dead-end codes:</strong> ${nullCount}`;

      const curUpdated = fmtDate(lastUpdated);
      document.getElementById('im-current').innerHTML =
        `Your current data: ${recipes.length} recipe(s), ${Object.keys(nullCodes).length} dead-end code(s) — last updated ${esc(curUpdated)}`;

      renderConflicts(detectImportConflicts(incoming, inNull));
      document.getElementById('import-overlay').classList.remove('hidden');
    } catch { alert('Could not parse JSON file.'); }
  };
  reader.readAsText(file);
}

function doImport(mode) {
  if (!pendingImport) return;
  const { recipes: incoming, nullCodes: inNull, customMaterials: inMats, driveFileId: inDriveId } = pendingImport;
  if (mode === 'merge') {
    const map = Object.fromEntries(recipes.map(r => [r.id, r]));
    incoming.forEach(r => { map[r.id] = r; });
    recipes = Object.values(map);
    Object.assign(nullCodes, inNull);
    const matNames = new Set(customMaterials.map(m => norm(m.name)));
    inMats.forEach(m => { if (!matNames.has(norm(m.name))) customMaterials.push(m); });
  } else {
    recipes         = incoming;
    nullCodes       = inNull;
    customMaterials = inMats;
  }
  if (!driveFileId && inDriveId) driveFileId = inDriveId;
  pendingImport = null;
  rebuildMaterials();
  save(); renderJournal();
  closeImportModal();
  if (document.getElementById('tab-explorer').classList.contains('active')) renderExplorer();
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
      lastUpdated     = d.lastUpdated     || null;
      driveFileId     = d.driveFileId     || null;
      driveLastSynced = d.driveLastSynced || null;
    }
  } catch { /* corrupted storage — start fresh */ }
  rebuildMaterials();
  seedTokenDataFromMarks();
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
  if (!confirm(`Delete "${name}"?`)) return;
  customMaterials = customMaterials.filter(m => norm(m.name) !== norm(name));
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
    customMaterials.push(entry);
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
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><div class="glyph">◈</div><h2>No materials found</h2><p>Adjust your search or add a new material.</p></div>`;
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
          ? `<img src="${esc(m.image)}" alt="" class="material-card-img" onerror="this.style.display='none'">`
          : `<div class="material-card-img-placeholder"></div>`}
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
  }).join('');
}

// ═══════════════════════════════════════════════════
// DRIVE SYNC
// ═══════════════════════════════════════════════════
function openDriveModal()  { renderDriveModal(); document.getElementById('drive-overlay').classList.remove('hidden'); }
function closeDriveModal() { document.getElementById('drive-overlay').classList.add('hidden'); }

function renderDriveModal() {
  const statusEl  = document.getElementById('drive-modal-status');
  const actionsEl = document.getElementById('drive-modal-actions');

  if (!DRIVE_SYNC_URL) {
    statusEl.innerHTML  = '<p class="drive-notice">Drive sync is not yet configured — set <code>DRIVE_SYNC_URL</code> in app.js after deploying drive-sync.gs.</p>';
    actionsEl.innerHTML = '';
    return;
  }

  if (!driveFileId) {
    statusEl.innerHTML  = '<p>No group file yet. Create one to share your journal with the table — everyone who imports your JSON will connect to it automatically.</p>';
    actionsEl.innerHTML = '<button class="btn btn-primary" id="drive-create-btn" onclick="createDriveFile()">Create group file</button>';
    return;
  }

  const driveLink = `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/view?usp=sharing`;
  statusEl.innerHTML =
    `<div class="drive-file-row">Group file: <a href="${driveLink}" target="_blank" rel="noopener" class="drive-file-link">View in Drive ↗</a></div>` +
    `<div class="drive-synced">Last synced: ${esc(driveLastSynced ? fmtDate(driveLastSynced) : 'never')}</div>`;
  actionsEl.innerHTML = '<button class="btn btn-primary" id="drive-sync-btn" onclick="syncWithDrive()">Sync</button>';
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
    await _pushToDrive();
    renderDriveModal();
  } catch(err) {
    alert(`Could not create Drive file: ${err.message}`);
    renderDriveModal();
  }
}

async function _pushToDrive() {
  const res = await fetch(DRIVE_SYNC_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'push', fileId: driveFileId, data: buildExportPayload() }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  driveLastSynced = new Date().toISOString();
  save();
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
  const incoming = d.recipes || (Array.isArray(d) ? d : null);
  if (!incoming) { drivePostImport = false; alert('Unrecognised format received from Drive.'); return; }
  const inNull = d.nullCodes || {};
  pendingImport = { recipes: incoming, nullCodes: inNull, customMaterials: d.customMaterials || [], driveFileId: d.driveFileId || null, meta: d };

  const fileUpdated = d.lastUpdated ? fmtDate(d.lastUpdated) : (d.exportedAt ? fmtDate(d.exportedAt) : 'unknown');
  document.getElementById('im-summary').innerHTML =
    `<strong>Source:</strong> Drive<br>` +
    `<strong>Last updated:</strong> ${esc(fileUpdated)}<br>` +
    `<strong>Recipes:</strong> ${incoming.length} &nbsp;·&nbsp; <strong>Dead-end codes:</strong> ${Object.keys(inNull).length}`;
  document.getElementById('im-current').innerHTML =
    `Your current data: ${recipes.length} recipe(s), ${Object.keys(nullCodes).length} dead-end code(s) — last updated ${esc(fmtDate(lastUpdated))}`;
  renderConflicts(detectImportConflicts(incoming, inNull));
  document.getElementById('import-overlay').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════
// KEYBOARD
// ═══════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeModal();closeStatusModal();closeImportModal();closePick();closeHelp();closeAddMaterialModal();closeDriveModal();}
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
})();
