"""Build candidate B-reps from measured planar faces, without filling bores by voxelizing.

Run with Python 3.12 and requirements-cad.txt after tools.ct.surfaces. The report
distinguishes CAD validity from review of mechanical fidelity; outputs are staging only.
"""

import argparse
import json
import math
from pathlib import Path
import subprocess
import sys

import numpy as np
import trimesh
from OCP.Bnd import Bnd_Box
from OCP.BOPAlgo import BOPAlgo_MakerVolume
from OCP.BRep import BRep_Builder
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeFace, BRepBuilderAPI_MakePolygon, BRepBuilderAPI_MakeShapeOnMesh, BRepBuilderAPI_Transform
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.BRepClass3d import BRepClass3d_SolidClassifier
from OCP.BRepGProp import BRepGProp
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.GProp import GProp_GProps
from OCP.gp import gp_Pnt, gp_Trsf
from OCP.IFSelect import IFSelect_RetDone
from OCP.RWStl import RWStl
from OCP.ShapeUpgrade import ShapeUpgrade_UnifySameDomain
from OCP.STEPControl import STEPControl_AsIs, STEPControl_Writer
from OCP.StlAPI import StlAPI_Writer
from OCP.TopAbs import TopAbs_IN, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopoDS import TopoDS_Compound

from tools.ct.source import STAGING, LIBRARY, Definitions, placement
from tools.ct.surfaces import Surfaces, write_stl
from tools.ct.fidelity import uncovered


def bounds(shape):
    box = Bnd_Box()
    BRepBndLib.AddOptimal_s(shape, box, False, False)
    return np.array([box.CornerMin().Coord(), box.CornerMax().Coord()])


def interior_point(cell, mass):
    classifier = BRepClass3d_SolidClassifier(cell)
    low, high = bounds(cell)
    random = np.random.default_rng(42)
    for i in range(4000):
        p = mass.CentreOfMass() if i == 0 else gp_Pnt(*random.uniform(low, high))
        classifier.Perform(p, 1e-7)
        if classifier.State() == TopAbs_IN:
            return np.array(p.Coord())
    raise ValueError('No interior witness for cell')


def winding(triangles, point):
    # Signed solid angle distinguishes the plastic around a bore from its air cell.
    a, b, c = (triangles-point).transpose((1, 0, 2))
    la, lb, lc = (np.linalg.norm(v, axis=1) for v in (a, b, c))
    numerator = np.sum(a*np.cross(b, c), axis=1)
    denom = la*lb*lc + np.sum(a*b, axis=1)*lc + np.sum(b*c, axis=1)*la + np.sum(c*a, axis=1)*lb
    return np.arctan2(numerator, denom).sum() / (2*math.pi)


def reconstruct(mesh):
    maker = BOPAlgo_MakerVolume()
    maker.SetFuzzyValue(.001)  # millimetres; accommodates LDraw's rounded primitive vertices
    maker.SetRunParallel(True)
    maker.SetAvoidInternalShapes(True)
    for tri in mesh.triangles[mesh.nondegenerate_faces()]:
        polygon = BRepBuilderAPI_MakePolygon(*[gp_Pnt(*p) for p in tri], True)
        face = BRepBuilderAPI_MakeFace(polygon.Wire())
        if not face.IsDone():
            raise ValueError('Source triangle is not a planar face')
        maker.AddArgument(face.Face())
    return material_cells(maker, mesh)


def material_cells(maker, mesh):
    maker.Perform()
    if maker.HasErrors():
        raise ValueError('Could not intersect source faces')
    solids = TopExp_Explorer(maker.Shape(), TopAbs_SOLID)
    result = TopoDS_Compound()
    builder = BRep_Builder()
    builder.MakeCompound(result)
    volumes = []
    while solids.More():
        cell = solids.Current()
        solids.Next()
        mass = GProp_GProps()
        BRepGProp.VolumeProperties_s(cell, mass)
        if mass.Mass() < 1e-6:
            continue
        occupancy = abs(winding(mesh.triangles, interior_point(cell, mass)))
        if .4 <= occupancy <= .6:
            raise ValueError(f'Ambiguous material winding {occupancy:.3f}')
        if occupancy < .4:
            continue
        unify = ShapeUpgrade_UnifySameDomain(cell, True, True, False)
        unify.Build()
        solid = unify.Shape()
        if not BRepCheck_Analyzer(solid).IsValid():
            raise ValueError('Invalid solid after merging coplanar faces')
        builder.Add(result, solid)
        volumes.append(mass.Mass())
    if not volumes:
        raise ValueError('No enclosed material cells')
    deviation = float(np.abs(bounds(result)-mesh.bounds).max())
    if deviation > .1:
        raise ValueError(f'Missing outer geometry: bounds differ by {deviation:.4f} mm')
    return result, dict(volumesMm3=volumes, boundsErrorMm=deviation)


