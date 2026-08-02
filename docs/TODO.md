# TODO

Feature backlog, numbered in the agreed implementation order (agreed
2026-07-26; renumbered 2026-07-26 to match — work top to bottom). Larger
planned work lives in its own spec (see
[mantle-tab-spec.md](mantle-tab-spec.md)); infrastructure/data TODOs (Drive
token enforcement, repo visibility, Valley Map, codex review) live in the
comment block at the top of `app.js`.

Ordering rationale:
- #1 — small, same crafting-engine area, natural tail to the explorer batch
- #2 — ship schema + display early, fill requirement data as encountered
- #3 — table value accrues over time; data conversion can happen without
  touching `app.js`, and render-time lookup fills existing blank entries
  retroactively
- #4 → #5 → #6 as one Culture-tab batch (all touch `renderCulture()` and
  culture styles): layout plan first since it may restructure the markup,
  then the sort toggle, then the pure-CSS ID restyle
- #7 then #8 — extend the Mantle tab once the core has proven itself at the
  table; personal-device conveniences, so shared-record work goes first
- Mantle tab phases 1+2 and #9 were already DONE 2026-07-19
- #10–#18 added 2026-08-02 (Brian), appended in the order given — not yet
  re-prioritized against #7/#8 or against each other

## 1. Add an "Unknown" count to the Workshop stats bar — DONE 2026-07-26

The stats bar (`index.html`, `#stat-total` / `#stat-nothing`) shows Recipes
and Dead ends. Add a third stat: the number of computed crafting codes that
are neither discovered (attached to a recipe) nor recorded as null/dead-end —
i.e. codes still to try. Compute from `computeCodes()` across all craftable
material pairs minus recipe codes and `nullCodes`, mirroring the
`unknownComputed` logic in `renderExplorer()`. Requires token pip data to be
loaded; show the stat as `—` (or hide it) when `tokenData` is empty.

## 2. Add processing requirement(s) to unprocessed materials — DONE 2026-07-26 (schema + display; `processing` values still to fill in materials.json as confirmed from cards)

Record which processing action(s) turn each raw material into its processed
form. This is a **closed set**: `cut`, `drill`, `grind`, `heat`, `strike`,
`comet`. The first five are granted by other materials and some items; some
structures also permit these actions, but structure tracking is deliberately
out of scope — the app records only which action a material needs, not
whether the tribe can currently perform it.

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

## 7. Add known (crafted) items to the Mantle tab

Extend the Mantle tab (see mantle-tab-spec.md) so a player can pick from the
recorded recipes (`recipes` — known crafted items) and add them to their
satchel as possessions they carry. Needs a small picker (search over live
recipes) and a "carried items" section on the Mantle tab. Same storage rules
as material counts: device-local `stonesaga_mantle` key, never exported or
synced. *Note: the original mantle spec listed possessions as out of scope;
this item supersedes that for known recipes only — special items remain out.*

## 8. Add mantle powers to the Mantle tab

Let a player select which of the tribe's recorded mantle powers
(`culture.mantlePowers`) are attached to *their* mantle, shown on their Mantle
tab. Selection is per-device (who holds which power is session/table state),
stored alongside the satchel in `stonesaga_mantle`; the powers themselves stay
in Culture and remain the synced source of truth — the Mantle tab only holds
references (entry IDs).

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

## 10. Add material grinding (new mechanic, distinct from processing)

The codex indicates 18 materials can be ground. This is a separate mechanic
from `processing` (#2 — which action *converts* a raw material into its
processed form): grinding is a further step, similar to crafting, that
consumes a material and produces a result.

- Coral and Moonblood: **each form** (raw and processed) offers a choice of
  2 results.
- All other groundable materials (bone, wood, feather, clay, etc.): one
  result only, reachable from *either* the raw or the processed form.
- A result is either "Nothing" (dead end, same convention as crafting's null
  codes) or an item card — including a Pigment card (IT62) in one of 5
  colours: Orange, Teal, Blue, Red, White. (Black pigment comes from a
  different source — out of scope here.)
- Data change: a new grind-result table keyed by material (+ form, for Coral
  and Moonblood), values `null` (nothing) or `{item, pigmentColor}`.
- The pigment colour must be **derived** from which material/form produced
  it, not entered separately — `culture.pigments`
  (`JOURNAL_SECTIONS.pigment`, `app.js`, currently just a free-text `name`
  field) should read the colour off the grind table rather than duplicating
  it as a manually-typed attribute.

## 11. Orange pip must always resolve to the leftmost/colour position

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

## 12. Add the Moon omen as a processing-action option

Moonblood needs the Moon omen to be processed, the same way Coral needs the
Comet omen (already modeled: `comet` is one of `PROCESSING_ACTIONS`,
`app.js:132`). Add `moon` to that closed set alongside
`cut/drill/grind/heat/strike/comet`, and set Moonblood's `processing` to
`["moon"]` in `materials.json` once confirmed from the card. Small,
self-contained extension of #2's schema — unrelated to the grinding-results
mechanic in #10 above, despite the name overlap with `grind`.

