# L127 and L129 before the side wall

Follow-up: the [Studio versus STEP comparison](facing-origin.md) establishes that L129 and L300 already cross in the pinned source drawing. This does not resolve how the two pieces fit on the physical kit.

**Neither curved facing has a demonstrated parking and restoration path on the tested strokes.** This study starts with only the two roof sections in their model-verified trays. All other pieces, including L214/L215, start installed. After an unsuccessful trial the facing stays installed. The wall and bridge are therefore tested against a reachable assembly state, rather than one obtained by hiding the facings.

The full 566-piece geometry was tested in assembly millimetres. Each facing was pulled outwards along −X to 10 mm beyond the kit, transferred in Z, and lowered to bench height. The first strokes were 74.0081 mm for L127 and 74.0133 mm for L129; separate transfers used −360 and −420 mm Z offsets. The survey also tried the opposite piece order, moving both facings together, and lifting each along +Y instead. Every leg was swept in both directions. The limiting contacts were confined to departure from home and reseating; clear transfer and lowering legs did not qualify the endpoints as reachable.

| Trial | Distinct stationary contacts at release and reseat | Solid witness in assembly coordinates |
|---|---:|---|
| L127 outwards | 13 | At −1 mm X its overlap with L126 changes from 0.001697 to 0.001775 mm³. Small model contact, not evidence that a physical part jams. |
| L129 outwards | 14 | Already overlaps L300 by 82.898065 mm³ at home. At −1 mm X total overlap drops to 62.544593 mm³ but **0.379612 mm³ is newly occupied material of L300**. Carrying L127 with it does not resolve this. |
| Both together outwards | 22 | Same L129/L300 collision, with relative facing placement held fixed. |
| L127 / L129 upwards | 13 / 14 | At +2 mm Y, L127 overlaps L141 by 4.307934 mm³ and L129 overlaps L142 by 4.342011 mm³. |

**Downstream replay.** No new tray pose was admitted. L248/L230 contacted 18 stationary pieces on the wall lift and return; at +2 mm Y, L248 intersects L127 by **8.446372 mm³**. With the wall still installed, the L331/L149/L332 bridge contacted **L180, L187, L230 and L248** on both strokes. Its L331/L248 overlap grew from 0.816111 to 0.969156 mm³ at +2 mm. These inverse checks test the reverse of each proposed path, not restoration from a tray the procedure actually reached.

The L129/L300 installed fit warrants comparison with the physical assembly or an independently corrected source placement before treating the facing as a clean release. No collision exemption, physical trial, or gear manual follows from this record.

Reproduce on scoped generation `c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45`:

```sh
node --import tsx tools/ct/facing-access.ts
.tmp/ct-cad-env/bin/python -B -m tools.ct.facing_fit
```

The first command writes `.staging/4000041/demo/facing-access.json` with per-member contact intervals, initial parked IDs, proposed offsets and accepted state changes. The second compares closed-solid intersections at the installed and indicated intermediate poses. Neither command changes the staged manual.
