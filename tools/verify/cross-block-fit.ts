import { Triangle, Vector3 } from 'three';
import { contactInterval } from '../lib/translation-contact.js';
import type { Joint } from '../lib/joints.js';
import type { Motion } from '../../src/domain/schema.js';

/** Local generated fit assumptions for the pinned stage-10 inset. Re-test the
 * actual contacting triangles. Neither the central collar nor an adjacent mesh
 * gets an exemption just because an axle or a split pin is involved. */
export function crossBlockFit(kind: Motion['allowedContacts'][number]['fitModel'], joint: Joint,
    moving: string, shift: Vector3, delta: Vector3) {
    const axle = '30465/NAUO17/NAUO59', pin = '30465/NAUO17/NAUO58';
    const shaft = kind === 'cross-block-keyed-axle' ? axle : pin;
    const mates = kind === 'cross-block-keyed-axle'
        ? ['30465/NAUO18', '30465/NAUO27', '30465/NAUO17/NAUO61', '30465/NAUO17/NAUO62']
        : [axle, '30465/NAUO17/NAUO56'];
    if (!kind || !joint.pieces.includes(shaft) || !joint.pieces.some(id => mates.includes(id))) return;
    const axis = new Vector3(...joint.axis), origin = new Vector3(...joint.origin);
    if (delta.clone().normalize().cross(axis).length() > 1e-6 || shift.clone().cross(axis).length() > 1e-5) return;
    const shaftMoves = shaft === moving;
    const adjust = (v: Vector3) => {
        const installed = v.clone().sub(origin);
        if (shaftMoves) installed.sub(shift);
        const along = installed.dot(axis);
        const radial = installed.addScaledVector(axis, -along);
        const radius = radial.length();
        let reduction = 0;
        if (kind === 'cross-block-keyed-axle' && Math.abs(along) >= 3.6999 && radius <= 2.4001) {
            // Equal nominal 2.40 mm surfaces have different chord tessellations.
            reduction = Math.min(radius * 0.02, 0.048);
        } else if (kind === 'cross-block-split-pin' && (radius <= 2.351 || ((along <= 23.41 || along >= 32.89) && radius <= 2.626))) {
            // 0.05 mm body tessellation allowance; larger flex only at split tips.
            reduction = Math.max(0, radius - 2.30);
        }
        const point = v.clone();
        if (reduction) point.addScaledVector(radial, -reduction / radius);
        // The modeled collar face at 28.95 overlaps the upper counterbore seat
        // at 28.85 by 0.10 mm even at rest. Limit axial seat tolerance to that
        // face; its full retaining radius still collides on a wrong-way pull.
        if (kind === 'cross-block-split-pin' && Math.abs(along - 28.95) < 0.001) point.addScaledVector(axis, -0.101);
        return point;
    };
    return (a: Triangle, b: Triangle) => {
        const body = shaftMoves ? a : b;
        const adjusted = new Triangle(adjust(body.a), adjust(body.b), adjust(body.c));
        return !(shaftMoves ? contactInterval(adjusted, b, delta) : contactInterval(a, adjusted, delta));
    };
}
