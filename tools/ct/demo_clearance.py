"""Check scoped movers against the whole installed kit, including its loose separator."""

import hashlib
import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import trimesh

from tools.ct.demo_assembly import select_demo
from tools.ct.gantry_clearance import verify
from tools.ct.source import load_source


def measure(scoped_path):
    # This is the independently reopened, surface-checked full export used by
    # the previous bench candidate. It supplies only the excluded obstacles/tool.
    digest = '6b29220b3f79c718ce1e096fa9aa5d089d24f75217fecc9784f115a470124b75'
    reference = Path('.staging/4000041') / f'geometry-{digest}.glb'
    if hashlib.sha256(reference.read_bytes()).hexdigest() != digest:
        raise ValueError('Full-kit obstacle reference changed')
    full = trimesh.load_scene(reference, process=False)
    scoped = trimesh.load_scene(scoped_path, process=False)
    source = load_source()
    ids = {p['id'] for p in select_demo(source)}
    if set(scoped.graph.nodes_geometry) != ids or set(full.graph.nodes_geometry) != {p['id'] for p in source['pieces']}:
        raise ValueError('Obstacle geometry differs from audited source membership')
    combined = trimesh.Scene()
    for locator in sorted(full.graph.nodes_geometry):
        scene = scoped if locator in ids else full
        frame, mesh = scene.graph[locator]
        combined.add_geometry(scene.geometry[mesh], node_name=locator, transform=frame)
    with TemporaryDirectory() as directory:
        path = Path(directory) / 'obstacles.glb'
        combined.export(path)
        recipe = json.loads(Path('data/review/4000041/gantry-brick.json').read_text())
        return verify(path, recipe)


if __name__ == '__main__':
    print(json.dumps(measure(Path(sys.argv[1]))))
