/**
 * The finite actions a piece can take (plan 02 §3C step 2 · ticket 5 · V02/V04).
 *
 * A piece leaves along the axis its interfaces define, and the question the manual has to answer
 * is *how far*. It is not the grip length, and it is not even the overlap of the two faces: the
 * recorded grip is where the material of the two faces runs together, which can end long before
 * the hole does. A shaft seated 2 mm into a bore that runs to 18 mm is gripped over 2 mm and must
 * travel 18 mm to pass the far mouth, so a stroke sized from the grip tells the mechanic to pull
 * 2 mm and find the piece still held.
 *
 * So the stroke is sized from two extents measured in one frame — the moving piece's own axial
 * extent, and the *stationary* mating feature's full axial extent — and it is asymmetric whenever
 * the piece sticks out further on one side. A sheet that quotes one stroke for both directions is
 * wrong in one of them.
 *
 * The holder's bounding box is deliberately not used here. It is the broad-phase collision
 * question the clearance kernel answers, and sizing a stroke from it would overstate the motion a
 * hand actually makes.
 *
 * Everything here is discrete and serialisable. The geometry that decides *whether* a stroke is
 * clear belongs to the clearance kernel in `sweep.ts` and to the obstruction-to-requirement pass
 * that follows; this module only says what the possible actions are and how far they travel.
 */

/** An axial interval, millimetres, in one line's frame. */
export type Extent = Readonly<{ fromMm: number; toMm: number }>;

/** Which way along the line, as the sign of the line's own axis. */
export type Sense = '+' | '-';

export type StrokeOptions = Readonly<{
    /** Extra travel past the point of clearing, so the piece is visibly free in the hand. */
    clearanceMm?: number;
}>;

function overlaps(material: Extent, grip: Extent): boolean {
    return material.fromMm < grip.toMm && grip.fromMm < material.toMm;
}

/**
 * How far a piece must slide along the line to pass out of the hole it sits in.
 *
 * Moving in `+` carries the piece's near end past the far mouth of the holder; moving in `-`
 * brings the piece's far end back past the near mouth. Both are clamped at zero, because a piece
 * already clear in that direction has no stroke to make, and neither is padded with an invented
 * margin: `clearanceMm` is the reviewer's and defaults to none, so a generated stroke is the
 * measured one and nothing fabricated reaches a mechanic's page.
 *
 * @throws when no holder is given, because a stroke with nothing to clear would be invented.
 */
export function strokeToClearHolder(
    material: Extent,
    holders: Extent | readonly Extent[],
    sense: Sense,
    options: StrokeOptions = {}
): number {
    const list =
        Array.isArray(holders) || 'length' in holders ? [...(holders as readonly Extent[])] : [holders as Extent];
    if (list.length === 0) {
        throw new Error(
            'strokeToClearHolder needs at least one holder: a stroke with nothing to clear would be invented'
        );
    }
    const clearanceMm = options.clearanceMm ?? 0;
    let travel = 0;
    for (const holder of list) {
        const needed = sense === '+' ? holder.toMm - material.fromMm : material.toMm - holder.fromMm;
        // A holder the material does not touch asks for nothing from a piece held elsewhere, but a
        // piece beyond it that is pushed *through* owes the whole travel; the furthest decides.
        const contribution = overlaps(material, holder) ? needed : Math.max(0, needed);
        travel = Math.max(travel, contribution);
    }
    return Math.max(0, travel) + clearanceMm;
}
