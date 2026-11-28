"""Distinguish through-material collisions from shallow seated surface contacts."""

import json
from functools import lru_cache
from pathlib import Path

import manifold3d as md
import numpy as np

from tools.ct.blocker_fit import checked, vertical_sweep
from tools.ct.turntable_fit import installed, load_scoped_scene


def measure(directory):
    report = json.loads((directory/'rail-plates.json').read_text())
    scene, digest = load_scoped_scene(directory)
    if report['generation'] != (directory/'candidate').read_text().strip() or report['scopedDigest'] != digest:
        raise ValueError('Repeat the rail plate survey for this generation')

    @lru_cache(None)
    def solid(locator):
        mesh = installed(scene, locator)
        if not mesh.is_volume:
            raise ValueError(f'Expected closed oriented solid: {locator}')
        return checked(md.Manifold(md.Mesh64(np.array(mesh.vertices), np.asarray(mesh.faces, dtype=np.uint64))))

    trials = report['trials']
    witnesses = {}
    for mode, name, mover, fixed in [('individual','L214',214,237), ('individual','L215',215,240),
                                     ('topped','wall',248,127)]:
        op = next(o for o in trials[mode]['operations'] if o['name'] == name)
        a, b = [f'4000041/L{n}' for n in (mover, fixed)]
        if not all(any(h['mover'] == a and h['fixed'] == b for h in leg)
                   for leg in (op['outward'][0], op['back'][-1])):
            raise ValueError(f'Missing contact in {mode}/{name}')
        volumes = [checked(solid(a).translate((0,h,0)) ^ solid(b)).volume() for h in (0,2)]
        if volumes[1]-volumes[0] < 1:
            raise ValueError(f'Missing material interference: {a} against {b}')
        witnesses[name] = dict(mover=a, fixed=b, homeMm3=round(volumes[0],6), at2mmMm3=round(volumes[1],6))

    bounds = []
    parked = set(report['parkedCrownIds'])
    for op in trials['topped']['operations']:
        if op['name'] == 'wall':
            parked.update(op['members'])
            continue
        if any(op['outward'][1:] + op['back'][:-1]):
            raise ValueError(f'Unexpected contact outside the seated leg: {op["name"]}')
        dx, lift, dz = op['points'][1]
        if dx or dz or lift <= 0:
            raise ValueError('Expected upward release and downward reseating')
        members = {}
        for mover in op['members']:
            neighbours = sorted({h['fixed'] for h in op['outward'][0]+op['back'][-1] if h['mover'] == mover})
            # Only installed obstacle poses can use their home solid directly.
            if parked.intersection(neighbours):
                raise ValueError('Contact at a displaced pose requires its actual transform')
            mesh = solid(mover)
            layers = {}
            for margin in (0, .005, .010):
                core = mesh if margin == 0 else checked(mesh.minkowski_difference(md.Manifold.cube((2*margin,)*3, True)))
                if core.volume() < .98*mesh.volume():
                    raise ValueError(f'Excessive erosion of {mover}')
                swept = vertical_sweep(core, lift)
                intersections = {}
                for fixed in neighbours:
                    overlap = checked(swept ^ solid(fixed))
                    if not overlap.is_empty():
                        intersections[fixed] = round(overlap.volume(),8)
                layers[str(margin)] = intersections
                if not intersections:
                    break
            members[mover] = layers
        bounds.append(dict(operation=op['name'], sweptCoreOverlapsMm3=members))
        parked.update(op['members'])
    return dict(generation=report['generation'], witnesses=witnesses, sensitivity=bounds)


if __name__ == '__main__':
    print(json.dumps(measure(Path('.staging/4000041/demo')), indent=2))
