"""Measure material at the strict contacts in the two turntable blocker trials."""

import json
from pathlib import Path

import manifold3d as md
import numpy as np
import shapely
import trimesh

from tools.ct.turntable_fit import installed, load_scoped_scene


def checked(solid):
    if solid.status() != md.Error.NoError:
        raise ValueError(f'Invalid boolean solid: {solid.status()}')
    return solid


def vertical_sweep(solid, lift):
    """Union the home solid with each forward face swept continuously to lift."""
    if lift <= 0 or solid.is_empty():
        raise ValueError('Expected positive lift and a nonempty mover')
    mesh = solid.to_mesh64()
    triangles = mesh.vert_properties[:, :3][mesh.tri_verts]
    normals = np.cross(triangles[:, 1]-triangles[:, 0], triangles[:, 2]-triangles[:, 0])
    delta = [0, lift, 0]
    prisms = [md.Manifold.hull_points(np.vstack([t, t+delta])) for t in triangles[normals[:, 1] > 0]]
    return checked(md.Manifold.batch_boolean([solid, *prisms], md.OpType.Add))


def measure(directory):
    report = json.loads((directory / 'turntable-blockers.json').read_text())
    scene, digest = load_scoped_scene(directory)
    if report['scopedDigest'] != digest or report['generation'] != (directory/'candidate').read_text().strip():
        raise ValueError('Rerun the blocker trials on this geometry')
    trials = report['strictTrials']

    def solid(locator):
        mesh = installed(scene, locator)
        if not mesh.is_volume:
            raise ValueError(f'Closed oriented solid required: {locator}')
        return checked(md.Manifold(md.Mesh64(np.array(mesh.vertices), np.asarray(mesh.faces, dtype=np.uint64))))

    def fixed_ids(leg):
        return {hit['fixed'] for hit in leg}

    tile = trials['tile']
    pins_and_rim = {'4000041/L184', '4000041/L188', '4000041/L191', '4000041/L192'}
    if ([fixed_ids(leg) for leg in tile['outward']] != [pins_and_rim, set(), set()] or
            [fixed_ids(leg) for leg in tile['back']] != [set(), set(), pins_and_rim]):
        raise ValueError('The four near-seat interfaces no longer account for the complete tile route')
    dx, lift, dz = tile['points'][1]
    if (dx, dz) != (0, 0) or tile['members'] != ['4000041/L110']:
        raise ValueError('Unexpected tile stroke')
    moving = solid('4000041/L110')
    swept = vertical_sweep(moving, lift)
    # A sensitivity bound on the tile, not a global collision exemption. Only
    # the four named contacts are rechecked with this inner solid. Everything
    # else was tested at nominal size on all six legs in the full-kit sweep.
    margin = .005
    inner = checked(moving.minkowski_difference(md.Manifold.cube((2*margin,)*3, center=True)))
    if not 0.99*moving.volume() < inner.volume() < moving.volume():
        raise ValueError('Unexpected loss of tile material in the inner-solid test')
    inner_sweep = vertical_sweep(inner, lift)
    volumes = {}
    for locator in sorted(pins_and_rim):
        fixed = solid(locator)
        if not checked(inner_sweep ^ fixed).is_empty():
            raise ValueError(f'Tile inner solid interferes with {locator}')
        volumes[locator] = round(checked(swept ^ fixed).volume(), 8)

    # Check that the hypothetical jaws have material to grip, not just free
    # space alongside the bounding box. Ignore one micron at face boundaries.
    mesh = installed(scene, '4000041/L110')
    low, high = mesh.bounds
    x = (low[0]+high[0])/2
    pad = shapely.box(x-2+.001, high[1]-1.5+.001, x+2-.001, high[1]-.001)
    for z in [low[2], high[2]]:
        faces = mesh.triangles[np.all(np.abs(mesh.triangles[:, :, 2]-z)<.001, axis=1)]
        if not shapely.union_all(shapely.polygons(faces[:, :, :2])).covers(pad):
            raise ValueError(f'Tile has no opposing jaw patch at Z={z}')
    grip = report['tileGrip']
    for stop in ['installedGrasp', 'benchGrasp']:
        grasp = grip[stop]
        if grasp['openApproach'] or grasp['openRetreat'] or any(j['close'] or j['release'] for j in grasp['jawMotion']):
            raise ValueError(f'Jaw approach or withdrawal blocked: {stop}')
    if grip['transport']['contacts'] or fixed_ids(grip['broadFingerApproach']) != {'4000041/L262', '4000041/L263'}:
        raise ValueError('Narrow-jaw or broad-finger clearance changed')

    # The post and L248 already overlap in the source installation. Compare
    # with that baseline when reporting the trial that keeps the bridge intact.
    post, side = solid('4000041/L331'), solid('4000041/L248')
    for key in ['bridge', 'bridgeWithPins', 'supportedBridge']:
        if not all(any(h['mover'] == '4000041/L331' and h['fixed'] == '4000041/L248' for h in leg)
                   for leg in [trials[key]['outward'][0], trials[key]['back'][-1]]):
            raise ValueError(f'Bridge/side-wall contact changed for {key}')
    bridge_volume = [round(checked(post.translate((0, h, 0)) ^ side).volume(), 6) for h in (0, 2)]
    if bridge_volume[1] <= bridge_volume[0] or bridge_volume[0] <= 0:
        raise ValueError('Changed bridge/side-wall interference')

    witnesses = []
    for trial, member, obstacle, point, lift_mm in [
        (trials['tileWithPins'], '4000041/L184', '4000041/L192', [345.81538,69.33329,-70.44351], 2),
        (trials['brick'], '4000041/L331', '4000041/L149', [333.02004,86.93325,-82.04464], 2),
        (report['endpointSensitivity']['bothWithSupports'], '4000041/L112', '4000041/L237', [338.87961,43.54755,-49.23629], 42),
    ]:
        if not all(any(h['mover'] == member and h['fixed'] == obstacle for h in leg)
                   for leg in [trial['outward'][0], trial['back'][-1]]):
            raise ValueError(f'Missing return or exit contact for {member} against {obstacle}')
        fixed = installed(scene, obstacle)
        if not fixed.is_volume:
            raise ValueError(f'Expected closed stationary obstacle: {obstacle}')
        surface, error, _ = installed(scene, member).nearest.on_surface([point])
        gap, inside = trimesh.proximity.signed_distance(fixed, [surface[0], surface[0]+[0,lift_mm,0]])
        if error[0] > .01 or gap >= -.1 or inside <= .1:
            raise ValueError(f'Interference not reproduced: {member} against {obstacle}')
        witnesses.append(dict(mover=member, fixed=obstacle, offsetYMm=lift_mm, homePointMm=surface[0].round(5).tolist(),
                              initialGapMm=round(-gap,4), insideMm=round(inside,4)))
    return dict(scopedDigest=digest, generation=report['generation'], tileSweptOverlapMm3=volumes,
                tileInnerCubeHalfWidthMm=margin, tileInnerSweepIntersections=0, tileJawContactPatches=2,
                bridgeOverlapAtHomeAnd2mmMm3=bridge_volume, witnesses=witnesses)


if __name__ == '__main__':
    print(json.dumps(measure(Path('.staging/4000041/demo')), indent=2))
