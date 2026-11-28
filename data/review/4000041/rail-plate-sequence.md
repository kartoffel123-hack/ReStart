# L214 and L215 before the side wall

Follow-up: [can the curved facings be parked before the wall?](facing-access.md) tests the two facing bricks without assuming the plates have been removed.

**Neither bare 1×2 plate has a clear vertical exit.** After 2 mm upwards, `L214` intersects the overlying `L237` by 220.627228 mm³ and `L215` intersects `L240` by 220.643074 mm³ (installed overlaps 0.000002 and 0 mm³). Reversing the plate order gives the same result. Carrying each top with its plate is a closer fit, but does not release the side wall.

Test state: 284 scoped pieces plus 282 full-kit obstacles; both roof sections in their verified trays. `L110`, the turntable halves and all pins start installed. Each move lifts to 10 mm above the kit, translates along Z and lowers to bench height. The plate trays use −160 mm Z offsets, preserving their installed 40 mm separation. Tops removed separately use −405 mm; the `L248/L230` wall uses −285 mm and the `L331/L149/L332` bridge uses −210 mm. No piece is hidden. Surface contact rejects the strict geometric test; later operations then describe hypothetical endpoints only.

| Outbound order | Stationary contacts on each lift, in order | Stationary contacts on each reseat, in reverse order |
|---|---|---|
| L214, L215, wall, bridge | 7, 7, 16, 2 | 2, 16, 7, 7 |
| L215, L214, wall, bridge | 7, 7, 16, 2 | 2, 16, 7, 7 |
| L214+L237, L215+L240, wall, bridge | 6, 6, 14, 2 | 2, 14, 6, 6 |
| L237, L240, L214, L215, wall, bridge | 4, 4, 6, 6, 14, 2 | 2, 14, 6, 6, 4, 4 |

The transverse and tray-lowering strokes and their inverses had no surface contacts. On return, the bridge is reseated with the wall displaced; the wall is reseated against the restored bridge; the plates return last. A clean tray leg does not establish a reachable tray.

**Fit with the tops retained.** A separate solid calculation swept each moving member of each pair continuously over the lift. The nominal members intersect neighbours. For `L214/L237`, a 0.005 mm cube half-width erosion still intersects `L129`; at 0.010 mm both inner solids clear. For `L215/L240`, 0.005 mm suffices. These are sensitivity measurements, not exemptions in the verifier. Grip, retention of the paired pieces and actual reseating remain untested.

**Wall and bridge.** In the hypothetical four-plate parked state, the wall lift still contacts `L127`, `L129`, `L149`, `L212`, `L218`, `L225`, `L228`, `L273`, `L283`, `L294`, `L299`, `L300`, `L331`, and `L332`. In particular, `L248/L127` solid overlap grows from 0.000134 to **8.446372 mm³** at +2 mm; the same interference recurs 2 mm before the wall is home. Even if the wall were parked, the bridge still contacts `L180` and `L187` on lift and reseating. Insetting its round bricks by a 0.005 mm cube half-width clears these pin contacts in the sensitivity test only. None of the four sequences establishes a complete reachable round trip or an individual gear exchange.

Reproduce after scoped verification with `node --import tsx tools/ct/rail-plates.ts`, then `.tmp/ct-cad-env/bin/python -B -m tools.ct.rail_plate_fit`. Per-leg witnesses, offsets, generation and geometry hash are in `.staging/4000041/demo/rail-plates.json`. Measured on generation `c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45`.
