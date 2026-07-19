# Mantle tab (satchel) — implementation spec

Status: phases 1 and 2 implemented (2026-07-19).
Audience: an implementer with no prior context on this codebase.

## Background

Stonesaga game sessions run out of physical material tokens, forcing players to
use placeholders. This feature adds a lightweight digital "mantle board"
(character-sheet-lite) to the existing companion app: a per-device tracker for
material counts, with a raw→processed conversion action, and (phase 2) a view
of what the player can craft with what they hold.

Explicit decisions already made with the user — do not revisit:

- **Per-device, session-scoped.** Every player uses their own device. There is
  NO player/character selector, NO multi-satchel support.
- **Local only, never synced.** Satchel state lives in its own localStorage
  key. It must NEVER appear in the campaign export JSON, the `STORAGE_KEY`
  payload, Drive sync, or merge logic. This keeps it out of the shared schema
  and conflict-resolution machinery entirely.
- **Base materials only.** Filter to `BASE_MATERIALS` (loaded from
  `materials.json`). Custom/special items are managed differently at the table
  and are out of scope.
- **Counts, not booleans.** Acquiring materials often yields multiple copies of
  multiple different materials, so the UI is count-based with fast increment.
- **Process = one copy at a time.** One tap converts exactly one raw copy to
  its processed form.
- **No persistence between campaigns needed**, but localStorage is used anyway
  so an accidental mid-session page refresh doesn't wipe the satchel.

## Codebase orientation

Single-page vanilla JS app, no build step, no framework, no package.json.
Everything relevant lives in three files at repo root:

- `index.html` — all markup, tabs, and modals.
- `app.js` — all logic (~3200 lines). Line numbers below are approximate
  (file drifts); search for the named functions.
- `styles.css` — all styles.

Key existing pieces to reuse:

| What | Where | Notes |
|---|---|---|
| Top-level tab row | `index.html` `<div class="tabs">` (~line 45) | Buttons call `switchTab('<id>', this)`; panels are `<div class="tab-panel" id="tab-<id>">` |
| `switchTab(id, btn)` | `app.js` ~506 | Add a render hook for the new tab here, like the existing `cave-wall` hook |
| Material data | `materials.json`, fetched async at startup (`app.js` ~3217) into `BASE_MATERIALS`, then merged into `KNOWN_MATERIALS` / `KM` (name-lowercased lookup map) | Each entry: `{name, cat, base, processed, image, marks}`. `processed` links a raw material to its processed form by exact name (e.g. `"Hide"` → `"Hide (cured)"`) |
| `norm(s)` | `app.js` ~357 | trim+lowercase; use it for all count keys so they match `KM` keys |
| Material card rendering | `renderMaterials()` `app.js` ~2075 | Reuse `material-grid` / `material-card` CSS classes, image markup with the `onerror` placeholder fallback via `materialMarksPlaceholderHtml()` |
| Device-local (unsynced) localStorage pattern | `caveWallSort`, `app.js` ~2944 | Own key, try/catch on read and write, comment marking it as outside the synced save |
| Crafting explorer | `renderExplorer()` `app.js` ~746 | Phase 2 hooks in here; see below |
| Explorer filter state | `explorerFilter` (`'all'|'known'|'unknown'`), `setExplorerFilter()`, `app.js` ~701 | Filter buttons live in `index.html` `.explorer-filter-bar` (~line 183) |
| Escaping | `esc()` `app.js` ~356 | Use for every interpolated name in HTML |

Style conventions: no modules, functions on the global scope wired via inline
`onclick`/`oninput` handlers in HTML; state as top-level `let` variables;
re-render whole panels with `innerHTML` template strings. Match this — do not
introduce modules, frameworks, or event-listener registration patterns.

---

## Phase 1 — Mantle tab

### State

```js
// Satchel: per-device material counts for the current game session.
// Lives in its own localStorage key, outside the synced save — never
// exported, merged, or pushed to Drive. Keys are norm()'d material names.
let mantleCounts = {};            // {"hide": 2, "hide (cured)": 1, ...}
const MANTLE_KEY = 'stonesaga_mantle';
```

- Load at startup (near the other startup code) with try/catch; malformed or
  missing JSON → `{}`. Stored shape: `{"counts": {...}}` so the schema can
  grow later without a breaking change.
- `saveMantle()` writes `JSON.stringify({counts: mantleCounts})` in try/catch
  (ignore quota errors — this is small data, and the app already has a storage
  guard for the main save; do NOT route mantle data through it).
- Counts are non-negative integers. Decrement clamps at 0; delete zero-count
  keys on save to keep the object clean.

