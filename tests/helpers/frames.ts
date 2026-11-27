/**
 * Rigid-frame helpers shared by the geometry tests.
 *
 * Frames are the domain's own shape — a millimetre translation and a unit quaternion — so a
 * test cannot drift into a convention the dataset does not use. Nothing here reads a file.
 */
import type { Quaternion, RigidFrame, Vec3 } from '../../src/domain/schema.js';

export const IDENTITY_FRAME: RigidFrame = {
    translation: [0, 0, 0],
    rotation: [0, 0, 0, 1]
};

export function frameAt(translation: Vec3): RigidFrame {
    return { translation: [translation[0], translation[1], translation[2]], rotation: [0, 0, 0, 1] };
}

/** Right-handed rotation of `radians` about a unit `axis` through `pivot`. */
export function rotatedFrame(pivot: Vec3, axis: Vec3, radians: number): RigidFrame {
    const length = Math.hypot(axis[0], axis[1], axis[2]);
    if (length === 0) throw new Error('a rotation needs a non-zero axis');
    const k = Math.sin(radians / 2) / length;
    const rotation: Quaternion = [axis[0] * k, axis[1] * k, axis[2] * k, Math.cos(radians / 2)];
    if (pivot[0] === 0 && pivot[1] === 0 && pivot[2] === 0) {
        return { translation: [0, 0, 0], rotation };
    }
    // A rotation about a point that is not the origin is that rotation after a shift, so the
    // frame carries the offset the composed transform leaves on the origin.
    const [px, py, pz] = pivot;
    const rotated = rotate(rotation, [-px, -py, -pz]);
    return {
        translation: [px + rotated[0], py + rotated[1], pz + rotated[2]],
        rotation
    };
}

/** Rotate a vector by a unit quaternion `[x, y, z, w]`. */
export function rotate(rotation: Quaternion, vector: Vec3): Vec3 {
    const [rx, ry, rz, rw] = rotation;
    const [vx, vy, vz] = vector;
    const tx = 2 * (ry * vz - rz * vy);
    const ty = 2 * (rz * vx - rx * vz);
    const tz = 2 * (rx * vy - ry * vx);
    return [
        vx + rw * tx + ry * tz - rz * ty,
        vy + rw * ty + rz * tx - rx * tz,
        vz + rw * tz + rx * ty - ry * tx
    ];
}
