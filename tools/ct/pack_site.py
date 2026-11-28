"""Package the built pilot and the selected CT candidate for private static-host testing."""

import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED


def pack():
    site = Path('dist')
    channel = json.loads((site/'models/4000041/channel.json').read_text())
    path = channel['path']
    generation = path.rstrip('/').split('/')[-1]
    if path != f'candidates/{generation}/' or len(generation)!=64 or any(c not in '0123456789abcdef' for c in generation):
        raise ValueError('Unknown CT candidate path')
    active = f'models/4000041/{path}'
    index = (site/active/'index.json').read_bytes()
    if hashlib.sha256(index).hexdigest()!=generation:
        raise ValueError('Static candidate generation mismatch')
    output = Path('.staging/4000041')/f'bench-site-{generation[:12]}.zip'
    temp = output.with_suffix('.tmp')
    with ZipFile(temp,'w',compression=ZIP_DEFLATED,compresslevel=6) as archive:
        for item in sorted(site.rglob('*')):
            name = item.relative_to(site).as_posix()
            if not item.is_file() or name.endswith('.map'):
                continue
            if name.startswith('models/4000041/candidates/') and not name.startswith(active):
                continue
            archive.write(item,name)
    temp.replace(output)
    print(f'{output} ({output.stat().st_size} bytes): serve its contents over HTTPS and open /?dataset=4000041#/')


if __name__ == '__main__':
    pack()
