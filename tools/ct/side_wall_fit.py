"""Check solid interference independently of the wall/bridge surface sweeps."""

import json
from pathlib import Path

import manifold3d as md
import numpy as np

from tools.ct.blocker_fit import checked, vertical_sweep
from tools.ct.turntable_fit import installed, load_scoped_scene


def measure(directory):
    report = json.loads((directory / 'side-wall.json').read_text())
    scene, digest = load_scoped_scene(directory)
    if report['generation'] != (directory/'candidate').read_text().strip() or report['scopedDigest'] != digest:
        raise ValueError('Repeat the side-wall study for this candidate')
    trials = report['trials']
    cache = {}

    def solid(locator):
        if locator not in cache:
            mesh = installed(scene, locator)
            if not mesh.is_volume:
                raise ValueError(f'Expected a closed oriented solid: {locator}')
            cache[locator] = checked(md.Manifold(md.Mesh64(np.array(mesh.vertices), np.asarray(mesh.faces, dtype=np.uint64))))
        return cache[locator]

    witnesses = {}
    # The shift witnesses are at the displaced endpoint. For tray removal,
    # 2 mm is an intermediate pose on both the initial lift and final reseat.
    for name, moving, fixed in [('brickShift',248,230), ('brickRemoval',248,127),
                                ('wallAndPlateShift',230,273), ('wallAndPlateRemoval',230,214),
                                ('facedWallShift',230,273), ('facedWallRemoval',230,214)]:
        wall = trials[name]['wall']
        a, b = [f'4000041/L{n}' for n in (moving, fixed)]
        if not all(any(hit['mover'] == a and hit['fixed'] == b for hit in leg)
                   for leg in (wall['outward'][0], wall['back'][-1])):
            raise ValueError(f'Missing {name} surface witness')
        dx, dy, dz = wall['points'][1]
        offset = (dx, min(dy, 2), dz)
        initial = checked(solid(a) ^ solid(b)).volume()
        displaced = checked(solid(a).translate(offset) ^ solid(b)).volume()
        if displaced-initial < .1:
            raise ValueError(f'Failed to reproduce increased overlap for {name}')
        witnesses[name] = dict(moving=a, fixed=b, offsetMm=offset,
                               installedMm3=round(initial,6), displacedMm3=round(displaced,6))

    trial = trials['wallAndPlateShift']
    delta = trial['wall']['points'][-1]
    lift = trial['bridge']['points'][1][1]
    for locator in trial['bridge']['members']:
        sweep = vertical_sweep(solid(locator), lift)
        for wall_id in trial['wall']['members']:
            if not checked(sweep ^ solid(wall_id).translate(delta)).is_empty():
                raise ValueError(f'Conditional bridge lift still meets {wall_id}')
    return dict(generation=report['generation'], shiftMm=delta, bridgeWallSolidIntersectionsAfterShift=0,
                wallMotionWitnesses=witnesses)


if __name__ == '__main__':
    print(json.dumps(measure(Path('.staging/4000041/demo')), indent=2))