**Guard rail (critical):** grep for `buildExport` / the export function and the
Drive push payload and confirm nothing there serializes `mantleCounts`. It
won't by default (export enumerates explicit fields), but the point of this
feature's storage design is that it stays out — do not "helpfully" add it.

### UI

**Tab:** add a top-level tab button `Mantle` to the tab row in `index.html`
(between Workshop and Journal is fine) and a matching panel:

```html
<button class="tab-btn" onclick="switchTab('mantle',this)">Mantle</button>
...
<div class="tab-panel" id="tab-mantle"> ... </div>
```

In `switchTab()` add `if(id==='mantle') renderMantle();`.

**Panel contents, top to bottom:**

1. Controls row (reuse `.controls`):
   - Search box (reuse `.search-box`), `oninput="renderMantle()"`,
     placeholder "Search materials…".
   - "Held only" toggle — a labelled checkbox styled like the existing
     `.filter-mode-toggle` in the Recipes tab. When checked, only materials
     with count > 0 render. Default: **checked** (plain `checked` attribute
     in the HTML; the DOM keeps the player's choice for the page lifetime —
     do not persist it). An empty satchel with the box checked shows the
     empty-state hint pointing at unticking to browse the catalogue. When
     unchecked (browse-all mode), held cards must stand out: ochre border,
     ochre tint background, inset left accent bar, ochre count (see
     `.mantle-held` in styles.css).
   - "New Session" button (`.btn`), calls `confirm('Clear all satchel counts?')`
     then zeroes `mantleCounts`, saves, re-renders.
2. Material grid — reuse `.material-grid` and `.material-card` markup from
   `renderMaterials()`, minus the pip-mark chips, notes, and custom-material
   actions. Alphabetical by name. Source list is `BASE_MATERIALS` only.

**Each card:**

- Image (same `material-card-img-wrap` markup + `onerror` placeholder fallback
  as `renderMaterials`), name as the existing `material-tag` span with its
  category class.
- Count control row: `[ − ]  <count>  [ + ]` with **large tap targets**
  (min 44×44 px; this is used on phones mid-game). Count rendered prominently
  (badge or large numeral). `−` disabled/no-op at 0.
- **Process button** — render only when the material's `KM` entry has a
  non-null `processed` AND its raw count > 0. Label: `Process → <processed name>`
  (or a compact `⚒ Process` with the target name as `title`). One click:
  raw −1, processed +1, save, re-render. There is no reverse action.
  Forward-compatibility: a later TODO adds a `processing` array to raw
  materials in `materials.json` (closed set: cut/drill/grind/heat/strike/
  comet). When present, show it as a hint on this button (e.g.
  `Process (heat)`) — **informational only, never disable the button on it**,
  because the app deliberately doesn't track which structures/items make an
  action available.

Handlers follow the app's inline pattern, e.g.
`onclick="mantleAdd('hide',1)"` / `mantleAdd('hide',-1)` /
`mantleProcess('hide')` with the name pre-escaped via `esc()`/`norm()` exactly
the way `renderMaterials()` builds its buttons.

### CSS

Add to `styles.css`: a stepper-row style for the count controls (large
buttons, centered count) and anything needed for the count badge. Reuse
existing variables/palette (`--flint` etc.) and the existing card styles;
match the parchment aesthetic already in place. Keep it phone-first: the grid
already wraps; verify at ~390 px width.

### Acceptance criteria (phase 1)

1. Mantle tab shows all base materials with images; search and "Held only"
   filter work.
2. +/− adjust counts; − clamps at 0; counts survive a page reload.
3. Process appears only on raw materials with a processed variant and count
   ≥ 1; one click moves exactly one copy raw→processed.
4. New Session asks for confirmation, then zeroes everything.
5. Export JSON (header → Export) contains no mantle/satchel data; the string
   `mantle` (in the satchel sense — note `mantlePowers` legitimately exists in
   culture data) does not gain new fields in the export.
6. Custom materials never appear in the Mantle tab.
7. No console errors when `materials.json` hasn't loaded yet (render must
   tolerate empty `BASE_MATERIALS`, like other tabs do).

---

## Phase 2 — Craftable & Unknown subtabs (design revised 2026-07-19)

Goal: answer "what can we craft right now, and which untried codes could we
attempt, using only materials we hold?"

An earlier design put this in the Workshop explorer as an "In satchel"
toggle. That is **superseded — do not build the toggle**. The Mantle tab
instead gets three subtabs, following the same pattern as the Journal and
Workshop parent tabs (`switchJournalTab` / `switchWorkshopTab` in app.js:
a module-level current-subtab variable, a `*_TAB_RENDER` map, subtab buttons
with `data-sub`, panels named `tab-mantle-<sub>`):

