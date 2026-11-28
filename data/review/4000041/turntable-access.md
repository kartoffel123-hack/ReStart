# Turntable access study: moving the two halves together

Follow-up: [parking and restoring the black tile and round brick](turntable-blocker-trials.md), including intact-turntable reruns with the proposed tray positions.

**Result: blocked on the tested route.** The working manual can park the two five-piece crown sections. From that state, lifting the black toothed top (`4000041/L112`) and grey bottom (`4000041/L192`) together does not clear the gantry. The same geometry prevents reseating on the reverse path. There is no verified bench-access procedure for the intact turntable yet. Its individual gear exchange remains unavailable.

## Path tested (assembly coordinates, mm)

1. Start installed. Use the first two confirmed operations of the `L201` fallback to lift and park the crown sections. Keep all ten pieces at their recorded bench poses throughout the turntable test.
2. Hold the orientation and relative placement of the two turntable halves fixed. Test these common translation offsets: `[0,0,0]` → `[0,83.0913,0]` (lift above the kit) → `[0,83.0913,101.8952]` (carry sideways) → `[0,-29.3087,101.8952]` (lower to bench height).
3. Test the same waypoints in reverse with the crown sections **still parked**. If the turntable could be reseated, the fallback would then restore the roof in reverse order. A blocked lift or reseat rejects the whole proposal; the outer two legs can be measured in isolation.

| Moving together | Lift / carry / lower: fixed pieces contacted | Raise from bench / carry back / reseat |
|---|---:|---:|
| Toothed top and bottom | 43 / 0 / 0 | 0 / 0 / 43 |
| Both halves plus twelve Technic half pins (`L180`–`L191`) | 31 / 0 / 0 | 0 / 0 / 31 |

These are distinct stationary occurrences touched by the **continuous swept surfaces**, not a list of mandatory disassembly steps or a minimum. Near-tangent faces and existing mating contacts are included, with no exemptions. Carrying the pins is a geometric hypothesis; retention, hand clearance, grip, support on the bench and function after restoration have not passed a kit trial.

### Two confirmed material interferences

At **40 mm upward translation**, a point on each turntable half is inside a different closed stationary solid. Both obstacles remain even when all twelve pins travel with the turntable. The same points are reached **43.0913 mm into the final downward leg**.

| Moving member | Stationary obstacle | Point on member at home (X,Y,Z) mm | Gap at home | Inside obstacle at +40 mm Y |
|---|---|---|---:|---:|
| Toothed top `L112` | `L331`, light bluish grey 1×1 round brick with hollow stud | `[335.03247,44.02923,-80.03202]` | 32.7707 mm | 0.7879 mm |
| Bottom `L192` | `L110`, black 1×3 tile spanning the upper pin row | `[350.93058,38.86127,-74.43834]` | 37.9386 mm | 0.8291 mm |

An independent signed-distance calculation on the closed obstacles distinguishes these two collisions from surface touches. Clearing just `L110`, or just `L331`, cannot open this lift. For a revised lift, identify which fixtures these two pieces can travel with, and check their release, parking, grip and return before adding an operation.

### What else occupies the lift corridor?

All 43 contacts after opening the roof are in `MRI`; prefix each locator with `4000041/`:

| Part family | Occurrences |
|---|---|
| Dish and tiles | `L68`, `L110`, `L121`, `L147`–`L149` |
| Half pins (only fixed in the two-member test) | `L180`–`L191` |
| Plates, including two door-rail plates | `L137`, `L138`, `L194`, `L212`, `L214`, `L215`, `L217`, `L218`, `L225`, `L228`, `L237`, `L240` |
| Slopes | `L195`, `L196`, `L294`, `L295`, `L298`, `L299`, `L301` |
| Side-stud and round bricks | `L316`–`L319`, `L331`, `L332` |

With the **roof installed**, five straight strokes were tested to 10 mm beyond the kit bounds. The upward stroke contacted 51 pieces. Along the turntable axis, +X contacted 150 (including 47 Control room and 11 Minifigs); −X contacted 64. Transverse +Z contacted 53, and −Z contacted 69 (including 13 Back room and five Minifigs). The cropped web scene alone would miss physical obstacles. These trials do not rule out a tilted route, a different access order or a larger service module.

## Evidence and reproduction

Scoped geometry SHA-256 `704c13e6a4ec012a12e801d06bab407239afb4d75a23621a80b4c7ec14607619`; fallback generation `c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45`. The sweep uses the 284 scoped meshes plus the 282 excluded obstacles from the pinned full kit. Triangle contact intervals cover the entire translation. One witness per mover/obstacle/leg is reported; it need not be the earliest hit.

After scoped compile and verification, run from the repo root:

```sh
node --import tsx tools/ct/turntable-access.ts
.tmp/ct-cad-env/bin/python -B -m tools.ct.turntable_access_witness
```

Detailed output (including every directional contact, member and stroke interval): `.staging/4000041/demo/turntable-access.json`. This study creates no repair, bench record, or release claim. The [separate bench-interface test](operator-handoff.md#mri--mid-section-working-candidate) moves the toothed top **relative to** the bottom; neither that test nor this one establishes how to exchange it.
