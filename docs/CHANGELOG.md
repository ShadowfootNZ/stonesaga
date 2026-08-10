# Changelog

Completed items moved out of [TODO.md](TODO.md) once fully resolved (no
pending sub-tasks). Numbering matches the TODO item each entry originated
from — numbers are not reused, so gaps in TODO.md's own numbering are
expected and mean "done, see here."

## 1. Add an "Unknown" count to the Workshop stats bar — DONE 2026-07-26

The stats bar (`index.html`, `#stat-total` / `#stat-nothing`) shows Recipes
and Dead ends. Add a third stat: the number of computed crafting codes that
are neither discovered (attached to a recipe) nor recorded as null/dead-end —
i.e. codes still to try. Compute from `computeCodes()` across all craftable
material pairs minus recipe codes and `nullCodes`, mirroring the
`unknownComputed` logic in `renderExplorer()`. Requires token pip data to be
loaded; show the stat as `—` (or hide it) when `tokenData` is empty.

## 2. Add processing requirement(s) to unprocessed materials — DONE 2026-08-10 (schema + display shipped 2026-07-26; data fully filled 2026-08-10)

Record which processing action(s) turn each raw material into its processed
form. This is a **closed set**: originally `cut`, `drill`, `grind`, `heat`,
`strike`, `comet` — extended 2026-08-10 to also include `moon` (see #12
below) plus two newly-reported actions, `scrape` and `energy`, once Brian
supplied the full 16-material list from the cards. The first five (of the
original six) are granted by other materials and some items; some
structures also permit these actions, but structure tracking is
deliberately out of scope — the app records only which action a material
needs, not whether the tribe can currently perform it.

- Data change: optional `processing` array on raw-material entries in
  `materials.json` (e.g. `"processing": ["heat"]`), documented in its
  `_readme`. Nullable — fill values in as they're confirmed from cards.
- Multiple entries are **alternatives (OR)** — any one listed action
  processes the material (confirmed 2026-07-26).
- Display on the material card in the Materials tab, and as a hint on the
  Mantle tab's Process button (e.g. `Process (heat)`, `Process (cut or
  heat)`).
- **Informational only — never gate the Process button on it**, since the
  app can't know what structures/items make an action available.
- Any editing UI uses a native multi-select/checkbox set for the closed list
  (house rule: native selects for closed sets).

Final data (all 16 raw materials, Brian 2026-08-10): Bone [drill, cut],
Clay [heat], Cloudstone [grind], Coral [comet], Feather [cut], Fiber [cut],
Guts [heat, cut], Hide [drill, cut], Moonblood [moon], Pitch [heat],
Riverstone [strike], Shell [drill, scrape], Silk [energy], Sunstone
[scrape], Tooth [drill], Wood [heat, cut]. Icons added to
`PROCESSING_ICONS` (`app.js`) for `moon`/`scrape`/`energy` matching the
hand-drawn style of the existing six. The `KNOWN_MATERIALS_BUILTIN`
fallback array (used only when `materials.json` can't be fetched, e.g.
`file://`) was also brought in sync — it had never carried `processing`
data at all, even for the materials filled in on 2026-07-26.

## 3. Optional codex data file to prepopulate Codex tab details — DONE 2026-07-26

The Codex tab currently records entries by number only — in the 2026-07-26
export all 13 `codexEntries` have empty `title`/`sourceCategory`. We have the
full corrected codex text in `data/stonesaga_codex_corrected.csv` (~17k lines:
`stable_key`, `section`, `source_id_or_name`, `corrected_text`, errata
columns; a JSON conversion already exists at
`data/stonesaga_codex_corrected.json`).

- Loading is **optional**: the app works unchanged without it. Load via a
  local file picker on the Codex subtab (accepts the corrected-codex JSON
  directly; the app trims it to entry-number → text and stores it in its own
  device-local localStorage key, outside the synced save).
