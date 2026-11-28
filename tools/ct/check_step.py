"""Reopen the Fusion STEP independently; match a definition AND a complete installed pose."""

import argparse
import hashlib
import json

import numpy as np
from OCP.BRepGProp import BRepGProp
from OCP.BRepClass3d import BRepClass3d_SolidClassifier
from OCP.gp import gp_Pnt
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.GProp import GProp_GProps
from OCP.IFSelect import IFSelect_RetDone
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.StlAPI import StlAPI_Writer
from OCP.TCollection import TCollection_ExtendedString
from OCP.TDataStd import TDataStd_Name
from OCP.TDF import TDF_Label
from OCP.collections import Sequence_TDF_Label as TDF_LabelSequence
from OCP.TDocStd import TDocStd_Document
from OCP.TopAbs import TopAbs_IN, TopAbs_ON, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.XCAFDoc import XCAFDoc_DocumentTool

from tools.ct.source import STAGING, load_source
from tools.ct.fidelity import uncovered
from tools.ct.demo_assembly import select_demo


def label_name(label):
    attr = TDataStd_Name()
    return attr.Get().ToExtString() if label.FindAttribute(TDataStd_Name.GetID_s(), attr) else ''


def inspect(sample, export_meshes=False, demo=False):
    path = STAGING / ('fusion-demo.step' if demo else 'fusion-sample.step' if sample else 'fusion-4000041.step')
    source = load_source()
    pieces = select_demo(source) if demo else [p for p in source['pieces'] if not sample or p['line'] in (111, 112, 250, 251, 385)]
    doc = TDocStd_Document(TCollection_ExtendedString('MDTV-XCAF'))
    reader = STEPCAFControl_Reader()
    if reader.ReadFile(str(path)) != IFSelect_RetDone or not reader.Transfer(doc):
        raise ValueError(f'Cannot read {path}')
    shapes = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())
    roots = TDF_LabelSequence()
    shapes.GetFreeShapes(roots)
    records = {}
    definitions = {}
    native = json.loads(path.with_suffix('.volumes.json').read_text())
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    if native['sha256'] != sha:
        raise ValueError('Native Fusion volume witness refers to another export')
    fidelity = {}
    source_files = json.loads((STAGING / 'surfaces/index.json').read_text()) if export_meshes else {}
    names = {p['ref'] for p in pieces}
    signs = np.diag([1, -1, -1])

    def walk(label, parent, ancestors):
        children = TDF_LabelSequence()
        shapes.GetComponents_s(label, children)
        for i in range(1, children.Length()+1):
            occurrence = children.Value(i)
            definition = TDF_Label()
            if not shapes.GetReferredShape_s(occurrence, definition):
                raise ValueError('Unresolved STEP occurrence')
            location = shapes.GetLocation_s(occurrence).Transformation()
            matrix = np.eye(4)
            matrix[:3] = [[location.Value(row, col) for col in range(1, 5)] for row in range(1, 4)]
            world = parent @ matrix
            name = label_name(definition)
            locator = ancestors + [label_name(occurrence)]
            if name not in names:
                if not shapes.IsAssembly_s(definition):
                    raise ValueError(f'Unexpected leaf: {locator}')
                walk(definition, world, locator)
                continue
            matches = []
            for p in pieces:
                if p['ref'] != name:
                    continue
                basis = signs @ np.array(p['basis']).reshape(3,3) @ signs
                # Compare basis-vector tips as well as origins (including handedness).
                angle_error = np.max(np.linalg.norm(basis-world[:3,:3], axis=0))
                pos_error = np.linalg.norm(signs @ p['origin']*.4-world[:3,3])
                if pos_error <= .1 and angle_error <= 2*np.sin(np.deg2rad(.5)/2):
                    if demo and ancestors != [p['group'] + ':1']:
                        raise ValueError(f'Wrong Fusion group for {p["id"]}: {locator}')
                    matches.append((p['id'], float(pos_error)))
            if len(matches) != 1 or matches[0][0] in records:
                raise ValueError(f'Ambiguous/unmatched {locator} at {world[:3,3]}: {matches}')
            if name not in definitions:
                shape = shapes.GetShape_s(definition)
                solids = TopExp_Explorer(shape, TopAbs_SOLID)
                volumes = []
                classifiers = []
                while solids.More():
                    mass = GProp_GProps()
                    BRepGProp.VolumeProperties_s(solids.Current(), mass)
                    volumes.append(mass.Mass())
                    classifiers.append(BRepClass3d_SolidClassifier(solids.Current()))
                    solids.Next()
                if not volumes or min(volumes) < 0 or max(volumes) <= 0:
                    raise ValueError(f'Missing positive-volume B-rep at {locator}')
                null_shells = volumes.count(0.)
                volumes = [v for v in volumes if v > 0.]
                if null_shells:
                    # The AP214 reader may wrap an empty trim fragment in a
                    # SOLID. Do not count it as a body or excuse a missing one:
                    # require every native body volume and all source landmarks.
                    actual = native['definitions'][name]
                    if len(actual)!=len(volumes) or not np.allclose(actual,sorted(volumes),atol=.001,rtol=1e-6):
                        raise ValueError(f'Unreconciled zero-volume shell at {locator}: {volumes} versus {actual}')
                filename = f'definition-{len(definitions)}.stl'
                mesh_sha = None
                if export_meshes:
                    directory = STAGING / ('demo-step-meshes' if demo else 'step-meshes')
                    directory.mkdir(exist_ok=True)
                    mesher = BRepMesh_IncrementalMesh(shape, .12, False, .4, True)
                    writer = StlAPI_Writer()
                    writer.ASCIIMode = False
                    if not mesher.IsDone() or not writer.Write(shape, str(directory / filename)):
                        raise ValueError(f'Cannot tessellate {name}')
                    def contains(point):
                        for classifier in classifiers:
                            classifier.Perform(gp_Pnt(*point),1e-6)
                            if classifier.State() in (TopAbs_IN,TopAbs_ON):
                                return True
                        return False
                    fidelity[name] = uncovered(STAGING/'surfaces'/source_files[name]['file'],directory/filename,contains)
                    mesh_sha = hashlib.sha256((directory/filename).read_bytes()).hexdigest()
                definitions[name] = dict(volumesMm3=volumes, file=filename, meshSha256=mesh_sha, zeroVolumeReaderFragments=null_shells)
            records[matches[0][0]] = dict(path=locator, ref=name, world=world.tolist(), positionErrorMm=matches[0][1],
                                           volumesMm3=definitions[name]['volumesMm3'])

    if roots.Length() != 1:
        raise ValueError(f'Expected one assembly, got {roots.Length()}')
    walk(roots.Value(1), np.eye(4), [])
    if set(records) != {p['id'] for p in pieces}:
        raise ValueError('STEP missing source placements')
    path.with_suffix('.crosswalk.json').write_text(json.dumps(dict(sha256=sha, records=records, definitions=definitions,
                                                                   meshesExported=export_meshes), indent=2)+'\n')
    print(f'{len(records)}/{len(pieces)} source placements matched by definition and pose, '
          f'{sum(len(v["volumesMm3"]) for v in records.values())} positive-volume solids; STEP SHA-256 {sha}')
    if export_meshes:
        filename = 'demo-surface-fidelity.json' if demo else 'sample-surface-fidelity.json' if sample else 'surface-fidelity.json'
        (STAGING / filename).write_text(json.dumps({'stepSha256':sha,'definitions':fidelity},indent=2)+'\n')
        failures = [name for name,r in fidelity.items() if r['outsideSamples']]
        if failures:
            raise ValueError(f'Missing source surface landmarks: {failures}')
        print(f'{sum(r["samples"] for r in fidelity.values())} source vertex and triangle-centre checks passed at 0.1 mm')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument('--sample', action='store_true')
    selection.add_argument('--demo', action='store_true')
    parser.add_argument('--export-meshes', action='store_true')
    args = parser.parse_args()
    inspect(args.sample, args.export_meshes, args.demo)
