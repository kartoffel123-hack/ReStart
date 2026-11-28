"""Compare installed facing overlap directly from Studio faces and a reopened STEP."""

import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory

import manifold3d as md
import numpy as np
import trimesh

from tools.ct.check_step import (BRepMesh_IncrementalMesh, IFSelect_RetDone, STEPCAFControl_Reader,
                                 StlAPI_Writer, TCollection_ExtendedString, TDF_Label, TDF_LabelSequence,
                                 TDocStd_Document, XCAFDoc_DocumentTool, label_name)
from tools.ct.source import LIBRARY, STAGING, checked_definitions, load_source
from tools.ct.surfaces import Surfaces
from tools.ct.blocker_fit import checked


def crossings(triangles, axis, low, spacing, counts):
    """All surface heights on each midpoint ray; no meshing or hole filling."""
    hits = [[] for _ in range(int(np.prod(counts)))]
    for tri in triangles:
        uv = np.delete(tri, axis, axis=1)
        ab, ac = uv[1:] - uv[0]
        det = ab[0]*ac[1] - ab[1]*ac[0]
        if abs(det) < 1e-12:
            continue
        first = np.maximum(0, np.ceil((uv.min(axis=0)-low)/spacing-.5-1e-9).astype(int))
        last = np.minimum(counts-1, np.floor((uv.max(axis=0)-low)/spacing-.5+1e-9).astype(int))
        if np.any(first > last):
            continue
        i, j = np.mgrid[first[0]:last[0]+1, first[1]:last[1]+1]
        u = low[0]+(i+.5)*spacing[0]-uv[0,0]
        v = low[1]+(j+.5)*spacing[1]-uv[0,1]
        s, t = (u*ac[1]-v*ac[0])/det, (v*ab[0]-u*ab[1])/det
        use = (s>=-1e-9) & (t>=-1e-9) & (s+t<=1+1e-9)
        heights = tri[0,axis] + s[use]*(tri[1,axis]-tri[0,axis]) + t[use]*(tri[2,axis]-tri[0,axis])
        for index, height in zip(i[use]*counts[1]+j[use], heights):
            hits[index].append(round(float(height), 8))
    return hits


def section_volume(a, b, axis, pitch):
    low = np.maximum(a.min(axis=(0,1)), b.min(axis=(0,1)))
    high = np.minimum(a.max(axis=(0,1)), b.max(axis=(0,1)))
    span = high-low
    result = dict(mm3=0., oddRays=0, oddRayCapacityMm3=0.)
    if np.any(span <= 0):
        return result
    size = np.delete(span, axis)
    counts = np.ceil(size/pitch).astype(int)
    spacing = size/counts
    area = np.prod(spacing)
    columns = [crossings(mesh, axis, np.delete(low,axis), spacing, counts) for mesh in (a,b)]
    for hits_a, hits_b in zip(*columns):
        if not hits_a or not hits_b:
            continue
        x, y = sorted(set(hits_a)), sorted(set(hits_b))
        if len(x)%2 or len(y)%2:
            result['oddRays'] += 1
            result['oddRayCapacityMm3'] += area*span[axis]
            continue
        for start,end in zip(x[::2],x[1::2]):
            for other_start,other_end in zip(y[::2],y[1::2]):
                result['mm3'] += area * max(0., min(end,other_end)-max(start,other_start))
    return result


def directional_vote(a, b, pitch):
    """Six independent outside-to-point parity tests per cell and occurrence.

    A missing wall makes the votes from opposite ends of a column disagree;
    do not discard that sample or count a tie as known material.
    """
    low = np.maximum(a.min(axis=(0,1)), b.min(axis=(0,1)))
    high = np.minimum(a.max(axis=(0,1)), b.max(axis=(0,1)))
    count = np.ceil((high-low)/pitch).astype(int)
    spacing = (high-low)/count
    votes = []
    for triangles in (a, b):
        inside = np.zeros(count, dtype=np.uint8)
        for axis in range(3):
            mid = low[axis]+(np.arange(count[axis])+.5)*spacing[axis]
            columns = crossings(triangles, axis, np.delete(low,axis), np.delete(spacing,axis), np.delete(count,axis))
            view = np.moveaxis(inside,axis,-1)
            for idx, heights in enumerate(columns):
                if heights:
                    ordered = sorted(set(heights))
                    rank = np.searchsorted(ordered,mid)
                    view[np.unravel_index(idx, view.shape[:2])] += ((rank%2)+((len(ordered)-rank)%2)).astype(np.uint8)
        votes.append(inside)
    common = np.minimum(*votes)
    volume = spacing.prod()
    return dict(pitchMm=pitch, unanimousMm3=np.sum(common==6)*volume,
                majorityMm3=np.sum(common>=4)*volume, tiesMm3=np.sum(common==3)*volume)


