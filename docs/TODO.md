# TODO

Feature backlog, numbered in the agreed implementation order (agreed
2026-07-26; renumbered 2026-07-26 to match — work top to bottom). Larger
planned work lives in its own spec (see
[mantle-tab-spec.md](mantle-tab-spec.md)); infrastructure/data TODOs (Drive
token enforcement, repo visibility, Valley Map, codex review) live in the
comment block at the top of `app.js`. Completed items are moved to
[CHANGELOG.md](CHANGELOG.md) once fully resolved, so numbering below has
gaps — a missing number means "done, see CHANGELOG.md."

Ordering rationale:
- #7 then #8 — extend the Mantle tab once the core has proven itself at the
  table; personal-device conveniences, so shared-record work goes first
- #10–#18 added 2026-08-02 (Brian), appended in the order given — not yet
  re-prioritized against #7/#8 or against each other

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

## 10. Add material grinding (new mechanic, distinct from processing)

The codex indicates 18 materials can be ground. This is a separate mechanic
from `processing` (CHANGELOG.md #2 — which action *converts* a raw material
into its processed form): grinding is a further step, similar to crafting,
that consumes a material and produces a result.

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

## 14. Selectable base-game Mantle when adding a Mantle

Base game has 4 mantles: Protector, Seeker, Storyteller, Wanderer. `MANTLES`
(`app.js`) now holds 5 — Meals & Myths' "Mystic" was added 2026-08-10 (see
#15) — and a Mantle Power's parent-mantle field
(`JOURNAL_SECTIONS.mantle`, `app.js`) was converted from a datalist to a
closed `<select>` sourced from `knownMantles()`/`MANTLES`, alphabetical,
same day. This item is still open: it's about the player's *own* mantle
(which one of the 5 they hold — see mantle-tab-spec.md), which needs its
own picker on the Mantle tab (same `knownMantles()`/`MANTLES` source),
stored in the device-local `stonesaga_mantle` key alongside satchel/
mantle-power data (#7, #8) — distinct from the Mantle Power field above,
which tags which mantle family a *recorded power* belongs to, not which
mantle the player personally holds.

## 15. Expansion selection: which expansions are in play, and their added content

Plan a way for a tribe to mark which expansions they own, so expansion-only
options can be gated into the closed lists instead of only ever offering
base-game content. The full expansion set (confirmed 2026-08-10, Brian) is
just these two — no others to expect:
- **Meals & Myths** — adds a 5th mantle, "Mystic" (added to `MANTLES`
  unconditionally 2026-08-10, ahead of expansion-gating — see #14; also
  adds a new Behemoth, not yet added).
- **Nature of the Beast** — content TBD; still being discovered from cards.

Needs a flag recording owned expansions (synced — it changes what other
players on other devices should see as selectable, not a device-local
preference) and expansion-tagged entries in the relevant closed lists
(mantles, behemoths, …) that only appear when their expansion is enabled.
Deliberately no code/controls yet (Brian, 2026-08-10) — content for both
expansions is still being catalogued; revisit once the feature lists are
more complete rather than building against partial data.

## 17. Mantle Power sort: alphabetical-within-mantle by default; ID mode drops grouping

Extend #5's sort toggle (CHANGELOG.md) to Mantle Powers, with its own two-mode behaviour
rather than the plain name/added/id cycle:
- **Default ("alphabetical")**: keep the current mantle grouping
  (`mantlePowersHtml`, groups already sorted a→z by mantle name) but also
  sort each group's powers by name — today they're unsorted within a group.
- **ID mode**: drop the "Mantle of the X" headings entirely and show a
  single flat list sorted by card ID (numeric-aware, matching #5's
  structures ID mode, CHANGELOG.md), with the mantle shown as an inline attribute after
  the name instead of a heading — e.g. `MA04 Safe-Keeper (Protector)`.

## 18. Sort Knowledge Cards like Structures

Give Knowledge Cards the same name/added/ID sort-toggle Structures got in
#5 (CHANGELOG.md; `CULTURE_SORTABLE_SECTIONS`, `CULTURE_SORT_DEFAULTS`, `app.js`),
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

## 20. Limit Cave Wall pencil colours to available pigments

Cave Wall's colour picker (`CAVE_PENCILS`, `app.js`) is currently a fixed
6-swatch set (Black, Blue, Red, Dark Green, Orange, Silver) always offered
regardless of what the tribe has actually discovered. Limit it instead to
colours the tribe's recorded pigments (`culture.pigments`) make available,
so the palette reflects what's actually been found in-game.

- **Black is always available by default** — add it as a baseline pigment
  present from the start (not something that has to be discovered/recorded
  first), so the palette is never empty even on a fresh save with zero
  pigments.
- Depends on `culture.pigments` carrying a real colour, not just today's
  free-text `name` field (`JOURNAL_SECTIONS.pigment`, `app.js`) — likely
  sequenced after #10 (grinding mechanic), whose grind-result table is
  where a pigment's colour is meant to come from (`derived`, not
  manually typed).
- Naming mismatch to resolve: `CAVE_PENCILS`' 6 names (drawing-implement
  colours) don't line up with #10's pigment colour set (Orange, Teal,
  Blue, Red, White, +Black) — Dark Green and Silver have no pigment
  equivalent, Teal and White have no existing pencil swatch. Needs a
  decision on whether Cave Wall keeps its own swatch list (hex values,
  drawing-pencil framing) filtered by name-match against discovered
  pigment colours, or the two lists get unified into one.
