"""Called in Fusion's Python environment. Build in a new, unsaved design.

assemble(staging_path, sample=True) returns the exported assembly STEP path.
The caller reviews the new document before saving a version to the team's folder.
"""

import json
import hashlib
import re
from pathlib import Path

import adsk.core
import adsk.fusion


def installed_matrix(piece):
    # The geometry writer already changed the part basis by diag(1,-1,-1).
    # Conjugate the Studio rotation by that frame change; translate LDU to cm.
    signs = (1, -1, -1)
    b = piece['basis']
    axes = [adsk.core.Vector3D.create(*(signs[i]*signs[j]*b[3*i+j] for i in range(3))) for j in range(3)]
    if max(abs(a.length-1) for a in axes) > .0001 or axes[0].crossProduct(axes[1]).dotProduct(axes[2]) < .9999:
        raise ValueError(f'Non-rigid placement needs geometry variant: {piece["id"]}')
    axes[0].normalize()
    axes[2] = axes[0].crossProduct(axes[1])
    axes[2].normalize()
    axes[1] = axes[2].crossProduct(axes[0])
    origin = adsk.core.Point3D.create(*(signs[i]*x*.04 for i,x in enumerate(piece['origin'])))
    matrix = adsk.core.Matrix3D.create()
    matrix.setWithCoordinateSystem(origin, *axes)
    return matrix


def assemble(staging_path, sample=True):
    stage = Path(staging_path)
    catalog = json.loads((stage / 'source.json').read_text())
    report_path = stage/'solids/index.json'
    if sample and not report_path.is_file():
        report_path = stage/'solids/sample.json'
    report = json.loads(report_path.read_text())
    pieces = [p for p in catalog['pieces'] if not sample or p['line'] in (111, 112, 250, 251, 385)]
    missing = {p['ref'] for p in pieces if 'file' not in report.get(p['ref'], {})}
    if missing:
        raise ValueError(f'Missing closed solid candidates: {sorted(missing)}')
    matrices = {p['id']: installed_matrix(p) for p in pieces}
    app = adsk.core.Application.get()
    app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
    design = adsk.fusion.Design.cast(app.activeProduct)
    design.designType = adsk.fusion.DesignTypes.DirectDesignType
    root = design.rootComponent
    groups, definitions = {}, {}
    for p in pieces:
        group_name = p['group']
        if group_name not in groups:
            group_occurrence = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
            group_occurrence.component.name = group_name
            groups[group_name] = group_occurrence
        group_proxy = groups[group_name]
        group = group_proxy.component
        ref = p['ref']
        if ref not in definitions:
            options = app.importManager.createSTEPImportOptions(str(stage / 'solids' / report[ref]['file']))
            imported = app.importManager.importToTarget2(options, group)
            if not imported or imported.count != 1:
                raise ValueError(f'Expected one part definition: {ref}')
            occurrence = adsk.fusion.Occurrence.cast(imported.item(0))
            definitions[ref] = occurrence.component
            occurrence.component.name = ref
        else:
            occurrence = group.occurrences.addExistingComponent(definitions[ref], adsk.core.Matrix3D.create())
        # addExistingComponent can inherit the first insertion's placement;
        # assign the absolute transform on the new occurrence in both cases.
        placed = next(o for o in group_proxy.childOccurrences if o.name == occurrence.name)
        placed.transform2 = matrices[p['id']]
        occurrence.attributes.add('ReStart', 'instanceId', p['id'])
        occurrence.attributes.add('ReStart', 'sourceColor', p['color'])
    filename = stage / ('fusion-sample.step' if sample else 'fusion-4000041.step')
    opts = design.exportManager.createSTEPExportOptions(str(filename), root)
    if not design.exportManager.execute(opts):
        raise ValueError('Fusion assembly STEP export failed')
    record_body_witness(root,filename)
    print(f'{len(pieces)} placed occurrences, {len(definitions)} reusable parts, {len(groups)} groups: {filename}')
    return str(filename)


def record_body_witness(root,filename):
    """Independent native body counts/volumes for identifying STEP reader fragments."""
    definitions = {}
    for group in root.occurrences:
        for placed in group.childOccurrences:
            name = placed.component.name
            if name in definitions:
                continue
            bodies = [b for part in [placed,*placed.component.allOccurrences] for b in part.bRepBodies]
            if not bodies or any(not b.isSolid or b.volume<=0 for b in bodies):
                raise ValueError(f'Native Fusion body is not a solid: {name}')
            definitions[name] = sorted(b.volume*1000 for b in bodies)
    with filename.open('rb') as data:
        digest = hashlib.file_digest(data,'sha256').hexdigest()
    filename.with_suffix('.volumes.json').write_text(json.dumps({'sha256':digest,'definitions':definitions}))


def finish_candidate(staging_path, library, destination_document):
    """Apply occurrence colours after independent round-trip, then save the candidate beside CT."""
    stage = Path(staging_path)
    app = adsk.core.Application.get()
    doc = app.activeDocument
    design = adsk.fusion.Design.cast(app.activeProduct)
    if doc.dataFile:
        raise ValueError('Expected an unsaved staging assembly')
    pieces = json.loads((stage / 'source.json').read_text())['pieces']
    verified = json.loads((stage / 'fusion-4000041.crosswalk.json').read_text())
    fidelity = json.loads((stage / 'surface-fidelity.json').read_text())
    if (fidelity['stepSha256'] != verified['sha256'] or set(fidelity['definitions']) != set(verified['definitions'])
            or any(r['outsideSamples'] for r in fidelity['definitions'].values())):
        raise ValueError('The reopened STEP has missing surface landmarks')
    crosswalk = verified['records']
    placed = {o.fullPathName:o for group in design.rootComponent.occurrences for o in group.childOccurrences}
    if set(placed) != {'+'.join(r['path']) for r in crosswalk.values()} or set(crosswalk) != {p['id'] for p in pieces}:
        raise ValueError('Active design does not match the round-trip crosswalk')
    palette = {}
    for line in (Path(library) / 'LDConfig.ldr').read_text(errors='replace').splitlines():
        match = re.match(r'0 !COLOUR\s+(\S+)\s+CODE\s+(\d+)\s+VALUE\s+#([0-9A-Fa-f]{6})',line)
        if match:
            palette[match[2]] = (match[1], bytes.fromhex(match[3]))
    template = app.materialLibraries.itemByName('Fusion Appearance Library').appearances.itemByName('Plastic - Matte (White)')
    appearances = {}
    for key in sorted({p['color'] for p in pieces}):
        name, rgb = palette[key]
        label = f'LDraw {key} {name}'
        appearance = design.appearances.itemByName(label) or design.appearances.addByCopy(template, label)
        appearance.appearanceProperties.itemById('opaque_albedo').value = adsk.core.Color.create(*rgb,255)
        appearances[key] = appearance
    for p in pieces:
        o = placed['+'.join(crosswalk[p['id']]['path'])]
        o.appearance = appearances[p['color']]
        o.attributes.add('ReStart', 'instanceId', p['id'])
        o.attributes.add('ReStart', 'sourceColor', p['color'])
    folder = destination_document.dataFile.parentFolder
    title = 'CT 4000041 - ' + verified['sha256'][:12]
    if any(f.name == title for f in folder.dataFiles):
        raise ValueError('A saved staging assembly already exists')
    if not doc.saveAs(title, folder, 'Conversion candidate; mechanical fidelity review pending.', ''):
        raise ValueError('Fusion save failed')
    print(f'{doc.name}: {len(placed)} occurrences with {len(appearances)} source colours; {doc.dataFile.id}')
