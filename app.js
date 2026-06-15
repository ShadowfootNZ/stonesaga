// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const STORAGE_KEY = 'stonesaga_v2';
const PIP_COLORS  = ['Blue','Red','Yellow','Purple','Grey'];
const PIP_CSS     = {Blue:'blue',Red:'red',Yellow:'yellow',Purple:'purple',Grey:'grey'};

const KNOWN_MATERIALS = [
  {name:'Bone',cat:'animal',processed:'Bone (carved)'},
  {name:'Bone (carved)',cat:'animal',processed:null},
  {name:'Hide',cat:'animal',processed:'Hide (cured)'},
  {name:'Hide (cured)',cat:'animal',processed:null},
  {name:'Shell',cat:'animal',processed:'Shell (sharpened)'},
  {name:'Shell (sharpened)',cat:'animal',processed:null},
  {name:'Guts',cat:'animal',processed:'Guts (cured)'},
  {name:'Guts (cured)',cat:'animal',processed:null},
  {name:'Feather',cat:'animal',processed:'Feather (cut)'},
  {name:'Feather (cut)',cat:'animal',processed:null},
  {name:'Tooth',cat:'animal',processed:'Tooth (drilled)'},
  {name:'Tooth (drilled)',cat:'animal',processed:null},
  {name:'Clay',cat:'mineral',processed:'Clay (fired)'},
  {name:'Clay (fired)',cat:'mineral',processed:null},
  {name:'Cloudstone',cat:'mineral',processed:'Cloudstone (shaped)'},
  {name:'Cloudstone (shaped)',cat:'mineral',processed:null},
  {name:'Riverstone',cat:'mineral',processed:'Riverstone (flaked)'},
  {name:'Riverstone (flaked)',cat:'mineral',processed:null},
  {name:'Sunstone',cat:'mineral',processed:'Sunstone (shaped)'},
  {name:'Sunstone (shaped)',cat:'mineral',processed:null},
  {name:'Wood',cat:'plant',processed:'Wood (hardened)'},
  {name:'Wood (hardened)',cat:'plant',processed:null},
  {name:'Fiber',cat:'plant',processed:'Fiber (woven)'},
  {name:'Fiber (woven)',cat:'plant',processed:null},
  {name:'Pitch',cat:'plant',processed:'Pitch (treated)'},
  {name:'Pitch (treated)',cat:'plant',processed:null},
  {name:'Moonblood',cat:'rare',processed:'Moonblood (solid)'},
  {name:'Moonblood (solid)',cat:'rare',processed:null},
  {name:'Coral (dead)',cat:'rare',processed:'Coral (living)'},
  {name:'Coral (living)',cat:'rare',processed:null},
  {name:'Silk',cat:'rare',processed:'Silk (woven)'},
  {name:'Silk (woven)',cat:'rare',processed:null},
];
const KM = Object.fromEntries(KNOWN_MATERIALS.map(m=>[m.name.toLowerCase(),m]));

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
let recipes   = [];   // [{id,name,itemNum,codes:[{color,digits}],mat1Name,mat1Cat,mat2Name,mat2Cat,notes,addedAt}]
let nullCodes = {};   // {"Blue 1234": {mat1,mat2}}
let tokenData = {};   // {"wood (hardened)": [[leftColor,leftCount,rightColor,rightCount], ...]}
let lastUpdated = null;
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
  } else {
    n.className='token-data-notice';
    n.textContent=`Token pip data loaded for ${count} material(s): ${Object.keys(tokenData).map(titleCase).join(', ')}`;
  }
}

// ═══════════════════════════════════════════════════
// COMBINATION ENGINE
// ═══════════════════════════════════════════════════