- Entries have no names in the source data — display plan (agreed
  2026-07-26):
  1. **Derived title, editable, shared**: when the file is present, typing an
     entry number prefills the blank `title` field with the first sentence
     clipped to ~70 chars (e.g. 002 → "Cold rays of sunlight linger on
     rattling leaves…"). User-editable before save; syncs like a hand-typed
     title, so devices without the file still see names. A one-line snippet
     is acceptable minimal quotation.
  2. **Full text behind an expander, local-only**: cards get a "Read entry"
     `<details>` with the complete text, rendered from the local lookup at
     display time — never stored, never exported. Saved entries with blank
     titles also fall back to the derived title at render time.
- **The full text is never shared through the app**: not in the export JSON,
  Drive sync, or merge path (copyrighted game text; also keep any derived
  lookup file out of git and the hosted bundle).
- Side note: the source's RECIPES section (291 entries) is keyed by crafting
  code (`Y1110`) — same shape as the provisional-codes CSVs; possible future
  cross-check for `provisionalCodes`, out of scope here.

## 4. Devise a plan for different-sized cards in the Culture tab — DONE 2026-07-26

Chosen approach: grid-column spanning + `grid-auto-flow: dense` +
`align-items: start`, plus CSS multi-column for the large block's own row
list. `.culture-lists` (`styles.css`) already collapses short blocks to
their intrinsic height instead of stretching to the tallest block in the
row; any block with `list.length >= LARGE_BLOCK_THRESHOLD` (8, set in
`renderCulture()`, `app.js`) gets `.culture-block--lg`
(`grid-column: 1/-1`, full row width — no leftover gap regardless of how
many outer tracks fit), and `dense` packing lets the small blocks fill in
around each other above it. Its row list (now wrapped in
`.culture-block-rows`) uses `columns: 3 230px` so the *data itself* lays out
in up to 3 sub-columns, self-limiting to 2 or 1 as the block's rendered
width shrinks — purely intrinsic to CSS multicol, no JS or extra
breakpoints. `break-inside: avoid` keeps rows from splitting across a
column break. Structures was also reordered to render last (see `blocks`
array in `renderCulture()`) so the large block doesn't push the small ones
down the page. Verified via Playwright screenshots at 1600/1100/900/700/500px
with 24 seeded structures: 3 columns down to ~700px, 2 from ~700–~600px
(outer grid still gives it a wide row), 1 below that.

Follow-up (2026-07-26, on request): the 3rd sub-column is now also gated on
list size, not just width, so an 8–14 item block (barely past
`LARGE_BLOCK_THRESHOLD`) doesn't get split into 3 skinny columns. A second
threshold, `WIDE_BLOCK_THRESHOLD` (15), adds `.culture-block--wide` on top
of `.culture-block--lg`; base `.culture-block-rows` caps at `columns:2
230px`, and `.culture-block--wide .culture-block-rows` overrides to
`columns:3 230px`. Verified via Playwright (`getComputedStyle().columnCount`
+ screenshots): 7 items → no multicol at all (not even `--lg`), 12 → 2
columns, 15/20 → 3 columns.

Second follow-up (2026-07-26, on request): the wide block's internal data
columns now line up with the outer grid's card-column count at the same
viewport width. Root cause of the earlier mismatch was that
`.culture-lists`'s `minmax(300px,1fr)` and `.culture-block-rows`'s
`columns:… 230px` used different minimum widths and gaps (1rem vs 1.4rem),
so the two column counts only coincidentally agreed. Fixed by sharing
`--culture-col-min` (300px) and `--culture-col-gap` (1rem) custom properties
between both declarations (`styles.css`) — same formula, same numbers, so
`auto-fill` on the outer grid and `columns` multicol on the inner one
resolve to the same count in practice. Deliberately did **not** chase exact
pixel parity via subgrid or a real nested grid: Brian wants the data list to
keep multicol's column-major reading order (top-to-bottom then next column,
like alphabetical listings read), not a real grid's row-major order, and is
fine with the two occasionally disagreeing right at a breakpoint edge (the
block's own `1rem` padding isn't compensated for). The `WIDE_BLOCK_THRESHOLD`
item-count cap still applies on top, so the effective column count is
`min(matched outer count, size-based cap)`. Verified via Playwright
(measuring actual rendered column offsets, not `getComputedStyle`'s
column-count — that only echoes the declared value, not the browser's
fitted result): 20 items match the outer grid's column count (3→2→1) across
1600→500px; a 10-item block stays capped at 2 even when the outer grid is
3-wide.

## 5. Sort structures by name, with a name/date/ID sort toggle — DONE 2026-07-26

Culture tab → Structures list defaults to name (a→z). A toggle button in the
block header cycles name → added date (oldest first, via `updatedAt`) →
card ID (numeric-aware, so ST10 sorts after ST2, not before) → back to
name, with the button label showing the active mode. Follows the Cave Wall
sort-toggle pattern: device-local view preference in its own localStorage
key, not synced. Verified via Playwright: all three orderings and the
persisted localStorage value.

Generalized to `sortCultureList(sec,list)` / `toggleCultureSort(sec)` /
`CULTURE_SORTABLE_SECTIONS` (`app.js`) so any culture section can opt in
with its own default mode and storage key (`CULTURE_SORT_DEFAULTS`,
`stonesaga_<sec>_sort`). Outposts added the same toggle, defaulting to
"oldest first" instead of name (2026-07-26, on request) — verified the two
sections sort and persist independently.

