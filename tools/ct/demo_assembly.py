"""Select physical occurrences for the MRI demo from the audited full inventory."""

import json
from pathlib import Path


def select_demo(source):
    scope_path = Path(__file__).resolve().parents[2] / 'data/review/4000041/demo-assembly.json'
    scope = json.loads(scope_path.read_text())
    if source['sourceSha256'] != scope['sourceSha256']:
        raise ValueError('Demo scope belongs to a different source revision')
    members = [p for p in source['pieces'] if p['group'] in scope['groups']]
    exclusions = scope['excludedOccurrences']
    for locator, ref in exclusions.items():
        if [p['ref'] for p in members if p['id'] == locator] != [ref]:
            raise ValueError(f'Excluded occurrence changed: {locator}')
    return [p for p in members if p['id'] not in exclusions]
