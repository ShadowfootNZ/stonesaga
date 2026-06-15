# Stone Saga — Crafting Journal

A browser-based crafting tracker for the Stone Saga board game. Records discovered
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
| `token-data.example.json` | Sample token pip data (format reference) |

## Running it

Open `index.html` in a browser, or enable GitHub Pages (Settings → Pages → deploy from
branch, root) and visit `https://shadowfootnz.github.io/stone-saga/`.

All data is stored in the browser's `localStorage`, which is per-browser and per-origin.
Nothing is sent anywhere. To share data between people, use **Export JSON** and have
others **Import** it.

## Features

- **Journal** — record discovered items with their item-card number, all crafting codes,
  the two source materials (with category), and notes.
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

```json
{
  "Wood (hardened)": [
    ["Blue", 2, "Red", 1],
    ["Yellow", 3, "Blue", 2]
  ],
  "Feather": [
    ["Red", 1, "Blue", 0],
    ["Blue", 1, "Red", 2]
  ]
}
```

Each material maps to a list of orientations. Each orientation is
`[leftColour, leftCount, rightColour, rightCount]`. Use `null` for a null icon
(count `0`). Pip colours: Blue, Red, Yellow, Purple, Grey.

## Materials

Each material has an unprocessed and a processed form:

- **Animal** — Bone (carved), Hide (cured), Shell (sharpened), Guts (cured), Feather (cut), Tooth (drilled)
- **Mineral** — Clay (fired), Cloudstone (shaped), Riverstone (flaked), Sunstone (shaped)
- **Plant** — Wood (hardened), Fiber (woven), Pitch (treated)
- **Rare** — Moonblood (solid), Coral (dead → living), Silk (woven)

Note Coral is the exception: its unprocessed state is "dead" and processing yields "living".