## 6. Downplay IDs in the Culture and Behemoth tab lists — DONE 2026-07-26

Card IDs previously reused `.recipe-code` — the same bold pill styling as
crafting-code chips (color+digits) elsewhere in the app, which made them
compete with the name. Split into a new `.card-id` class (`styles.css`):
no background/border/padding, `.72rem`, `color:var(--flint)` — plain muted
text rather than a chip. Applied everywhere a card ID renders in Culture
(via the shared `idChip()` helper in `renderCulture()`, `app.js`) and
Behemoths (`renderBehemoths()`, both the card title and the revealed-secrets
list). `.recipe-code` itself is untouched — still used for actual crafting
codes on the Workshop/Recipes tabs. Verified via Playwright screenshot with
seeded Structures/Outposts/Mantle Powers/Knowledge Cards/a Behemoth
(+secret): names now read as primary bold text, IDs as small muted
prefixes.

## 9. Show right-slot-only materials in the Material A dropdown — DONE 2026-07-19

`populateExplorerSelects()` currently excludes materials that fail
`canBeLeft()` (e.g. Feather, Tooth (drilled)) from the Material A dropdown,
because they can only sit in the right token slot. Remove that exclusion so
these materials can be the starting point of an exploration: when the chosen
Material A can't sit left, `renderExplorer()` should flip the pairing and
show all combinations with that material on the right instead (pair `[b, a]`
for each candidate `b` that can be left). This answers "what can I combine
with a Feather?" — currently impossible without checking every other
material one at a time from the B side.

## 11. Orange pip must always resolve to the leftmost/colour position — DONE 2026-08-07

Not about which material the Explorer treats as "A" — it's inside
`computeCodes()` (`app.js:357-384`), which tries every orientation row of
material A against every orientation row of material B (`orientA`/
`orientB`, each row `[leftColor,leftCount,rightColor,rightCount,rot]`) and
returns a result for every pairing whose inner edge matches, with `color`
taken from whichever row's left pip won that pairing. Worked example (Brian,
2026-08-02): a token with rows `Blue×2/Orange×1` and its flipped
`Orange×1/Blue×2` would, self-paired, currently yield two results —
`B2112` and `O1221` — but only `O1221` is legal: orange always occupies the
leftmost/colour slot whenever present.

Brian's follow-up (2026-08-02, ~100% confidence, unverified against the
physical tokens): no material has an orange pip on *both* axes, and
whichever axis isn't orange is **null**, not a second colour — so an
orange-bearing material shouldn't have 4 valid orientation rows in the
first place, only the orange-first one(s). `computeCodes()` already skips
any pairing whose inner edge is null (`if (arc === null || blc === null)
continue`), so **if `tokenData` is correct, this may already resolve itself
with no logic change** — the `B2112`-style phantom result would only arise
from a bad orientation row in the data (e.g. a wrongly-populated
non-orange-axis count instead of null). Before touching `computeCodes()`,
audit `tokenData` (`app.js:192`, loaded from the token pip source at
`app.js:2259`) for every orange-pip material and confirm the non-orange
axis is genuinely `null` in every row; fix at the data source. Only add a
runtime filter to `computeCodes()` if a genuine case survives that audit
where two legitimate rows disagree on which colour is left.

Audit result (2026-08-07): the data is already correct — no built-in
material in `materials.json` has an orange mark; the three orange materials
are custom trophies in the synced save (Shimmering Moss O1/Y5, Ruinous
Shard O1/B2, Sundered Stone O1/P6), each with the non-orange axis fully
`null`. The phantom therefore does **not** come from bad data: it comes
from the 180° flip row `marksToOrientations()` correctly generates from
correct marks (`[R, L, 180]` puts orange on the inner edge), so the runtime
filter is needed after all. Rule confirmed in play (Brian, 2026-08-07 — a
revealed game rule, not a house rule): when orange is used in a recipe it
must be the leftmost of the 4 elements, which prevents orange being used in
the second material. Ruling tightened same day: orange may appear **only**
at position 1 (the colour slot) — an orange pip at position 2, 3, or 4
makes the pairing illegal, so self-pairing an orange material yields
nothing at all. This supersedes the 2026-08-02 worked example's conclusion
that `O1221` was legal (its B-right orange makes it illegal too). Fix: in
`computeCodes()`, after the inner-edge checks, skip the pairing if any of
A-right, B-left, or B-right is orange
(`if (arc==='Orange'||blc==='Orange'||brc==='Orange') continue;`). An
orange material can still lead legally as material A (orange leftmost)
against any orange-free partner whose left edge matches A's inner colour.