## 13. Fix multi-column width mismatch: Knowledge Cards / Mantle Powers vs Structures

On iPad, Knowledge Cards and Mantle Powers each render 3 columns spanning
the full row width, at the same time Structures also renders 3 columns at
that same full width — i.e. two "wide" blocks side by side rather than one.
Per #4/#5's design, investigate whether Knowledge Cards and Mantle Powers
are both crossing `WIDE_BLOCK_THRESHOLD` (15 items, `renderCulture()`) at
list sizes where Structures also is. Needs a visual check with realistic
seeded counts for all three sections at once at the iPad breakpoint (prior
Playwright verification for #4 only tested one large section at a time).

## 14. Selectable base-game Mantle when adding a Mantle

Base game has 4 mantles: Protector, Seeker, Storyteller, Wanderer — already
the `MANTLES` constant (`app.js:2606`), currently only used as datalist
suggestions for a Mantle Power's parent mantle
(`JOURNAL_SECTIONS.mantle`, `app.js:2627-2632`). This item is about the
player's *own* mantle (which of the 4 they hold — see mantle-tab-spec.md),
which needs a picker on the Mantle tab selecting from
`knownMantles()`/`MANTLES` rather than free text, stored in the
device-local `stonesaga_mantle` key alongside satchel/mantle-power data
(#7, #8).

## 15. Expansion selection: which expansions are in play, and their added content

Plan a way for a tribe to mark which expansions they own, so expansion-only
options can be gated into the closed lists instead of only ever offering
base-game content. Known so far:
- **Meals & Myths** — adds a 5th mantle, "Mystic" (to `MANTLES`, see #14),
  and a new Behemoth.
- **Nature of the Beast** — expansion known by name only; content TBD.

Needs a flag recording owned expansions (synced — it changes what other
players on other devices should see as selectable, not a device-local
preference) and expansion-tagged entries in the relevant closed lists
(mantles, behemoths, …) that only appear when their expansion is enabled.

## 16. Fix column break splitting a Mantle-of-X heading from its powers

When Mantle Powers renders as multi-column (`mantlePowersHtml()`,
`app.js:3018`), a "Mantle of the X" group heading (`.culture-group-title`)
can land as the last line of one column while that mantle's powers start
the next column. Add `break-after:avoid-column` (or otherwise glue the
heading to its first row) to `.culture-group-title` in `styles.css` so a
heading is never orphaned from its group.

## 17. Mantle Power sort: alphabetical-within-mantle by default; ID mode drops grouping

Extend #5's sort toggle to Mantle Powers, with its own two-mode behaviour
rather than the plain name/added/id cycle:
- **Default ("alphabetical")**: keep the current mantle grouping
  (`mantlePowersHtml`, groups already sorted a→z by mantle name) but also
  sort each group's powers by name — today they're unsorted within a group.
- **ID mode**: drop the "Mantle of the X" headings entirely and show a
  single flat list sorted by card ID (numeric-aware, matching #5's
  structures ID mode), with the mantle shown as an inline attribute after
  the name instead of a heading — e.g. `MA04 Safe-Keeper (Protector)`.

## 18. Sort Knowledge Cards like Structures

Give Knowledge Cards the same name/added/ID sort-toggle Structures got in
#5 (`CULTURE_SORTABLE_SECTIONS`, `CULTURE_SORT_DEFAULTS`, `app.js`),
defaulting to name, with its own device-local `stonesaga_knowledge_sort`
key.

## 19. Soften the Workshop stats bar's "Unknown" number

After a real session, the stats bar (`index.html:166-168`,
`#stat-total`/`#stat-nothing`/`#stat-unknown`, filled by `updateStats()`/
`countUnknownCodes()`, `app.js:851-877`) read 63 recipes / 77 dead ends /
558 unknown — the raw unknown count is intimidating as a countdown.

Ruled out: a "how many of the 558 are inferred" sub-count. `inferCombinations`/
`attachInferred` (`app.js:1441-1502`) only attach alternate material pairs
to codes that are **already** tied to a recorded recipe, and
`countUnknownCodes()` already excludes every such accounted code from the
558 — so nothing inside "unknown" is currently inference-resolvable; a
sub-count would just read 0 under today's model.

Preferred direction: reframe as completion rather than a countdown — e.g.
`63 of 621 known (10%)` instead of a bare "558 unknown" stat, computed from
the same numbers `updateStats()` already has (`live(recipes).length +
liveKeys(nullCodes).length + countUnknownCodes()` as the denominator).
Weakest early in a campaign, when the percentage looks about as small as
the raw number — most of the benefit shows up once a tribe is partway
through. Secondary/complementary idea if the single stat still feels like a
wall: break "unknown" down by category or pip colour (categories already
exist in the crafting data) so each subgroup reads as a small checklist
instead of one big number — worth a follow-up if the percentage reframe
alone doesn't land.