// Given two material names (A left, B right), compute all valid crafting codes.
// Returns [{color, digits, colCounts}] where digits is the 4-char string.
// colCounts = [Aleft, Aright, Bleft, Bright] for display.
function computeCodes(matA, matB) {
  const orientA = tokenData[matA.toLowerCase()];
  const orientB = tokenData[matB.toLowerCase()];
  if (!orientA || !orientB) return null; // no pip data

  const results = [];
  for (const [alc, alnCount, arc, arcCount] of orientA) {
    for (const [blc, blCount, brc, brcCount] of orientB) {
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
      results.push({color, digits, colCounts:[col1,col2,col3,col4]});
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
  const s=new Set(KNOWN_MATERIALS.map(m=>m.name));
  recipes.forEach(r=>{if(r.mat1Name)s.add(r.mat1Name.trim());if(r.mat2Name)s.add(r.mat2Name.trim());});
  Object.keys(tokenData).forEach(k=>s.add(titleCase(k)));
  return [...s].sort((a,b)=>a.localeCompare(b));
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
}

// ═══════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════
function updateStats(){
  const allCodes=recipes.flatMap(r=>r.codes||[]);
  document.getElementById('stat-total').textContent=recipes.length;
  document.getElementById('stat-blue').textContent=allCodes.filter(c=>c.color==='Blue').length;
  document.getElementById('stat-red').textContent=allCodes.filter(c=>c.color==='Red').length;
  document.getElementById('stat-yellow').textContent=allCodes.filter(c=>c.color==='Yellow').length;
  document.getElementById('stat-nothing').textContent=Object.keys(nullCodes).length;
  document.getElementById('stat-other').textContent=allCodes.filter(c=>!['Blue','Red','Yellow'].includes(c.color)).length;
}

// ═══════════════════════════════════════════════════
// JOURNAL
// ═══════════════════════════════════════════════════
let matFilterTags=[];

function renderJournal(){
  updateStats();
  document.getElementById('clear-btn').style.display=recipes.length?'block':'none';
  const q=document.getElementById('search').value.toLowerCase();
  const cf=document.getElementById('filter-color').value;
  const andM=document.getElementById('filter-mode-and').checked;
  const list=recipes.filter(r=>{
    if(cf&&!(r.codes||[]).some(c=>c.color===cf)) return false;
    if(matFilterTags.length){
      const mats=[norm(r.mat1Name||''),norm(r.mat2Name||'')];
      if(andM){if(!matFilterTags.every(t=>mats.includes(norm(t)))) return false;}
      else{if(!matFilterTags.some(t=>mats.includes(norm(t)))) return false;}
    }
    if(q){
      const codes=(r.codes||[]).map(c=>`${c.color} ${c.digits}`).join(' ');
      if(![r.name,r.itemNum,codes,r.mat1Name,r.mat2Name,r.notes].join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a,b)=>{
    const ac=(a.codes||[])[0],bc=(b.codes||[])[0];
    if(!ac&&!bc) return 0; if(!ac) return 1; if(!bc) return -1;
    return ac.color.localeCompare(bc.color)||(ac.digits||'').localeCompare(bc.digits||'');
  });

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
        ${r.itemNum?`<div class="item-number">${esc(r.itemNum)}</div>`:''}
      </div>
      <div class="code-chips">${chips||'<span style="color:var(--flint);font-size:.8rem">No codes recorded</span>'}</div>
      <div class="recipe-materials">
        <span class="material-tag ${r.mat1Cat||'unknown'}">${esc(r.mat1Name||'?')}</span>
        <span style="color:var(--flint)">+</span>
        <span class="material-tag ${r.mat2Cat||'unknown'}">${esc(r.mat2Name||'?')}</span>
      </div>
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
function clearExplorer(){
  document.getElementById('ex-mat1').value='';
  document.getElementById('ex-mat2').value='';
  document.getElementById('explorer-output').innerHTML='';
}

let exAcIdxMap={};
function exAcShow(inputId,acId){
  const q=document.getElementById(inputId).value;
  showAcDropdown(acId,q,[],n=>`pickExMat('${esc(n)}','${inputId}','${acId}')`);
  exAcIdxMap[acId]=-1;
}
function exAcKey(e,inputId,acId){
  acKeyNav(e,acId,idx=>{
    const items=document.querySelectorAll(`#${acId} .mat-autocomplete-item`);
    if(idx>=0&&items[idx]) pickExMat(items[idx].dataset.name,inputId,acId);
    else hideAc(acId);
  },exAcIdxMap,acId);
}
function pickExMat(name,inputId,acId){
  document.getElementById(inputId).value=name; hideAc(acId);
}

function renderExplorer(){
  const mat1=document.getElementById('ex-mat1').value.trim();
  const mat2=document.getElementById('ex-mat2').value.trim();
  const out=document.getElementById('explorer-output');
  if(!mat1){out.innerHTML='<p style="color:var(--flint);font-style:italic">Enter at least Material A.</p>';return;}

  // Expand each input to include unprocessed/processed variant
  const aSet=[...new Set(withVariant(mat1))];
  const bSet=mat2
    ? [...new Set(withVariant(mat2))]
    : allMatNames().filter(n=>!aSet.map(norm).includes(norm(n)));

  // Build ordered pairs: (A,B) and (B,A) if A≠B
  const seen=new Set();
  const pairs=[];
  for(const a of aSet){
    for(const b of bSet){
      if(norm(a)===norm(b)) continue;
      const fwd=`${norm(a)}|${norm(b)}`;
      if(!seen.has(fwd)){seen.add(fwd);pairs.push([a,b]);}
      // also reverse unless it's the same (only when bSet is explicit)
      if(mat2){
        const rev=`${norm(b)}|${norm(a)}`;
        if(!seen.has(rev)){seen.add(rev);pairs.push([b,a]);}
      }
    }
  }

  if(!pairs.length){out.innerHTML='<p style="color:var(--flint);font-style:italic">No valid pairings found.</p>';return;}

  let html='';
  for(const [a,b] of pairs){
    const computedCodes=computeCodes(a,b); // null if no token data for either
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

    const catA=catFor(a),catB=catFor(b);
    html+=`<div class="combo-section">
      <div class="combo-section-header">
        <span style="color:var(--flint);font-size:.75rem;text-transform:uppercase;letter-spacing:.1em">A left · B right</span>
        <span class="material-tag ${catA}">${esc(a)}</span>
        <span style="color:var(--flint)">×</span>
        <span class="material-tag ${catB}">${esc(b)}</span>
        ${hasTokenData?'':`<span style="font-size:.72rem;color:var(--flint);font-style:italic">— pip data not loaded for one or both materials</span>`}
      </div>
      <div class="combo-grid">`;

    // Discovered
    for(const r of matchingRecipes){
      const chips=(r.codes||[]).map(c=>`<span class="recipe-code" style="font-size:.75rem">${pipHtml(c.color)} ${esc(c.color)} ${esc(c.digits)}</span>`).join(' ');
      html+=`<div class="combo-card state-discovered">
        <div class="combo-header"><div>${chips}</div><span class="status-badge discovered">Discovered</span></div>
        <div class="combo-item-name">${esc(r.name)}</div>
        ${r.itemNum?`<div class="combo-item-num">${esc(r.itemNum)}</div>`:''}
        <div class="combo-actions"><button class="btn btn-sm" onclick="editRecipe('${r.id}')">Edit</button></div>
      </div>`;
    }

    // Null (tried, nothing)
    for(const k of nullForPair){
      const [color,...dp]=k.split(' ');
      html+=`<div class="combo-card state-nothing">
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

    // Unknown computed codes (from token pip data)
    for(const c of unknownComputed){
      const k=codeKey(c.color,c.digits);
      const detail=`${c.colCounts[0]} · ${c.colCounts[1]} · ${c.colCounts[2]} · ${c.colCounts[3]}`;
      html+=`<div class="combo-card">
        <div class="combo-header">
          <div>
            <div class="combo-code-display">${pipHtml(c.color)} ${esc(c.color)} ${esc(c.digits)}</div>
            <div class="combo-code-detail">cols: ${esc(detail)}</div>
          </div>
          <span class="status-badge unknown">Unknown</span>
        </div>
        <div class="combo-actions">
          <button class="btn btn-sm btn-primary" onclick="openModalForPair('${esc(a)}','${esc(b)}','${esc(c.color)}','${esc(c.digits)}')">Record discovery</button>
          <button class="btn btn-sm" onclick="openStatusModal(null,'${esc(a)}','${esc(b)}','${esc(k)}',true)">Nothing</button>
        </div>
      </div>`;
    }

    // If no pip data: generic unknown card
    if(!hasTokenData||(!unknownComputed.length&&!nullForPair.length&&!matchingRecipes.length)){
      html+=`<div class="combo-card">
        <div class="combo-header"><span class="status-badge unknown">Unknown</span></div>
        <div style="font-size:.8rem;color:var(--flint);font-style:italic;margin-bottom:.4rem">
          ${hasTokenData?'All computed codes accounted for — try other orientations?':'No pip data — enter codes manually'}
        </div>
        <div class="combo-actions">
          <button class="btn btn-sm btn-primary" onclick="openModalForPair('${esc(a)}','${esc(b)}')">Record discovery</button>
          <button class="btn btn-sm" onclick="openStatusModal(null,'${esc(a)}','${esc(b)}')">Mark tried — nothing</button>
        </div>
      </div>`;
    }

    html+=`</div></div>`; // close combo-grid, combo-section
  }
  out.innerHTML=html;
}

// ═══════════════════════════════════════════════════
// CODE SHORTHAND PARSER
// ═══════════════════════════════════════════════════
const PIP_ABBREV = {B:'Blue',R:'Red',Y:'Yellow',P:'Purple',G:'Grey'};

// Parse a string like "B2132, R4210  Y0031" into [{color,digits}, ...]
// Returns {codes, errors}
function parseCodeString(str) {
  const codes = [];
  const errors = [];
  // Split on commas and/or whitespace, filter empty
  const tokens = str.toUpperCase().split(/[\s,]+/).filter(Boolean);
  for (const tok of tokens) {
    const m = tok.match(/^([BRYP G])(\d{4})$/);
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
  let added=0;
  codes.forEach(c=>{
    if(!pendingCodes.some(x=>x.color===c.color&&x.digits===c.digits)){
      pendingCodes.push(c); added++;
    }
  });
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
    document.getElementById('f-item-num').value=r.itemNum||'';
    document.getElementById('f-mat1-name').value=r.mat1Name||'';
    document.getElementById('f-mat1-cat').value=r.mat1Cat||'unknown';
    document.getElementById('f-mat2-name').value=r.mat2Name||'';
    document.getElementById('f-mat2-cat').value=r.mat2Cat||'unknown';
    document.getElementById('f-notes').value=r.notes||'';
  } else {
    pendingCodes=[];
    ['f-name','f-item-num','f-mat1-name','f-mat2-name','f-notes','new-code-input'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('f-mat1-cat').value='unknown';
    document.getElementById('f-mat2-cat').value='unknown';
  }
  renderCodeList();
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('f-name').focus();
}

function openModalForPair(mat1,mat2,prefillColor,prefillDigits){
  openModal();
  document.getElementById('f-mat1-name').value=mat1;
  document.getElementById('f-mat2-name').value=mat2;
  const k1=KM[norm(mat1)],k2=KM[norm(mat2)];
  if(k1) document.getElementById('f-mat1-cat').value=k1.cat;
  if(k2) document.getElementById('f-mat2-cat').value=k2.cat;
  // Pre-fill the code input if coming from a computed code card
  if(prefillColor&&prefillDigits){
    const abbrev=Object.entries(PIP_ABBREV).find(([,v])=>v===prefillColor)?.[0]||prefillColor[0];
    document.getElementById('new-code-input').value=`${abbrev}${prefillDigits}`;
  }
}

function closeModal(){document.getElementById('modal-overlay').classList.add('hidden');}
function outsideClose(e,id){if(e.target===document.getElementById(id)) document.getElementById(id).classList.add('hidden');}

function saveRecipe(){
  const name=document.getElementById('f-name').value.trim();
  if(!name){alert('Item name is required.');return;}
  const recipe={
    id:editingId||(Date.now().toString(36)+Math.random().toString(36).slice(2)),
    name, itemNum:document.getElementById('f-item-num').value.trim(),
    codes:[...pendingCodes],
    mat1Name:document.getElementById('f-mat1-name').value.trim(),
    mat1Cat:document.getElementById('f-mat1-cat').value,
    mat2Name:document.getElementById('f-mat2-name').value.trim(),
    mat2Cat:document.getElementById('f-mat2-cat').value,
    notes:document.getElementById('f-notes').value.trim(),
    addedAt:editingId?(recipes.find(r=>r.id===editingId)?.addedAt||Date.now()):Date.now(),
  };
  if(editingId){const i=recipes.findIndex(r=>r.id===editingId);if(i!==-1)recipes[i]=recipe;}
  else recipes.push(recipe);
  save(); renderJournal(); closeModal();
  if(document.getElementById('tab-explorer').classList.contains('active')) renderExplorer();
}

function editRecipe(id){
  openModal(id);
  if(!document.getElementById('tab-journal').classList.contains('active'))
    switchTab('journal',document.querySelector('.tab-btn'));
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

function showAcDropdown(acId,q,exclude,onClickFn){
  const all=allMatNames();
  const exNorm=exclude.map(norm);
  const matches=all.filter(n=>!exNorm.includes(norm(n))&&(!q||n.toLowerCase().includes(q.toLowerCase()))).slice(0,14);
  const ac=document.getElementById(acId); if(!ac) return;
  if(!matches.length){ac.classList.add('hidden');return;}
  ac.innerHTML=matches.map((name,i)=>{
    const cat=catFor(name);
    return `<div class="mat-autocomplete-item" data-idx="${i}" data-name="${esc(name)}" onmousedown="${onClickFn.replace(/MAT/g,esc(name)).replace(/NAME/g,esc(name))}">
      <span class="mat-cat-dot ${cat}"></span>${esc(name)}
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
function fmAcShow(inputId,catId,acId){
  const q=document.getElementById(inputId).value;
  const exact=KM[q.trim().toLowerCase()];
  if(exact) document.getElementById(catId).value=exact.cat;
  const matches=allMatNames().filter(n=>!q||n.toLowerCase().includes(q.toLowerCase())).slice(0,12);
  const ac=document.getElementById(acId); if(!ac) return;
  if(!matches.length){ac.classList.add('hidden');return;}
  ac.innerHTML=matches.map((name,i)=>{
    const cat=catFor(name);
    return `<div class="mat-autocomplete-item" data-idx="${i}" data-name="${esc(name)}"
      onmousedown="fmPick('${esc(name)}','${catId}','${acId}','${inputId}')">
      <span class="mat-cat-dot ${cat}"></span>${esc(name)}
    </div>`;
  }).join('');
  ac.classList.remove('hidden');
  fmIdxMap[acId]=-1;
}
function fmAcKey(e,inputId,catId,acId){
  acKeyNav(e,acId,idx=>{
    const items=document.querySelectorAll(`#${acId} .mat-autocomplete-item`);
    if(idx>=0&&items[idx]) fmPick(items[idx].dataset.name,catId,acId,inputId);
    else hideAc(acId);
  },fmIdxMap,acId);
}
function fmPick(name,catId,acId,inputId){
  document.getElementById(inputId).value=name;
  const m=KM[name.toLowerCase()];
  if(m) document.getElementById(catId).value=m.cat;
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({recipes, nullCodes, tokenData, lastUpdated}));
}

function fmtDate(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short'});
}

function exportData() {
  if (!recipes.length && !Object.keys(nullCodes).length) { alert('Nothing to export.'); return; }
  const payload = {
    app: 'Stone Saga Crafting Journal',
    version: 2,
    exportedAt: new Date().toISOString(),
    lastUpdated: lastUpdated || new Date().toISOString(),
    recipes,
    nullCodes,
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)], {type:'application/json'}));
  // filename includes date + time to the minute
  const ts = new Date().toISOString().replace('T',' ').slice(0,16).replace(/[: ]/g,'-');
  a.download = `stonesaga-${ts}.json`;
  a.click();
}

function triggerImport() {
  document.getElementById('import-file').value = '';
  document.getElementById('import-file').click();
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
      pendingImport = { recipes: incoming, nullCodes: inNull, meta: d };

      // Build summary
      const fileUpdated  = d.lastUpdated  ? fmtDate(d.lastUpdated)  : (d.exportedAt ? fmtDate(d.exportedAt) : 'unknown');
      const nullCount    = Object.keys(inNull).length;
      document.getElementById('im-summary').innerHTML =
        `<strong>File:</strong> ${esc(file.name)}<br>` +
        `<strong>Last updated:</strong> ${esc(fileUpdated)}<br>` +
        `<strong>Recipes:</strong> ${incoming.length} &nbsp;·&nbsp; <strong>Dead-end codes:</strong> ${nullCount}`;

      const curUpdated = fmtDate(lastUpdated);
      document.getElementById('im-current').innerHTML =
        `Your current data: ${recipes.length} recipe(s), ${Object.keys(nullCodes).length} dead-end code(s) — last updated ${esc(curUpdated)}`;

      document.getElementById('import-overlay').classList.remove('hidden');
    } catch { alert('Could not parse JSON file.'); }
  };
  reader.readAsText(file);
}

function doImport(mode) {
  if (!pendingImport) return;
  const { recipes: incoming, nullCodes: inNull } = pendingImport;
  if (mode === 'merge') {
    const map = Object.fromEntries(recipes.map(r => [r.id, r]));
    incoming.forEach(r => { map[r.id] = r; });
    recipes = Object.values(map);
    Object.assign(nullCodes, inNull);
  } else {
    recipes  = incoming;
    nullCodes = inNull;
  }
  pendingImport = null;
  save(); renderJournal();
  closeImportModal();
  if (document.getElementById('tab-explorer').classList.contains('active')) renderExplorer();
}

function closeImportModal() {
  pendingImport = null;
  document.getElementById('import-overlay').classList.add('hidden');
}

// ═══════════════════════════════════════════════════
// KEYBOARD
// ═══════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeModal();closeStatusModal();closeImportModal();}
  if(e.key==='n'&&!e.target.matches('input,textarea,select')) openModal();
});

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
load();
renderJournal();