def reconstruct_open_surface(path, dest):
    """Approximate a broken surface for CAD inspection. Never evidence for tool clearance."""
    path_out = dest / path.name
    for voxel in (.12, .08, .06, .04):
        max_error = min(.06, voxel*.42)
        subprocess.run([sys.executable, '-B', '-m', 'tools.ct.resample', str(path), str(path_out),
                        str(voxel), str(max_error)], check=True)
        mesh = trimesh.load_mesh(path_out)
        if mesh.is_volume and uncovered(path,path_out)['maxUncoveredMm'] <= .1:
            break
    else:
        raise ValueError('Could not retain all measured surface landmarks in a closed, oriented volume')
    triangulated = BRepBuilderAPI_MakeShapeOnMesh(RWStl.ReadFile_s(str(path_out)))
    triangulated.Build()
    maker = BOPAlgo_MakerVolume()
    maker.AddArgument(triangulated.Shape())
    maker.SetIntersect(False)
    maker.SetAvoidInternalShapes(True)
    solid, stats = material_cells(maker, mesh)
    original = trimesh.load_mesh(path)
    deviation = float(np.abs(bounds(solid)-original.bounds).max())
    if deviation > .1:
        raise ValueError(f'Rebuilt extents differ from source by {deviation:.4f} mm')
    return solid, {**stats, 'boundsErrorMm': deviation, 'method': 'resampled', 'voxelMm': voxel,
                   'decimationMm': max_error, 'mechanicalReviewRequired': True}


def posed_bodies(name, dest, library):
    """Keep independently posed minifigure limbs as bodies of one selectable article."""
    definitions = Definitions(library)
    surfaces = Surfaces(definitions)
    cache = {}
    result = TopoDS_Compound()
    builder = BRep_Builder()
    builder.MakeCompound(result)
    bodies = []
    for line in definitions.get(name):
        if not line.startswith('1 '):
            continue
        ref, _, matrix = placement(line)
        if ref not in cache:
            directory = dest / 'limbs'
            directory.mkdir(exist_ok=True)
            source = directory / (ref+'.stl')
            write_stl(surfaces.mesh(ref),source)
            shape, stats = reconstruct_open_surface(source,dest)
            cache[ref] = shape, stats
        shape, stats = cache[ref]
        t = gp_Trsf()
        signs = np.diag([1,-1,-1])
        transform = np.column_stack((signs @ np.array(matrix[3:]).reshape(3,3) @ signs, signs @ matrix[:3] * .4))
        t.SetValues(*transform.flatten())
        builder.Add(result,BRepBuilderAPI_Transform(shape,t,True).Shape())
        bodies.append({'ref':ref,**stats})
    return result, dict(method='posed-bodies',bodies=bodies,mechanicalReviewRequired=True,
                        volumesMm3=[v for b in bodies for v in b['volumesMm3']])


def build(names, repair_open=False, repair_export=False, library=LIBRARY):
    source = STAGING / 'surfaces'
    dest = STAGING / 'solids'
    dest.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((source / 'index.json').read_text())
    report = {}
    if repair_export:
        if names:
            raise ValueError('Use either a sample list or the full exported worklist')
        fidelity = json.loads((STAGING / 'surface-fidelity.json').read_text())
        crosswalk = json.loads((STAGING / 'fusion-4000041.crosswalk.json').read_text())
        if fidelity['stepSha256'] != crosswalk['sha256'] or set(fidelity['definitions']) != set(manifest):
            raise ValueError('Stale or incomplete fidelity report')
        report = json.loads((dest / 'index.json').read_text())
        work = [n for n, r in fidelity['definitions'].items() if r['outsideSamples']]
    else:
        work = names or sorted(manifest)
    for name in work:
        filename = manifest[name]['file']
        path = dest / Path(filename).with_suffix('.step')
        try:
            try:
                solid, stats = reconstruct(trimesh.load_mesh(source / filename))
                # The rope can lose its entire middle and still pass bounds and
                # positive volume. Test the actual CAD surface before accepting.
                preview = dest / 'cad-check.stl'
                BRepMesh_IncrementalMesh(solid, .12, False, .4, True)
                writer = StlAPI_Writer()
                writer.ASCIIMode = False
                if not writer.Write(solid, str(preview)):
                    raise ValueError('Cannot tessellate the reconstructed solid')
                check = uncovered(source / filename, preview)
                if check['outsideSamples']:
                    raise ValueError(f'Source surface missing by {check["maxUncoveredMm"]:.3f} mm')
                stats['method'] = 'planar-cells'
            except ValueError as error:
                if not repair_open:
                    raise
                if name in ('3815c01.dat copy','bl_973pb4354c01.dat copy'):
                    solid, stats = posed_bodies(name,dest,library)
                else:
                    solid, stats = reconstruct_open_surface(source / filename, dest)
                stats['originalIssue'] = str(error)
            writer = STEPControl_Writer()
            if writer.Transfer(solid, STEPControl_AsIs) != IFSelect_RetDone or writer.Write(str(path)) != IFSelect_RetDone:
                raise ValueError('STEP writer failed')
            report[name] = dict(file=path.name, **stats)
        except (ValueError, RuntimeError) as error:
            report[name] = dict(error=str(error))
        print(name, report[name], flush=True)
    log = 'sample.json' if names else 'index.json'
    (dest / log).write_text(json.dumps(report, indent=2) + '\n')
    return all('file' in r for r in report.values())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('names', nargs='*')
    parser.add_argument('--repair-open', action='store_true', help='Try a labelled resampled candidate for incomplete solids')
    parser.add_argument('--repair-export', action='store_true', help='Correct definitions rejected by the independent Fusion surface check')
    parser.add_argument('--library', type=Path, default=LIBRARY)
    args = parser.parse_args()
    raise SystemExit(0 if build(args.names, args.repair_open, args.repair_export, args.library) else 1)
