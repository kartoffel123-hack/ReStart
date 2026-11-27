# RV-002 · How the supplied workbooks join to the assembly

| | |
| --- | --- |
| Record | RV-002, opened 2026-11-27 during Ticket 2 |
| Sources | `BoM_Helicopter_LEGO.xlsx`, `Components.xlsx`, `MTM_Mapping_Connection_V3.xlsx` |
| Code | [`tools/lib/workbooks.ts`](../../tools/lib/workbooks.ts), joined by `npm run model:import` |
| Test | [`tests/data/workbooks.test.ts`](../../tests/data/workbooks.test.ts) |
| Status | Joins accepted; one plan wording reconciliation open (RI-02) |

## Parts list → assembly: exact

`Teileliste` header row 3, data rows 4–34, quantity column G, total row 35.

| | measured |
| --- | --- |
| Inventory rows | 31 |
| Sum of quantities | 70, equal to the sheet's own total in G35 |
| Names matching STEP leaf names | 31/31, none unmatched in either direction |
| Per-type quantity vs expanded multiplicity | equal for all 31 types |

The join is on the **supplied CAD name in column I**, verbatim. `Small Bush - 30565`
(row 30, quantity 9) carries a different set number from every sibling; it is not normalised,
because normalising it would break the name join. Column D supplies the colour, and the
colour→material legend is a challenge fiction, so every inventory row leaves the importer
carrying `MATERIAL_PROVENANCE`.

## Bill of Materials → assembly: type level only

`Bill of Materials` has exactly 70 data rows and its multiset of part names equals the
multiset of the 70 expanded occurrences. **The order does not match**: only 7 of 70 rows hold
the same part name as the occurrence at the same index.

The plan (§3A.6) says the sequences "agree by type on all 70 rows". That is true as a multiset
and false positionally — see RI-02. Consequences, both taken from the plan's own fallback
("retain the shared type facts and mark the row link ambiguous"):

- 16 rows join uniquely (their part name occurs once).
- 54 rows are marked `ambiguous` and contribute type-level facts only.
- Every repeated name does carry complete `#1..#n` instance marks, but nothing in the STEP ties
  mark `#n` to a usage path, so the marks cannot establish piece identity. `instanceMark` is
  retained so a reviewed, revision-bound mapping can be recorded against it later.
- The hierarchy column is not uniformly three levels: some rows hang directly off the root, so
  the module is recognised by the `Stage …` name rather than by depth.

## Functional units: candidates, not a model

Column I holds one `∿ <first word of the part name>` label per row — 70 distinct labels for 70
rows, e.g. `∿ Friction`, `∿ Corner`, `∿ Small`. It groups nothing, so it is exported as
`candidateUnits` with `functionalUnitsNeedReview: true`. Functional-unit membership still has
to be reviewed on the physical assembly (plan 02 §3C.1); nothing downstream may treat this
column as the unit model.

## MTM timing lookup: consistent, and fictitious

English sheet `Vorschlag_2_Grid_EN`, data rows 2–63 keyed by `Row_ID` (62 distinct), seconds in
`Time_per_Connection` (column L). German sheet `Vorschlag_2_Raster` carries the same 62 rows
with seconds in `Zeiten je Verbindung` (column R).

| | measured |
| --- | --- |
| Rows | 62, `Row_ID` unique |
| English vs German, cross-checked **by ID** | 0 disagreements |
| `ST-mittel` | 3 s, `Plug-in connection / clearance fit`, mapping quality *medium* |
| Distinct connection types | 20 |

The cross-check is keyed by ID, never by row position: reversing the German sheet leaves every
ID's own time and must still report nothing, while changing one time must report exactly that
ID. Both cases are pinned by the test. An unknown `Row_ID` returns `null` — an unmapped
operation is unknown, never estimated (plan 02 §4). Every value carries `TIMING_PROVENANCE`.

## Reconciliation

**RI-02 (open):** plan 02 §3A.6 states the mesh and BoM sequences "agree by type on all 70
rows". Read as positional agreement this is wrong — 7 of 70 positions agree — and a reader
could join rows to occurrences by index. Read as a multiset it is correct. Plan history is not
rewritten; this record and the `positionalAgreement` field in `import-report.json` are the
authoritative statement for this revision.
