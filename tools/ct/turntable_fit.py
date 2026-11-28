"""Probe both rigid axial exits of the toothed top with its grey bottom held fixed."""

import hashlib
import json
from pathlib import Path

import numpy as np
import trimesh


def measure(directory):
    scope = json.loads(Path('data/review/4000041/demo-assembly.json').read_text())
    imported = json.loads((directory / 'import.json').read_text())
    path = directory / imported['geometry']
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if path.name != f'geometry-{digest}.glb':
        raise ValueError('Scoped geometry digest mismatch')
    scene = trimesh.load_scene(path, process=False)

    def installed(locator):
        frame, key = scene.graph[locator]
        mesh = scene.geometry[key].copy()
        mesh.apply_transform(frame)
        mesh.apply_scale(1000)
        mesh.merge_vertices()
        return mesh

    top = installed(scope['gearTarget'])
    bottom = installed(scope['turntableBottom'])
    if not bottom.is_volume:
        raise ValueError('The mating bottom is not a closed oriented volume')
    results = []
    # These are points on the black top, in the scoped STEP assembly frame (mm).
    # Recover the actual surface before measuring. Positive signed distance means
    # strictly inside the closed grey solid. No tolerance for a snap fit is assumed.
    for locator, stroke in [([340.71604,70.41444,-49.70404], -2), ([337.96026,63.96479,-58.26848], 2)]:
        surface, error, _ = top.nearest.on_surface([locator])
        if error[0] > .01:
            raise ValueError(f'Toothed top landmark moved: {locator}')
        start, shifted = trimesh.proximity.signed_distance(bottom, [surface[0], surface[0]+[stroke,0,0]])
        if start >= -.1 or shifted <= .1:
            raise ValueError(f'Cannot reproduce axial interference at {locator}: {start}, {shifted}')
        results.append(dict(strokeXMm=stroke, topPointMm=surface[0].round(5).tolist(),
                            initialGapMm=round(-start,4), insideBottomMm=round(shifted,4)))
    return dict(geometrySha256=digest, top=scope['gearTarget'], bottom=scope['turntableBottom'], witnesses=results)


if __name__ == '__main__':
    print(json.dumps(measure(Path('.staging/4000041/demo')), indent=2))
