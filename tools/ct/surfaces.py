"""Expand CT drawable definitions to coloured triangles for solid-conversion checks.

Each mesh is in its own part frame in mm. Never infer a solid from a triangle count.
"""

import argparse
import json
import math
import struct

from tools.ct.source import LIBRARY, STAGING, checked_definitions, load_source, placement


def transform(point, basis, origin):
    x, y, z = point
    return tuple(origin[i] + basis[3*i]*x + basis[3*i+1]*y + basis[3*i+2]*z for i in range(3))


def determinant(b):
    return b[0]*(b[4]*b[8]-b[5]*b[7]) - b[1]*(b[3]*b[8]-b[5]*b[6]) + b[2]*(b[3]*b[7]-b[4]*b[6])


class Surfaces:
    def __init__(self, definitions):
        self.definitions = definitions
        self.geometry = {}

    def mesh(self, name):
        if name in self.geometry:
            return self.geometry[name]
        mesh = []
        clockwise = invert_next = False
        for line in self.definitions.get(name):
            fields = line.split()
            if fields[:2] == ['0', 'BFC']:
                if 'CW' in fields or 'CCW' in fields:
                    clockwise = 'CW' in fields
                invert_next = 'INVERTNEXT' in fields
            elif fields[:1] == ['1']:
                child, color, frame = placement(line)
                basis = frame[3:]
                reverse = (determinant(basis) < 0) != invert_next
                for child_color, points in self.mesh(child):
                    moved = tuple(transform(p, basis, frame[:3]) for p in points)
                    mesh.append((color if child_color == '16' else child_color, moved[::-1] if reverse else moved))
                invert_next = False
            elif fields[:1] in (['3'], ['4']):
                values = list(map(float, fields[2:]))
                vertices = int(fields[0])
                # Studio texture shells append a UV pair per vertex. UVs do not
                # describe an additional physical surface in the CAD solid.
                if len(values) not in (3*vertices, 5*vertices) or not all(map(math.isfinite, values)):
                    raise ValueError(f'Invalid face in {name}: {line}')
                pts = [tuple(values[i:i+3]) for i in range(0, 3*vertices, 3)]
                if clockwise:
                    pts.reverse()
                for k in range(1, len(pts)-1):
                    mesh.append((fields[1], (pts[0], pts[k], pts[k+1])))
        self.geometry[name] = mesh
        return mesh


def write_stl(mesh, path):
    colors = []
    with path.open('wb') as out:
        out.write(bytes(80) + struct.pack('<I', len(mesh)))
        for color, pts in mesh:
            # LDraw Y points down. Rotate 180 degrees about X to retain handedness.
            coords = [c for x,y,z in pts for c in (.4*x, -.4*y, -.4*z)]
            out.write(struct.pack('<12fH', 0, 0, 0, *coords, 0))
            colors.append(color)
    return colors


def export(library=LIBRARY):
    inventory = load_source()
    defs = checked_definitions(library,inventory['pieces'])
    meshes = Surfaces(defs)
    directory = STAGING / 'surfaces'
    directory.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for i, name in enumerate(sorted(set(p['ref'] for p in inventory['pieces']))):
        triangles = meshes.mesh(name)
        if not triangles:
            raise ValueError(f'Empty part: {name}')
        filename = f'part-{i:03}.stl'
        colors = write_stl(triangles,directory / filename)
        manifest[name] = dict(file=filename, triangles=len(triangles), colors=colors)
    (directory / 'index.json').write_text(json.dumps(manifest, separators=(',', ':')))
    print(f'{len(manifest)} local-frame surfaces, {sum(m["triangles"] for m in manifest.values())} definition triangles in {directory}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--library', default=LIBRARY, type=type(LIBRARY))
    export(parser.parse_args().library)
