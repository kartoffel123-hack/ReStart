"""Test a rigid coaxial twist-and-pull of L112 with the turntable on the bench."""

import json
import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
import trimesh
from OCP.BRepClass3d import BRepClass3d_SolidClassifier
from OCP.gp import gp_Pnt
from OCP.TopAbs import TopAbs_IN, TopAbs_ON, TopAbs_OUT

from tools.ct.facing_origin import reopen_step
from tools.ct.source import STAGING
from tools.ct.turntable_fit import installed, load_scoped_scene


def twisted(points, centre_yz, stroke, degrees):
    theta = np.deg2rad(degrees)[:, None]
    y, z = (points[:, 1:] - centre_yz).T
    c, s = np.cos(theta), np.sin(theta)
    return np.stack([np.broadcast_to(points[:, 0]+stroke, (len(theta), len(points))),
                     centre_yz[0]+c*y-s*z, centre_yz[1]+s*y+c*z], axis=-1)


def angular_margin(depths, radii, step_degrees):
    # Every angle is within half a sample step, including the wrap at 360°.
    # A point this far inside the closed solid cannot cross its boundary by
    # moving less than that distance. The witness may differ between samples.
    chord = 2*radii*np.sin(np.deg2rad(step_degrees)/4)
    return (depths-chord).max(axis=1)


def measure(directory):
    scope = json.loads(Path('data/review/4000041/demo-assembly.json').read_text())
    scene, digest = load_scoped_scene(directory)
    top_id, bottom_id = scope['gearTarget'], scope['turntableBottom']
    top, bottom = installed(scene, top_id), installed(scene, bottom_id)
    frames = [scene.graph[name][0] for name in (top_id, bottom_id)]
    centre = frames[1][1:3, 3]*1000
    if not bottom.is_volume or any(not np.allclose(f[:3, 1], [-1,0,0], atol=1e-5) for f in frames):
        raise ValueError('Expected a closed bottom on the assembly X bearing axis')
    if np.linalg.norm(frames[0][1:3, 3]*1000-centre) > .001:
        raise ValueError('Turntable axes are not concentric')

    # Source points are triangle centres on the actual installed top mesh.
    # Subsampling can miss a blocker but cannot manufacture a positive one.
    probes = top.triangles_center[::37]
    home = trimesh.proximity.signed_distance(bottom, probes)
    seated = int(home.argmax())
    free = probes[home < -.12]
    angles = np.arange(360.)
    results = []
    for stroke in (-2., 2.):
        shifted = trimesh.proximity.signed_distance(bottom, free+[stroke,0,0])
        candidates = np.flatnonzero(shifted > .18)
        if not len(candidates):
            raise ValueError(f'No clear-to-interfering witness for {stroke} mm')
        y, z = (free[candidates, 1:]-centre).T
        sectors = np.floor((np.arctan2(y,z)+np.pi)*8/np.pi)
        chosen = []
        for sector in np.unique(sectors):
            indices = candidates[sectors == sector]
            chosen.append(indices[np.argmax(shifted[indices])])
        points = free[chosen]
        poses = twisted(points, centre, stroke, angles)
        flat = poses.reshape(-1,3)
        depths = np.concatenate([trimesh.proximity.signed_distance(bottom, flat[i:i+256])
                                 for i in range(0,len(flat),256)]).reshape(len(angles),len(points))
        margin = angular_margin(depths, np.linalg.norm(points[:,1:]-centre,axis=1), 1.)
        if margin.min() <= 0:
            raise ValueError(f'No continuous interference certificate for {stroke} mm')
        angle = int(margin.argmin())
        index = depths[angle].argmax()
        results.append(dict(strokeXMm=stroke, stepDegrees=1, weakestAngleDegrees=angle,
                            weakestSampleHomeMm=points[index].tolist(), weakestSampleMovedMm=poses[angle,index].tolist(),
                            minimumSampledDepthMm=float(depths.max(axis=1).min()),
                            continuousLowerBoundMm=float(margin.min()), topPointsAtHomeMm=points.tolist()))
    return dict(geometrySha256=digest, top=top_id, bottom=bottom_id, axisCentreYZMm=centre.tolist(),
                seatedWitness=dict(topPointMm=probes[seated].tolist(), insideBottomMm=float(home[seated])),
                axialBarriers=results)


def confirm_step(result):
    step = STAGING/'fusion-demo.step'
    digest = hashlib.sha256(step.read_bytes()).hexdigest()
    if digest != '33be022914d8b8d0aeed30eb2810f4c429eb19c8d517933449f653fb14056f39':
        raise ValueError('Scoped STEP revision changed')
    targets = {('MRI:1','88738_raw.dat:1'):(result['top'],'88738_raw.dat'),
               ('MRI:1','18939.dat:1'):(result['bottom'],'18939.dat')}
    with TemporaryDirectory() as directory:
        parts = reopen_step(step,targets,Path(directory))
    top = BRepClass3d_SolidClassifier(parts[result['top']][2])
    bottom = BRepClass3d_SolidClassifier(parts[result['bottom']][2])

    def require_state(classifier, point, expected):
        classifier.Perform(gp_Pnt(*point),.0001)
        if classifier.State() != expected:
            raise ValueError(f'Independent STEP witness disagrees at {point}')

    seated = result['seatedWitness']['topPointMm']
    require_state(top,seated,TopAbs_ON)
    for point in twisted(np.array([seated]),np.array(result['axisCentreYZMm']),0,np.array([0,6]))[:,0]:
        require_state(bottom,point,TopAbs_IN)
    for barrier in result['axialBarriers']:
        require_state(top,barrier['weakestSampleHomeMm'],TopAbs_ON)
        require_state(bottom,barrier['weakestSampleHomeMm'],TopAbs_OUT)
        require_state(bottom,barrier['weakestSampleMovedMm'],TopAbs_IN)
    return dict(stepSha256=digest, seatedInterferenceDegrees=[0,6], axialWitnessesConfirmed=len(result['axialBarriers']))


if __name__ == '__main__':
    result = measure(Path('.staging/4000041/demo'))
    result['independentStepCheck'] = confirm_step(result)
    print(json.dumps(result, indent=2))
