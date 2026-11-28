"""Distinguish two material interferences in the intact lift from nominal surface contact."""

import json
from pathlib import Path

import numpy as np
import trimesh

from tools.ct.turntable_fit import installed, load_scoped_scene


def measure(directory):
    scene, digest = load_scoped_scene(directory)
    access = json.loads((directory / 'turntable-access.json').read_text())
    if digest != access['scopedDigest']:
        raise ValueError('Run the access sweep on the current scoped geometry')
    lift = np.array(access['benchPathOffsetsMm'][1])
    if lift[1] <= 40 or lift[0] != 0 or lift[2] != 0:
        raise ValueError('Witness no longer lies on the vertical test stroke')
    moved = np.array([0., 40., 0.])
    results = []
    for member, obstacle, point in [
        ('4000041/L112', '4000041/L331', [335.03247, 44.02923, -80.03202]),
        ('4000041/L192', '4000041/L110', [350.93058, 38.86127, -74.43834]),
    ]:
        fixed = installed(scene, obstacle)
        if not fixed.is_volume or obstacle in access['carrierStudy']['members'] + access['parkedCrownIds']:
            raise ValueError(f'Expected a stationary closed solid: {obstacle}')
        for leg in (access['outward'][0], access['back'][-1],
                    access['carrierStudy']['outward'][0], access['carrierStudy']['back'][-1]):
            if not any(h['mover'] == member and h['fixed'] == obstacle for h in leg):
                raise ValueError(f'Sweep missed {member} against {obstacle}')
        surface, error, _ = installed(scene, member).nearest.on_surface([point])
        gap, inside = trimesh.proximity.signed_distance(fixed, [surface[0], surface[0] + moved])
        if error[0] > .01 or gap >= -.1 or inside <= .5:
            raise ValueError(f'Lost material interference for {member} against {obstacle}')
        results.append(dict(member=member, obstacle=obstacle, homeSurfacePointMm=surface[0].round(5).tolist(),
                            homeGapMm=round(-gap,4), insideSolidMm=round(inside,4)))
    return dict(scopedDigest=digest, relativeLiftMm=40., reverseTravelFromRaisedMm=round(lift[1]-40.,4), witnesses=results)


if __name__ == '__main__':
    print(json.dumps(measure(Path('.staging/4000041/demo')), indent=2))
