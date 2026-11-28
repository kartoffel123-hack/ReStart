"""Bake planar LDraw prints onto the corresponding B-rep face without adding solid bodies."""

import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw

from tools.ct.source import LIBRARY, STAGING, checked_definitions, load_source
from tools.ct.surfaces import Surfaces


def build(library=LIBRARY):
    source = load_source()
    defs = checked_definitions(library,source['pieces'])
    meshes = Surfaces(defs)
    palette = dict(re.findall(r' CODE\s+(\d+)\s+VALUE\s+(#[0-9A-Fa-f]{6})', (library/'LDConfig.ldr').read_text()))
    directory = STAGING/'patterns'
    directory.mkdir(exist_ok=True)
    patterns = {}
    for ref, color in sorted({(p['ref'],p['color']) for p in source['pieces']}):
        faces = [(c,tri) for c,tri in meshes.mesh(ref) if all(abs(y)<.001 for x,y,z in tri)]
        if len({c for c,_ in faces}) < 2:
            continue
        points = [(.4*x,-.4*z) for _,tri in faces for x,_,z in tri]
        left, right = min(x for x,z in points), max(x for x,z in points)
        bottom, top = min(z for x,z in points), max(z for x,z in points)
        # A two-texel margin supplies the base colour for non-printed faces.
        image = Image.new('RGB',(260,260),palette[color])
        draw = ImageDraw.Draw(image)
        for c,tri in faces:
            uv = [(2+255*(.4*x-left)/(right-left),2+255*(-.4*z-bottom)/(top-bottom)) for x,_,z in tri]
            draw.polygon(uv,fill=palette[color if c=='16' else c])
        filename = f'pattern-{len(patterns)}.png'
        image.save(directory/filename)
        patterns[f'{ref}:{palette[color]}'] = dict(file=filename, bounds=[left,bottom,right,top])
    (directory/'index.json').write_text(json.dumps(patterns))
    print(f'{len(patterns)} planar print variants rasterized from the source; UV bounds in local X/Z millimetres')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--library',type=Path,default=LIBRARY)
    build(parser.parse_args().library)