def reopen_step(path, targets, directory):
    doc = TDocStd_Document(TCollection_ExtendedString('MDTV-XCAF'))
    reader = STEPCAFControl_Reader()
    if reader.ReadFile(str(path)) != IFSelect_RetDone or not reader.Transfer(doc):
        raise ValueError('Cannot reopen scoped STEP')
    shapes = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())
    roots = TDF_LabelSequence()
    shapes.GetFreeShapes(roots)
    if roots.Length() != 1:
        raise ValueError('Expected one STEP assembly root')
    found = {}

    def walk(label, prefix, parent):
        children = TDF_LabelSequence()
        shapes.GetComponents_s(label, children)
        for index in range(1, children.Length()+1):
            occurrence = children.Value(index)
            loc = prefix + (label_name(occurrence),)
            definition = TDF_Label()
            if not shapes.GetReferredShape_s(occurrence, definition):
                raise ValueError(f'Unresolved STEP path {loc}')
            transform = shapes.GetLocation_s(occurrence).Transformation()
            frame = np.eye(4)
            frame[:3] = [[transform.Value(i,j) for j in range(1,5)] for i in range(1,4)]
            world = parent @ frame
            if loc in targets:
                locator, ref = targets[loc]
                if label_name(definition) != ref or locator in found:
                    raise ValueError(f'Unexpected or duplicate definition: {loc}')
                shape = shapes.GetShape_s(definition)
                mesh_file = directory/f'{locator.split("/")[-1]}.stl'
                mesher = BRepMesh_IncrementalMesh(shape, .12, False, .4, True)
                writer = StlAPI_Writer()
                writer.ASCIIMode = False
                if not mesher.IsDone() or not writer.Write(shape, str(mesh_file)):
                    raise ValueError(f'Failed to tessellate {loc}')
                found[locator] = (world,trimesh.load_mesh(mesh_file))
            elif shapes.IsAssembly_s(definition):
                walk(definition,loc,world)

    walk(roots.Value(1), (), np.eye(4))
    if len(found) != len(targets):
        raise ValueError('Missing facing or slope in STEP')
    return found


def measure():
    source = load_source()
    defs = checked_definitions(LIBRARY, source['pieces'])
    surfaces = Surfaces(defs)
    targets = {('MRI:1','24599.dat:8'):('4000041/L129','24599.dat'),
               ('MRI:1','28192.dat:7'):('4000041/L300','28192.dat')}
    path = STAGING/'fusion-demo.step'
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != '33be022914d8b8d0aeed30eb2810f4c429eb19c8d517933449f653fb14056f39':
        raise ValueError('Unexpected scoped STEP revision')
    with TemporaryDirectory() as temp:
        step = reopen_step(path, targets, Path(temp))
    signs = np.diag([1.,-1.,-1.])
    source_faces, step_solids, occurrences = [], [], {}
    for loc, (locator, ref) in targets.items():
        p, = [p for p in source['pieces'] if p['id']==locator and p['ref']==ref]
        frame = np.eye(4)
        frame[:3,:3] = signs @ np.array(p['basis']).reshape(3,3) @ signs
        frame[:3,3] = .4*signs @ p['origin']
        raw = np.array([points for _,points in surfaces.mesh(ref)])
        local = .4*raw @ signs
        source_faces.append(local @ frame[:3,:3].T + frame[:3,3])
        world, mesh = step[locator]
        # Compare actual local surface landmarks in both directions. Bound memory
        # by querying batches against the smaller, independent source soup.
        raw_mesh = trimesh.Trimesh(local.reshape(-1,3), np.arange(local.size//3).reshape(-1,3))
        def distance_samples(a,b):
            pts = np.vstack([a.vertices, a.triangles_center])
            distances = np.concatenate([b.nearest.on_surface(pts[i:i+1000])[1] for i in range(0,len(pts),1000)])
            return dict(maxMm=distances.max(),p95Mm=np.quantile(distances,.95))
        occurrences[locator] = dict(path=loc, ref=ref, sourceFrame=frame.tolist(), stepFrame=world.tolist(),
            maxPoseDisplacementMm=np.linalg.norm(local.reshape(-1,3) @ (frame-world)[:3,:3].T + (frame-world)[:3,3], axis=1).max(),
            sourceToStep=distance_samples(raw_mesh,mesh), stepToSource=distance_samples(mesh,raw_mesh))
        mesh.apply_transform(world)
        if not mesh.is_volume:
            raise ValueError(f'Expected closed STEP mesh for {locator}')
        step_solids.append(checked(md.Manifold(md.Mesh64(np.array(mesh.vertices), np.asarray(mesh.faces,dtype=np.uint64)))))
    return dict(sourceSha256=source['sourceSha256'],stepSha256=digest,occurrences=occurrences,
                sourceSections={pitch:[section_volume(*source_faces,axis,pitch) for axis in range(3)] for pitch in (.1,.05,.025)},
                sourceVotes=[directional_vote(*source_faces,pitch) for pitch in (.1,.05)],
                stepOverlapMm3=checked(step_solids[0]^step_solids[1]).volume())


if __name__ == '__main__':
    print(json.dumps(measure(), indent=2))