Implemented 2026-08-07 (`computeCodes()`, `app.js`). Verified via
Playwright driving the real page (seeded all three trophies plus an
orange-free Blue-left partner): both self-pairs and the Shard×Stone
cross-pair return zero codes, Shard leading the partner still yields
`O1223`, the partner leading Shard yields nothing (orange can't enter
via B), and Bone×Bone still returns its 6 pre-fix codes.

## 12. Add the Moon omen as a processing-action option — DONE 2026-08-10

Moonblood needs the Moon omen to be processed, the same way Coral needs the
Comet omen (already modeled: `comet` is one of `PROCESSING_ACTIONS`,
`app.js`). Added `moon` to that closed set alongside
`cut/drill/grind/heat/strike/comet`, and set Moonblood's `processing` to
`["moon"]` in `materials.json`, confirmed from the card as part of the same
2026-08-10 data pass that filled in the rest of #2's materials (which also
surfaced two more actions, `scrape` and `energy` — see #2 above). Small,
self-contained extension of #2's schema — unrelated to the grinding-results
mechanic in TODO.md #10, despite the name overlap with `grind`.

## 13. Fix multi-column width mismatch: Knowledge Cards / Mantle Powers vs Structures — DONE 2026-08-07

Root cause (clarified 2026-08-07): not which blocks cross the thresholds —
`.culture-block--lg` itself was `grid-column:1/-1` (full row) while its rows
cap at `columns:2`, so on a 3-track grid an 8–14-item block spanned 3
tracks' width holding only 2 data columns. `--wide` had the same latent bug
one size up (would span a 4-track grid with only 3 columns). Rule adopted:
**a large block spans exactly as many outer tracks as its internal column
cap** — `--lg` gets `grid-column:span 2`, `--wide` `span 3` (`styles.css`),
so the width always matches the content columns and `grid-auto-flow:dense`
packs small blocks into the freed track(s) beside it. Because `span N` on a
grid with fewer than N tracks would force implicit tracks and overflow,
each span is gated by a container query on `.culture-lists` (now
`container:culture-lists/inline-size`) at the same widths where `auto-fill`
adds the matching track (616px / 932px — hardcoded, since container size
queries can't read the shared `--culture-col-min`/`--culture-col-gap` vars;
commented accordingly). Verification also surfaced a real boundary bug from
#4's accepted padding imprecision: at 1024px (iPad landscape, 3 tracks) a
span-2 block's 1rem padding + 1px border left its inside ~34px too narrow
for two 300px columns, collapsing it to one fat column — fixed by lowering
the multicol minimum to `calc(var(--culture-col-min) - 2rem - 2px)`; the
declared column count still caps overfit. No `app.js` changes; thresholds,
column-major reading order, and Structures-last ordering untouched.
Verified via Playwright (real page, all three sections seeded large at
once — the case #4 never tested; measuring rendered column offsets and
width-in-tracks, not declared values) at 1600/1180/1024/810/768/700/616/
500px in two scenarios: Structures 24 / Mantle Powers 16 / Knowledge Cards
16 (all wide) and 24/10/12 (wide + two lg) — every large block spans
exactly its fitted column count at every width, and screenshots confirm
small blocks now sit beside the 2-track blocks on 3-track layouts.

## 16. Fix column break splitting a Mantle-of-X heading from its powers — DONE 2026-08-10

When Mantle Powers renders as multi-column (`mantlePowersHtml()`,
`app.js`), a "Mantle of the X" group heading (`.culture-group-title`) could
land as the last item of one column while that mantle's powers started the
next column — an inter-element break the existing `break-inside:avoid` (on
each row/title individually) doesn't prevent, since that only stops a
*single* element from splitting internally. Fix: `break-after:avoid-column`
added to `.culture-group-title` (`styles.css`), which tells the browser not
to place a column break immediately after the heading — glues it to at
least its first power without forcing the whole group (which can run to
dozens of powers) into one column.

Verified in two stages, since the real page's natural data didn't happen to
trigger the bug on the first seed tried (16 items across 6 groups balanced
into 8/8/6 with no orphan by luck) — that only proves the CSS didn't
regress anything, not that it fixes the bug. Built an isolated multicol
test instead: fixed-height title/row boxes with `column-fill:auto` and
column height chosen so a boundary falls exactly on a title's bottom edge
(title 20px + 4 rows × 20px + title = 120px = column height). Without the
fix, column 0 ends on the second title (confirmed orphan); with it, the
same content rebalances cleanly to 5/5/5 with the title pushed into the
next column alongside its rows. Confirms the property is honored in
Chromium; Safari/iPad (the group's real device) still unverified — same
caveat as the rest of this multicol work.
