# TODO

Feature backlog, roughly in the order Brian raised them. Larger planned work
lives in its own spec (see [mantle-tab-spec.md](mantle-tab-spec.md));
infrastructure/data TODOs (Drive token enforcement, repo visibility, Valley
Map, codex review) live in the comment block at the top of `app.js`.

Suggested implementation order (agreed 2026-07-19):
1. Mantle tab phase 1 (per spec) — DONE 2026-07-19 (#6 also done separately)
2. Mantle phase 2 — Craftable + Unknown subtabs — DONE 2026-07-19
3. #3 — small, same crafting-engine area, natural tail to the explorer batch
4. #7 — ship schema + display early, fill requirement data as encountered
5. #4 then #5 — extend the Mantle tab once the core has proven itself at the table
6. #1 and #2 — independent Journal polish, slot in anytime

## 1. Sort structures by name, with a name/ID sort toggle

Culture tab → Structures list: default the sort to name (currently insertion
order). Add a toggle to flip between name sort and card-ID sort, using
**a→z** / **0→9** as the button labels to indicate the two modes. Follow the
Cave Wall sort-toggle pattern (`toggleCaveWallSort` / `stonesaga_cave_sort`
localStorage key in `app.js`): device-local view preference, own storage key,
not synced.

## 2. Downplay IDs in the Culture and Behemoth tab lists

In the Culture lists (structures, mantle powers, knowledge cards, taboos,
pigments) and the Behemoths list, card IDs currently compete visually with the
names. Restyle so the name is primary and the ID is secondary (smaller,
muted colour — e.g. `--flint`), without removing the IDs.

## 3. Add an "Unknown" count to the Workshop stats bar

The stats bar (`index.html`, `#stat-total` / `#stat-nothing`) shows Recipes
and Dead ends. Add a third stat: the number of computed crafting codes that
are neither discovered (attached to a recipe) nor recorded as null/dead-end —
i.e. codes still to try. Compute from `computeCodes()` across all craftable
material pairs minus recipe codes and `nullCodes`, mirroring the
`unknownComputed` logic in `renderExplorer()`. Requires token pip data to be
loaded; show the stat as `—` (or hide it) when `tokenData` is empty.

## 4. Add known (crafted) items to the Mantle tab

Extend the Mantle tab (see mantle-tab-spec.md) so a player can pick from the
recorded recipes (`recipes` — known crafted items) and add them to their
satchel as possessions they carry. Needs a small picker (search over live
recipes) and a "carried items" section on the Mantle tab. Same storage rules
as material counts: device-local `stonesaga_mantle` key, never exported or
synced. *Note: the original mantle spec listed possessions as out of scope;
this item supersedes that for known recipes only — special items remain out.*

## 5. Add mantle powers to the Mantle tab

Let a player select which of the tribe's recorded mantle powers
(`culture.mantlePowers`) are attached to *their* mantle, shown on their Mantle
tab. Selection is per-device (who holds which power is session/table state),
stored alongside the satchel in `stonesaga_mantle`; the powers themselves stay
in Culture and remain the synced source of truth — the Mantle tab only holds
references (entry IDs).

## 6. Show right-slot-only materials in the Material A dropdown — DONE 2026-07-19

`populateExplorerSelects()` currently excludes materials that fail
`canBeLeft()` (e.g. Feather, Tooth (drilled)) from the Material A dropdown,
because they can only sit in the right token slot. Remove that exclusion so
these materials can be the starting point of an exploration: when the chosen
Material A can't sit left, `renderExplorer()` should flip the pairing and
show all combinations with that material on the right instead (pair `[b, a]`
for each candidate `b` that can be left). This answers "what can I combine
with a Feather?" — currently impossible without checking every other
material one at a time from the B side.

## 7. Add processing requirement(s) to unprocessed materials

Record which processing action(s) turn each raw material into its processed
form. This is a **closed set**: `cut`, `drill`, `grind`, `heat`, `strike`,
`comet`. The first five are granted by other materials and some items; some
structures also permit these actions, but structure tracking is deliberately
out of scope — the app records only which action a material needs, not
whether the tribe can currently perform it.

- Data change: optional `processing` array on raw-material entries in
  `materials.json` (e.g. `"processing": ["heat"]`), documented in its
  `_readme`. Nullable — fill values in as they're confirmed from cards.
- Display on the material card in the Materials tab, and as a hint on the
  Mantle tab's Process button (e.g. `Process (heat)`).
- **Informational only — never gate the Process button on it**, since the
  app can't know what structures/items make an action available.
- Any editing UI uses a native multi-select/checkbox set for the closed list
  (house rule: native selects for closed sets).
