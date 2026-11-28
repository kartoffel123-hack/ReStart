"""Find missing geometry inside an otherwise correct occurrence bounding box."""

import json

import numpy as np
import trimesh
import vtk
from vtk.util.numpy_support import numpy_to_vtk, vtk_to_numpy

from tools.ct.source import STAGING


def uncovered(source, candidate, inside_solid=None):
    original = trimesh.load_mesh(source)
    points = np.vstack((original.vertices, original.triangles_center))
    reader = vtk.vtkSTLReader()
    reader.SetFileName(str(candidate))
    reader.Update()
    distance = vtk.vtkImplicitPolyDataDistance()
    distance.SetInput(reader.GetOutput())
    result = vtk.vtkDoubleArray()
    distance.EvaluateFunction(numpy_to_vtk(points), result)
    offsets = vtk_to_numpy(result).reshape(-1)
    # STEP exporters may split tiny shells or emit an internal face with
    # reversed tessellation winding. Verify suspected omissions against the
    # actual solids when they are available; proximity sign is only a screen.
    inside = 0
    if inside_solid is not None:
        for i in np.flatnonzero(offsets > .1):
            if inside_solid(points[i]):
                offsets[i] = 0.
                inside += 1
    # Positive distances are outside the solid. Internal visual faces between
    # joined LDraw primitives may legitimately have no corresponding B-rep face.
    i = int(np.argmax(offsets))
    return dict(maxUncoveredMm=max(0., float(offsets[i])), outsideSamples=int((offsets > .1).sum()),
                samples=len(points), witnessMm=list(points[i]), insideSolidWitnesses=inside)


def main():
    source = json.loads((STAGING / 'surfaces/index.json').read_text())
    crosswalk = json.loads((STAGING / 'fusion-4000041.crosswalk.json').read_text())
    report = {}
    for name, info in crosswalk['definitions'].items():
        r = uncovered(STAGING / 'surfaces' / source[name]['file'], STAGING / 'step-meshes' / info['file'])
        report[name] = r
        if r['outsideSamples']:
            print(f'{name}: {r["outsideSamples"]}/{r["samples"]} outside by >0.1 mm, worst {r["maxUncoveredMm"]:.3f} mm', flush=True)
    (STAGING / 'surface-screen.json').write_text(json.dumps({'stepSha256':crosswalk['sha256'],'definitions':report}, indent=2)+'\n')
    return all(r['outsideSamples'] == 0 for r in report.values())


if __name__ == '__main__':
    raise SystemExit(0 if main() else 1)