1. **Materials** — the entire phase 1 UI (controls row + grid), moved
   unchanged into the first subtab panel. Default subtab.
2. **Craftable** — known items makeable from the satchel. Display only.
3. **Unknown** — untried combinations from the satchel, with the same
   Record discovery / Nothing actions as the Workshop explorer.

This works because a satchel holds few materials (typically 4–8 → 10–36
pairs), so both new subtabs can fan out across *all* held pairs unprompted —
the thing the Workshop explorer can't do catalogue-wide.

### Shared pair basis (Craftable and Unknown)

- Unordered pairs of held materials: both counts ≥ 1; a material paired with
  itself requires count ≥ 2. **No variant expansion** — you hold what you
  hold; a processed form counts only if actually held.
- Orientation for display/codes follows the explorer's rule: the left token
  needs `canBeLeft`; if one side can't sit left, flip; if neither can, the
  pair is invalid (same `addPair` logic as `renderExplorer`).

### Craftable subtab

- Live recipes (`live(recipes)`) where `recipeUsesPair(r, a, b)` matches a
  held pair. Render compactly: item name, card ID, the two material tags —
  reuse the recipe-card look.
- **Display only — deliberately no "Craft" button** (decided 2026-07-19):
  players adjust counts themselves on the Materials subtab. Do not add
  consumption here.
- Empty state: "Nothing craftable from your satchel yet."

### Unknown subtab

- For each held pair, the untried computed codes — `computeCodes(a, b)` minus
  codes attached to recipes minus `nullCodes` — rendered as the same combo
  cards as the Workshop explorer, with **Record discovery** and **Nothing**
  actions. Requires token data, like the explorer; show the explorer's
  no-token-data notice when `tokenData` is empty.
- **Reuse, don't copy**: extract the per-pair section/combo-card builder out
  of `renderExplorer()` into a shared helper both call. The Workshop
  explorer's own behaviour must not change.
- **Consumption on discovery** (the only consumption anywhere): when a
  discovery initiated from this subtab is saved, decrement each of the
  pair's materials by 1 — i.e. 2 total from one material for a self-pair.
  Key the decrement off the pair card the player tapped, **not** whatever
  materials they may edit in the record modal. Clamp at 0 (the held filter
  already guarantees sufficiency). Recording **Nothing** does NOT change
  counts (decided 2026-07-19 — failed attempts are not auto-charged).
- Sync split: the recipe/null-code record written by these actions goes into
  the shared synced journal exactly as it does from the Workshop; only the
  count decrement is device-local satchel state.

### Acceptance criteria (phase 2)

1. Mantle subtabs render and switch like the Journal's; Materials is the
   default and behaves exactly as phase 1 did.
2. Craftable lists precisely the known recipes whose pair is fully held
   (self-pairs need count ≥ 2), with no actions.
3. Unknown shows only held pairs' untried codes; Record discovery opens the
   pre-filled modal as in the Workshop, and saving decrements 1 per material
   (2 from one material for a self-pair) and adds the recipe to the shared
   journal.
4. Nothing records the null code (shared/synced) without touching counts.
5. Workshop explorer output is byte-for-byte unchanged for the same inputs.
6. With an empty satchel, Craftable and Unknown show sensible empty states.

### Explicit non-goals (both phases)

- No possessions/crafted-items list or mantle-power selection **in these two
  phases** — both are planned follow-ons (docs/TODO.md items #4 and #5), which
  is why the stored shape is `{counts: {...}}`: later phases add sibling keys
  (e.g. `items`, `powers`) without a breaking change. No special items ever,
  and no attributes beyond what's described (attribute steppers were
  considered and deferred).
- No sync, export, or merge of satchel data.
- No material consumption anywhere except saving a discovery from the Mantle
  Unknown subtab (decided 2026-07-19): the Craftable subtab is display-only,
  and recording Nothing never changes counts.

---

## Verification & deploy

- No test harness exists in the repo; verify manually against the acceptance
  criteria above, in a real browser at phone width. If you add automated
  tests, use jsdom-style DOM tests in a scratch script, but do not add a
  package.json/toolchain to the repo without asking.
- Deploy is GitHub-Actions-driven via `scripts/deploy.sh` (tar over SSH). It
  copies an explicit file list — this feature touches only `index.html`,
  `app.js`, `styles.css`, which are already stamped/copied, so **no deploy
  changes are needed**. Cache-busting: `index.html` references assets with a
  `STAMP` placeholder the deploy script rewrites; if you add any new asset
  reference (you shouldn't need to), follow that pattern.
- Keep commits conventional and small: phase 1 and phase 2 as separate
  commits/PRs.
