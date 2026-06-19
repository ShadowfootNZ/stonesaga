# Stonesaga — Crafting Journal

A browser-based crafting tracker for the Stonesaga board game. Records discovered
recipes, computes possible crafting codes from token pip data, and lets a whole table
share a common set of values via JSON export/import.

No build step, no dependencies, no server. It's a static site — open `index.html` or
host it on GitHub Pages.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page markup |
| `styles.css` | All styling |
| `app.js` | Application logic |
| `materials.json` | Material definitions — edit this to add new materials |

## Running it

Open `index.html` in a browser, or enable GitHub Pages (Settings → Pages → deploy from
branch, root) and visit [https://shadowfootnz.github.io/stonesaga/](https://shadowfootnz.github.io/stonesaga/).

All data is stored in the browser's `localStorage`, which is per-browser and per-origin.
Nothing is sent anywhere. To share data between people, use **Export JSON** and have
others **Import** it.

## Features

- **Journal** — record discovered items with their item-card number, all crafting codes,
  the two source materials (category is auto-derived from the material name), and notes.
- **Combination Explorer** — pick one or two materials and see every valid crafting code,
  flagged as discovered, dead-end, or unknown. Selecting an unprocessed material also
  considers its processed form.
- **Token pip data** — load a JSON file describing each token's pip layout to enable
  automatic code computation.
- **Code shorthand** — type codes like `B2132, R4210` (B/R/Y/P/G + four digits).
- **Export / Import** — timestamped JSON, with a choice of merge or overwrite on import.

## Crafting model

Two material tokens are placed side by side. Their inner (touching) edges must share the
same pip type. The crafting code reads the four outer vertical columns left to right:
token A's left and right edges, then token B's left and right edges. The colour of the
code is the pip type in the leftmost column. Null icons count as zero and may only appear
in the last column.

Token order matters — A-left/B-right and B-left/A-right are distinct combinations.

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
Use `null` for a null icon (count `0`). Pip colours: Blue, Red, Yellow, Purple, Grey.

## Adding materials

Edit `materials.json` — the app fetches it at startup. Each entry is keyed by material
name and has the following fields:

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

The `materials.json` format is only supported when the app is served over HTTP (GitHub
Pages, a local dev server, etc.). Opening `index.html` directly via `file://` falls back
to the built-in list hardcoded in `app.js`.

## Materials

Each material has an unprocessed and a processed form:

- **Animal** — Bone (carved), Hide (cured), Shell (sharpened), Guts (cured), Feather (cut), Tooth (drilled)
- **Mineral** — Clay (fired), Cloudstone (shaped), Riverstone (flaked), Sunstone (shaped)
- **Plant** — Wood (hardened), Fiber (woven), Pitch (treated)
- **Rare** — Moonblood (solid), Coral (dead → living), Silk (woven)

Note Coral is the exception: its unprocessed state is "dead" and processing yields "living".
