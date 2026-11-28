"""Read the revision-pinned CT assembly. All source coordinates are LDraw units."""

import argparse
from collections import Counter
import hashlib
import json
import math
import re
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree
from zipfile import ZipFile


ARCHIVE = Path('assets/lego-ct/4000041.io')
DIGEST = 'b94332a64f28fe2bcd4dfead7ab195398885cedb85dca7b1f0c5997975a3aef2'
LIBRARY = Path('/Applications/Studio 2.0/ldraw')
STAGING = Path('.tmp/ct')


def reference(name):
    name = name.strip().replace('\\', '/').lower()
    path = PurePosixPath(name)
    if not name or path.is_absolute() or '..' in path.parts or ':' in name:
        raise ValueError(f'Invalid part reference: {name}')
    return name


def sections(raw):
    result = {}
    for line_no, text in enumerate(raw.decode('utf-8-sig').splitlines(), 1):
        if text.startswith('0 FILE '):
            name = reference(text[7:])
            if name in result:
                raise ValueError(f'Duplicate section: {name}')
            result[name] = current = []
        elif text.strip() and result:
            current.append((line_no, text.strip()))
    return result


def placement(text):
    fields = text.split(None, 14)
    transform = tuple(map(float, fields[2:14]))
    if len(transform) != 12 or not all(map(math.isfinite, transform)):
        raise ValueError(f'Invalid placement: {text}')
    return reference(fields[14]), fields[1], transform


def load_source(archive=ARCHIVE):
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != DIGEST:
        raise ValueError(f'CT source revision changed: {digest}')
    with ZipFile(archive) as z:
        root = sections(z.read('model.ldr'))['4000041.io']
        v2 = sections(z.read('modelv2.ldr'))['4000041.io']
        info = json.loads(z.read('.info'))
        xml = ElementTree.fromstring(z.read('model.lxfml'))

    witnesses = {}
    for line, text in v2:
        if text.startswith('11 '):
            _, color, studio_id, _, _, rest = text.split(None, 5)
            key = placement('1 ' + color + ' ' + rest)
            if key in witnesses:
                raise ValueError(f'Ambiguous v2 witness at line {line}')
            witnesses[key] = studio_id

    pieces, group = [], []
    for line, text in root:
        if text.startswith('1 '):
            ref, color, matrix = placement(text)
            piece = dict(id=f'4000041/L{line}', line=line, ref=ref, color=color,
                         origin=matrix[:3], basis=matrix[3:], studioId=witnesses.pop((ref, color, matrix)),
                         group='Assembly')
            pieces.append(piece)
            group.append(piece)
        elif text.startswith('0 STUDIOSTEPDESC '):
            for piece in group:
                piece['group'] = text.removeprefix('0 STUDIOSTEPDESC ')
        elif text == '0 STEP':
            group.clear()
    if witnesses or len(pieces) != info['total_parts']:
        raise ValueError('Studio archive count or second placement witness disagrees')
    return dict(dataset='4000041', sourceSha256=digest, version=info['version'],
                millimetresPerUnit=.4, xmlPartCounts=dict(Counter(len(b.findall('Part')) for b in xml.findall('.//Brick'))),
                pieces=pieces)


class Definitions:
    """Resolve in source order: inline MPD, custom brick, installed library."""

    def __init__(self, library, archive=ARCHIVE):
        self.library = library
        self.records = {}
        self.lines = {}
        with ZipFile(archive) as z:
            self.inline = sections(z.read('model.ldr'))
            self.custom = {reference(n[12:]): z.read(n) for n in z.namelist()
                           if n.startswith('CustomParts/') and n.lower().endswith('.dat')}

    def get(self, name):
        if name in self.lines:
            return self.lines[name]
        if name in self.inline:
            lines = [text for _, text in self.inline[name]]
            origin = 'model.ldr#' + name
            raw = '\n'.join(lines).encode()
        else:
            if name in self.custom:
                raw, origin = self.custom[name], 'CustomParts/' + name
            else:
                paths = ['parts', 'p', 'UnOfficial/parts', 'UnOfficial/p']
                path = next((self.library / d / name for d in paths if (self.library / d / name).is_file()), None)
                if path is None:
                    raise FileNotFoundError(name)
                raw, origin = path.read_bytes(), str(path.relative_to(self.library))
            lines = [line.strip() for line in raw.decode('utf-8-sig', errors='replace').splitlines()]
        self.lines[name] = lines
        self.records[name] = dict(origin=origin, sha256=hashlib.sha256(raw).hexdigest(),
                                  credits=[l for l in lines if l.startswith(('0 Author:', '0 !LICENSE'))])
        return lines

    def dependencies(self, pieces):
        done = set()

        def walk(name, parents):
            if name in parents:
                raise ValueError('Cyclic definition: ' + ' -> '.join((*parents, name)))
            if name in done:
                return
            try:
                lines = self.get(name)
            except FileNotFoundError as e:
                raise ValueError('Missing definition: ' + ' -> '.join((*parents, name))) from e
            for text in lines:
                if text.startswith('1 '):
                    walk(placement(text)[0], (*parents, name))
            done.add(name)

        for piece in pieces:
            walk(piece['ref'], (piece['id'],))
        return self.records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--library', type=Path, default=LIBRARY)
    args = parser.parse_args()
    inventory = load_source()
    library = Definitions(args.library)
    definitions = library.dependencies(inventory['pieces'])
    palette = {}
    for line in (args.library / 'LDConfig.ldr').read_text(errors='replace').splitlines():
        match = re.match(r'0 !COLOUR\s+(\S+)\s+CODE\s+(\d+)\s+VALUE\s+(#[0-9A-Fa-f]{6})',line)
        if match:
            palette[match[2]] = {'name': match[1].replace('_', ' '), 'rgb': match[3]}
    for piece in inventory['pieces']:
        name = piece['ref']
        title = next((line[2:] for line in library.get(name) if line.startswith('0 ') and not line.startswith('0 FILE ')), name)
        piece['name'] = ' '.join(title.split()) if title.lower() != 'untitledmodel' else name
        piece['colorName'] = palette[piece['color']]['name']
        piece['rgb'] = palette[piece['color']]['rgb']
    STAGING.mkdir(parents=True, exist_ok=True)
    manifest = STAGING / 'source.json'
    temporary = manifest.with_suffix('.tmp')
    temporary.write_text(json.dumps({**inventory, 'definitions': definitions}, indent=2) + '\n')
    temporary.replace(manifest)
    pieces = inventory['pieces']
    print(f'{len(pieces)} physical placements; {len(set(p["ref"] for p in pieces))} root references; '
          f'{len(definitions)} resolved drawable definitions; {len(set(p["studioId"] for p in pieces))} distinct Studio IDs')
    print(f'{manifest}: source SHA-256 {DIGEST}')


if __name__ == '__main__':
    main()
