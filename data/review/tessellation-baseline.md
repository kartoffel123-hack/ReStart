# RV-001 · Tessellation baseline and the plan's triangle count

| | |
| --- | --- |
| Record | RV-001, opened 2026-11-27 during Ticket 1 |
| Source | `assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP` |
| Source SHA-256 | `e15deb431d0ece9baf411cec7612f00d1a49e3e536ea183893b6792f6dfc7588` (matches the pin in AGENTS.md) |
| Kernel | `occt-import-js@0.0.23`, installed by `npm ci` from the committed lockfile |
| Runtime | Node 24.22.3 (Homebrew `node@24` keg), macOS arm64 |
| Code | [`tools/lib/step-meshes.ts`](../../tools/lib/step-meshes.ts) |
| Status | Decision recorded; the plan's number stays as written — see Reconciliation |

## What was measured

Pinned options — the ones [plan 02 §1](../../docs/plans/0.1.0/02-software-design-implementation-plan.md)
names — from `TESSERATION_OPTIONS`:

```
linearDeflectionType: 'absolute'   (accepted by 0.0.23 but ignored)
linearDeflection:       0.12  mm
angularDeflection:      0.4   rad
```

| | measured |
| --- | --- |
| Meshes | 70 |
| Hierarchy nodes | 39, of which 37 carry meshes |
| Mesh references reachable from the root | 70 |
| Triangles | **48,874** |
| Wall clock | ≈ 2.9–3.4 s per import |
| Units | mm, coordinates already include the installed placement |

## Why the plan's 111,646 is not asserted

The count was swept on the pinned revision (each row is one full import):

| Linear deflection (mm) | Angular (rad) | Triangles |
| --- | --- | --- |
| kernel default (no options object) | kernel | 93,568 |
| 0.02 | 0.4 | 83,052 |
| 0.05 | 0.4 | 74,010 |
| **0.12 (pinned)** | **0.4** | **48,874** |
| 0.12 | 0.2 | 49,176 |
| 0.5 | 0.8 | 37,214 |

The response is monotonic in the expected direction — finer deflection, more triangles — and
the finest setting that still runs cleanly (kernel default, 93,568) is already **below**
111,646. So 111,646 is not reachable at 0.12 mm on this kernel revision; it corresponds to a
setting finer than the kernel default, which contradicts the options the plan records
alongside it. Mesh, node and reference counts are identical across every row, so the
disagreement is about tessellation density only, not about what geometry was found.

## Decision

Advisor consulted 2026-11-27. Verdict, carried into the code:

1. **Keep the pinned options.** They are the plan's stated intent, they tessellate the whole
   assembly in ~3 s, and 0.12 mm is well inside the 0.1 mm placement tolerance used by the
   geometry witnesses. Chasing the plan's triangle count by changing deflection would trade a
   reviewed setting for a number nobody consumes.
2. **Do not assert a triangle count in V01.** V01 asserts what the count is a proxy for and
   what it cannot catch: 70 occurrences each with a pickable node, the identity crosswalk at
   70/70, and the measured landmarks (stage 1 axle `NAUO1/NAUO79` bounds centre ≈ `[0, 0, 32]`
   mm, both large rotor blades at Y ≈ 47.5 mm, the 24 mm axle extent in metres).
   `tests/data/geometry.test.ts` states this in its header and asserts none of the counts.
3. **Log the count as a diagnostic.** `model:import` reports it so a future revision that
   changes tessellation density is visible in the diff without being a gate.

## Reproducing

```sh
export PATH="$(brew --prefix node@24)/bin:$PATH"
npx vitest run tests/data/geometry.test.ts   # tessellates once; asserts no counts
```

The sweep rows above are one `tessellateStep(bytes, options)` call each; nothing about them is
cached, so they can be re-run against a future kernel or dataset revision.

## Reconciliation

**RI-01 (open):** plan 02 §1 records "≈ 111,646 triangles" for options that produce 48,874 on
the pinned STEP. Plan history is not rewritten, so the number stands in `0.1.0/`; this record
is the authoritative measurement for that revision. Any later plan version should either cite
48,874 with the kernel version or drop the count.
