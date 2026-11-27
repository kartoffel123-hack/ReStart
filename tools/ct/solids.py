"""Build candidate B-reps from measured planar faces, without filling bores by voxelizing.

Run with Python 3.12 and requirements-cad.txt after tools.ct.surfaces. The report
distinguishes CAD validity from review of mechanical fidelity; outputs are staging only.
"""

import argparse
import json
import math
from pathlib import Path

import numpy as np
import trimesh
from OCP.Bnd import Bnd_Box
from OCP.BOPAlgo import BOPAlgo_MakerVolume
from OCP.BRep import BRep_Builder
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeFace, BRepBuilderAPI_MakePolygon
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.BRepClass3d import BRepClass3d_SolidClassifier
from OCP.BRepGProp import BRepGProp
from OCP.GProp import GProp_GProps
from OCP.gp import gp_Pnt
from OCP.IFSelect import IFSelect_RetDone
from OCP.ShapeUpgrade import ShapeUpgrade_UnifySameDomain
from OCP.STEPControl import STEPControl_AsIs, STEPControl_Writer
from OCP.TopAbs import TopAbs_IN, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopoDS import TopoDS_Compound

from tools.ct.source import STAGING


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


def build(names):
    source = STAGING / 'surfaces'
    dest = STAGING / 'solids'
    dest.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((source / 'index.json').read_text())
    report = {}
    for name in names or sorted(manifest):
        filename = manifest[name]['file']
        path = dest / Path(filename).with_suffix('.step')
        try:
            solid, stats = reconstruct(trimesh.load_mesh(source / filename))
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
    raise SystemExit(0 if build(parser.parse_args().names) else 1)
