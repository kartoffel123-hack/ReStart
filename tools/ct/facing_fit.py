"""Measure nominal facing interference relative to the installed overlap."""

import json
from functools import lru_cache
from pathlib import Path

import manifold3d as md
import numpy as np

from tools.ct.blocker_fit import checked
from tools.ct.turntable_fit import installed, load_scoped_scene


def measure(directory):
    report = json.loads((directory / 'facing-access.json').read_text())
    scene, digest = load_scoped_scene(directory)
    if report['scopedDigest'] != digest or report['generation'] != (directory/'candidate').read_text().strip():
        raise ValueError('Repeat facing-access on the current scoped generation')
    if report['policy'] != 'reachable-only' or report['kitOccurrences'] != 566:
        raise ValueError('Expected the complete kit and reachable-only advancement')

    @lru_cache(None)
    def solid(locator):
        mesh = installed(scene, locator)
        if not mesh.is_volume:
            raise ValueError(f'Expected closed oriented solid: {locator}')
        return checked(md.Manifold(md.Mesh64(np.array(mesh.vertices), np.asarray(mesh.faces, dtype=np.uint64))))

    results = []
    for mode, name, mover, fixed, travel in [
        ('side','L127',127,126,1), ('side','L129',129,300,1),
        ('sideTogether','both faces',129,300,1),
        ('up','L127',127,141,2), ('up','L129',129,142,2),
        ('side','wall',248,127,2), ('side','bridge',331,248,2),
    ]:
        trial = report['trials'][mode]
        if trial['restoreOrder'] or any(op['parkedForNextOperation'] for op in trial['operations']):
            raise ValueError('Installed-pose witnesses require all attempted moves to have remained installed')
        op = next(o for o in trial['operations'] if o['name'] == name)
        a, b = [f'4000041/L{n}' for n in (mover, fixed)]
        if not all(any(h['mover'] == a and h['fixed'] == b for h in leg)
                   for leg in (op['outward'][0], op['back'][-1])):
            raise ValueError(f'Missing exit/reseat witness: {name} vs {b}')
        stroke = np.array(op['points'][1])
        if np.linalg.norm(stroke) < travel or np.any(op['points'][0]):
            raise ValueError('Probe offset outside first stroke')
        offset = travel * stroke / np.linalg.norm(stroke)
        before = checked(solid(a) ^ solid(b))
        after = checked(solid(a).translate(offset) ^ solid(b))
        # Compare in the fixed solid's frame. Overall overlap may diminish
        # during withdrawal even as a different region of the solid is crossed.
        additional = checked(after - before).volume()
        if additional <= 0:
            raise ValueError(f'Changed material witness: {a} vs {b}')
        results.append(dict(trial=mode, mover=a, fixed=b, offsetMm=offset.tolist(),
                            homeMm3=round(before.volume(),6), atOffsetMm3=round(after.volume(),6),
                            newlyOccupiedFixedMm3=round(additional,6)))
    return dict(generation=report['generation'], witnesses=results)


if __name__ == '__main__':
    print(json.dumps(measure(Path('.staging/4000041/demo')), indent=2))
