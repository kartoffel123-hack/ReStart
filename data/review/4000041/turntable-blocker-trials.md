# Can the tile and round brick be parked before the intact turntable?

**L110 alone is a candidate for a tool-fit trial. L331 has no clear release in the tested configurations.** Even putting both in separate trays by assumption leaves the intact turntable blocked on exit and reseating. No manual or physical evidence is awarded for these trials.

The starting state is the [intact-turntable study](turntable-access.md) after the two five-piece roof sections are parked. All 566 obstacles/movers retain their poses, including the 282 excluded from the web scene. Each trial lifts the selected members together, transfers them along −Z, lowers them to bench height, then checks the reverse strokes. For combined trials, the tile goes out first and comes back last. These are geometric measurements, not operator instructions.

## Parking and restoration

All locators below have the prefix `4000041/`. Offsets are relative to the installed pose in assembly millimetres. Neither the sideways transfer nor lowering to the proposed trays contacted another piece, in either direction. The limiting leg is getting free of the gantry, or reseating in it.

| Moving set | Lift; tray offset `(X,Y,Z)` mm | Stationary surface contacts on lift and reseating |
|---|---|---|
| Black tile `L110` | +32.400 Y; `(0, −80.000, −160)` | Three pin seats `L184/L188/L191` and the grey turntable bottom `L192`. See fit bound below. |
| `L110` with those three pins | +40.400 Y; `(0, −72.000, −160)` | `L192`. After 2 mm, a point on `L184` is **0.207 mm inside** the bottom. |
| Grey round brick `L331` | +32.400 Y; `(0, −80.000, −210)` | Upper tile `L149`, pin `L187`, plate `L230`, side-stud brick `L248`. Same result with `L110` installed or parked. At +2 mm the brick is **0.667 mm inside `L149`**. |
| `L331` with its pin `L187` | +40.400 Y; `(0, −72.000, −210)` | `L112/L149/L230/L248`. |
| Both round bricks `L331/L332` with their bridging tile `L149` | +32.400 Y; `(0, −80.000, −210)` | `L180/L187/L230/L248`. |
| That bridge plus pins `L180/L187` | +40.400 Y; `(0, −72.000, −210)` | `L112/L230/L248`, whether the black tile is parked alone or with its pins. |

**Tile fit and grip.** The nominal tile has nonzero swept overlap: `0.000659`, `0.000697`, `0.000697` and `0.001189 mm³` with `L184`, `L188`, `L191` and `L192`, respectively. Eroding the tile by a cube with **0.005 mm half-width** leaves a core that intersects none of those solids anywhere on the lift or reseat. The other interfaces were checked at nominal size. This bounds a small model discrepancy; it does not establish a zero-contact nominal fit or measure clutch force.

Two hypothetical flat jaws, each **4 mm wide, 34 mm long and 1 mm thick**, can approach the short ends from above, close 0.5 mm per end onto 1.5 mm of tile height, carry the tile, release it at its tray, and reverse. The end patches exist on both tile faces. Neither jaw nor the 4 mm high spanning crossbar contacts a neighbour on the tested path. The broader 6 mm finger pads collide with `L262` and `L263` on approach. Confirm that an available tool fits this envelope, grips the tile, leaves the three pins seated and can press the tile back before using this as an operator step.

**Round-brick fit.** Taking the upper tile with the round brick removes the `L149` obstruction but leaves a side-wall conflict. `L331` and `L248` already overlap by **0.816111 mm³ at home** in the source-backed meshes. At +2 mm Y that grows to **0.969156 mm³**. This configuration cannot be called clear by ignoring the original overlap. Check that installed interface on the kit or against a corrected placement witness before authoring a motion through it.

## What remains in the intact-turntable path?

The two turntable halves keep their installed relative transform. The [original positive-Z bench path](turntable-access.md#path-tested-assembly-coordinates-mm) is rerun with every parked piece physically present in its separate negative-Z tray. Counts are distinct stationary **surface contacts**, not required disassembly counts. A result below a blocked parking step is conditional on reaching that tray by another means.

| Proposed parked state (roof always parked) | Lift / transfer / lower | Raise / transfer / reseat |
|---|---:|---:|
| Tile alone | 42 / 0 / 0 | 0 / 0 / 42 |
| Round brick alone | 42 / 0 / 0 | 0 / 0 / 42 |
| Both individually | 41 / 0 / 0 | 0 / 0 / 41 |
| Tile alone; round bricks with bridging tile | 39 / 0 / 0 | 0 / 0 / 39 |
| Tile with its three pins; bridge with its two pins | 34 / 0 / 0 | 0 / 0 / 34 |

After **both individual pieces** are parked, the 41 contacts are `L68`, `L121`, `L137–L138`, `L147–L149`, `L180–L191`, `L194–L196`, `L212`, `L214–L215`, `L217–L218`, `L225`, `L228`, `L237`, `L240`, `L294–L295`, `L298–L299`, `L301`, `L316–L319`, and `L332`. In the 34-contact case, subtract `L149`, `L332`, `L180`, `L184`, `L187`, `L188`, and `L191`. No new contact appears at either tray. `L237` is a confirmed material obstruction even in that last case: at **+42 mm Y**, the toothed top is **0.832 mm inside** this 1×3 plate. This is separate from releasing the top from the bottom on the bench.

## Reproduce

Scoped GLB `704c13e6a4ec012a12e801d06bab407239afb4d75a23621a80b4c7ec14607619`; fallback generation `c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45`. After scoped compile and verification, run with Node 24 and the CAD environment from `tools/ct/requirements-cad.txt`:

```sh
node --import tsx tools/ct/turntable-blockers.ts
.tmp/ct-cad-env/bin/python -B -m tools.ct.blocker_fit
```

The first command writes `turntable-blockers.json` under `.staging/4000041/demo/`, with each pose and per-leg contact witness. The second independently measures the tile’s continuously swept solid and the material interferences using the serialized geometry.
