# Stonesaga — Campaign Journal

A browser-based campaign journal for the Stonesaga board game. Records discovered
recipes, computes possible crafting codes from token pip data, tracks the wider
campaign (culture, behemoths, challenges, investigations, notes), and lets a whole
table share a common journal via JSON export/import or Google Drive sync.

No build step, no dependencies, no server. It's a static site — open `index.html` or
host it on GitHub Pages.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page markup |
| `styles.css` | All styling |
| `app.js` | Application logic |
| `materials.json` | Material definitions — edit this to add new materials |
| `drive-sync.gs` | Google Apps Script for Drive sync — deploy once, see below |

## Running it

Open `index.html` in a browser, or enable GitHub Pages (Settings → Pages → deploy from
branch, root) and visit [https://apps.shadowfoot.com/stonesaga/](https://apps.shadowfoot.com/stonesaga/).

All data is stored in the browser's `localStorage`, which is per-browser and per-origin.
To share data between people, use **Export JSON** and have others **Import** it, or set
up **Drive Sync** (see below) so the group pulls and pushes to a shared file automatically.

## Features

- **Combination Explorer** — pick one or two materials from the dropdowns and see every
  valid crafting code, flagged as discovered, dead-end, inferred, unverified, or unknown.
  Selecting an unprocessed material also considers its processed form. A material may be
  paired with itself (two tokens at independent rotations). Materials whose inner edge is
  always a null icon (e.g. Feather, Tooth (drilled)) can only sit in the Material B slot
  and are excluded from Material A.
- **Recipes** — record discovered items with their item-card number, all crafting codes,
  the two source materials, and notes. A recipe can carry alternate material combinations:
  when a newly found code already belongs to a recipe, the app offers to attach the new
  pair instead of duplicating the item.
- **Inferred combinations** — crafting codes come entirely from the visible edge pips, so
  materials sharing an edge-pair are interchangeable (e.g. Bone ⇄ Wood, Guts (cured) ⇄ Silk).
  When a computed code matches one already recorded, the Explorer shows a dashed-green
  *Inferred* card with one-tap **Add to recipe**; **Infer Combinations** on the Recipes tab
  sweeps every recorded code and attaches all equivalent pairs, marked *inferred* until
  crafted for real.
- **Journal tabs** — Culture (tribe name, structures, mantle powers, knowledge cards,
  taboos, pigments), Behemoths (lair hex, demeanor, revealed secrets), Challenge Record
  (grouped by epoch, newest first), Looming Challenges (re-orderable), Investigations,
  and free-form Notes pages. All of it exports, imports, and Drive-syncs with the rest.
- **Import Codes CSV** — pre-load community crafting-code files (`Code;Flavor;Game Text;Item Name`,
  pip colour taken from the filename). Entries are treated as unverified: the code and item
  card ID are shown, but names and text stay behind a *Reveal spoiler* toggle until the card
  is confirmed at the table. Rows named `None` are community-reported dead-ends with the
  hint text behind *Reveal hint*.
- **Materials** — browse all materials in a card grid with pip marks and category filter.
  Add custom materials discovered during play; they are stored in the export JSON so they
  travel with the group's data.
- **Token pip data** — pip marks for all built-in materials are included. Load a custom
  JSON file to override built-in data or add materials not yet in the app.
- **Code shorthand** — type codes like `B2132, R4210`
  (B=Blue, R=Red, Y=Yellow, P=Purple, G=Grey, Gn=Green, O=Orange, S=Silver + four digits).
- **Export / Import** — timestamped JSON with merge or overwrite on import. The export
  file carries the group's Drive file ID so it connects new devices automatically.
- **Drive Sync** — pull the latest state from a shared Drive file, resolve any conflicts
  via the merge screen, and push the result back. See setup below.

## Drive Sync setup

One person does this once; everyone else connects automatically when they import any JSON
that has been synced.

1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Paste the contents of `drive-sync.gs`, replacing the default code.
3. Click **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** and copy the Web App URL.
5. Open `app.js` and paste the URL as the value of `DRIVE_SYNC_URL` (near the top of the
   CONSTANTS section).
6. In the app, open **Drive Sync → Create group file**. The file is created in a
   `Stonesaga` folder in your Google Drive.
7. Export your JSON and share it with the group — the Drive file ID travels inside it.

Each player clicks **Drive Sync → Sync** to pull the latest state, review any conflicts,
and push the merged result back.

## Crafting model

Two material tokens are placed side by side. Their inner (touching) edges must share the
same pip type. The crafting code reads the four outer vertical columns left to right:
token A's left and right edges, then token B's left and right edges. The colour of the
code is the pip type in the leftmost column. Null icons count as zero and may only appear
in the last column.

Token order matters — A-left/B-right and B-left/A-right are distinct combinations.

Because the null icon can never sit on an inner edge, a material qualifies as the left
token (Material A) only if some rotation gives it a non-null right edge. A material may
be paired with itself: the two physical tokens rotate independently, so e.g.
Fiber (woven) × Fiber (woven) yields six distinct codes.

The codex maps each code to its result, and the code depends only on the visible pips —
so materials with identical edge-pairs craft identical results. With the base material
set: Bone ⇄ Wood and Guts (cured) ⇄ Silk are fully interchangeable, and Fiber (woven)
matches Guts (cured)/Silk on their Yellow 1/Blue 1 edges.

## Token data format

Pip data for all materials listed in [Materials](#materials) is built in — no file needed
for normal use. Load a custom file only to override built-in data or add materials not
yet in the app.

```json
{
  "Wood (hardened)": [
    ["Blue", 2, "Red", 1],
    ["Yellow", 3, "Blue", 2]
  ],
  "Feather": [
    ["Red", 1, null, 0],
    ["Blue", 1, "Red", 2]
  ]
}
```

Each material maps to a list of valid orientations (only orientations with a non-null left
edge are included). Each orientation is `[leftColour, leftCount, rightColour, rightCount]`.
Use `null` for a null icon (count `0`). Pip colours: Blue, Red, Yellow, Purple, Grey, Green, Orange, Silver.

## Adding materials

**In the app** — use the **Materials** tab → **+ Add Material**. Custom materials are
stored in localStorage and in the export JSON so they sync to the whole group.

**In `materials.json`** — edit the file and serve the app over HTTP (GitHub Pages, a
local dev server, etc.). Each entry is keyed by material name:

```json
"Amber (polished)": {
  "cat": "rare",
  "base": "Amber",
  "processed": null,
  "image": "assets/images/materials/amber-polished.webp",
  "marks": { "left": "Red 3", "right": "Blue 2", "top": "Yellow 1", "bottom": "Red 4" }
}
```

- `cat` — `animal`, `plant`, `mineral`, or `rare`
- `base` — the raw form's name, or `null` if this is the raw form
- `processed` — the processed form's name, or `null` if this is the processed form
- `image` — path relative to the project root; drop the image in `assets/images/materials/`
- `marks` — the four edge pips (`left`, `right`, `top`, `bottom`), each `"Color N"` or `null`

If a name in `materials.json` matches a custom material added in-app, the official entry
takes precedence. Opening `index.html` directly via `file://` falls back to the built-in
list hardcoded in `app.js`.

## Materials

Each material has an unprocessed and a processed form:

- **Animal** — Bone (carved), Hide (cured), Shell (sharpened), Guts (cured), Feather (cut), Tooth (drilled)
- **Mineral** — Clay (fired), Cloudstone (shaped), Riverstone (flaked), Sunstone (shaped)
- **Plant** — Wood (hardened), Fiber (woven), Pitch (treated)
- **Rare** — Moonblood (solid), Coral (dead → living), Silk (woven)

Note Coral is the exception: its unprocessed state is "dead" and processing yields "living".
