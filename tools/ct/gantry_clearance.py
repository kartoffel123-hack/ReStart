"""Check the buried crown-brick route against every occurrence in the serialized GLB.

For a vertical lift, on each overlapping XZ triangle footprint the difference
in the two face heights is affine. Its maximum is at a polygon vertex. This
checks the full column, including the inverse insertion, between waypoints.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import shapely
import trimesh


def bounds(triangles):
    return np.array([triangles.min(axis=(0,1)),triangles.max(axis=(0,1))])


class Scene:
    def __init__(self, path):
        glb = trimesh.load_scene(path,process=False)
        self.triangles, self.boxes, self.projected = {}, {}, {}
        for name in glb.graph.nodes_geometry:
            frame, geometry = glb.graph[name]
            triangles = glb.geometry[geometry].triangles
            self.add(name, (triangles @ frame[:3,:3].T + frame[:3,3])*1000)
        if len(self.boxes)!=566:
            raise ValueError('Incomplete CT obstacle scene')

    def add(self, name, triangles):
        self.triangles[name] = triangles
        self.boxes[name] = bounds(triangles)

    def projection(self, name):
        if name not in self.projected:
            mesh = self.triangles[name]
            normal = np.cross(mesh[:,1]-mesh[:,0],mesh[:,2]-mesh[:,0])
            use = np.abs(normal[:,1])>1e-8
            normal, mesh = normal[use], mesh[use]
            slope = -normal[:,[0,2]]/normal[:,1,None]
            intercept = mesh[:,0,1]-np.sum(slope*mesh[:,0,[0,2]],axis=1)
            polygons = shapely.polygons(mesh[:,:,[0,2]])
            self.projected[name] = polygons,slope,intercept,shapely.STRtree(polygons)
        return self.projected[name]

    def column(self, moving, fixed, seat_layer=False):
        p,slope,a,_ = self.projection(moving)
        q,other,b,index = self.projection(fixed)
        i,j = index.query(p,predicate='intersects')
        if not len(i):
            return 0., None
        overlap = shapely.intersection(p[i],q[j])
        # Numerical edge contact is permitted within 0.01 mm of a projected
        # triangle boundary. Evaluate the original vertices for every retained
        # footprint, without shrinking the measured depths.
        mask = ~shapely.is_empty(shapely.buffer(overlap,-.01,quad_segs=1))
        if not mask.any():
            return 0., None
        i,j = i[mask],j[mask]
        points,owner = shapely.get_coordinates(overlap[mask],return_index=True)
        bottom = np.sum(slope[i[owner]]*points,axis=1)+a[i[owner]]
        top = np.sum(other[j[owner]]*points,axis=1)+b[j[owner]]
        if seat_layer and np.any((top-bottom>.012) & ((top<89.59)|(top>91.21))):
            raise ValueError(f'Contact outside nominal stud-seat layer: {moving} against {fixed}')
        k = np.argmax(top-bottom)
        return float(top[k]-bottom[k]), [float(points[k,0]),float(top[k]),float(points[k,1])]

    def highest_under_pad(self, name, pad):
        polygons,slope,intercept,index = self.projection(name)
        indices = index.query(pad,predicate='intersects')
        if not len(indices):
            return -np.inf
        points,owner = shapely.get_coordinates(shapely.intersection(polygons[indices],pad),return_index=True)
        return (np.sum(points*slope[indices[owner]],axis=1)+intercept[indices[owner]]).max()


def verify(path, recipe):
    scene = Scene(path)
    groups = recipe['groups']
    brick = recipe['target']
    tool = recipe['separator']
    caps = {p for group in groups for p in group['members']}
    required = caps | {brick,tool,recipe['support']}
    if len(caps)!=10 or not required.issubset(scene.boxes):
        raise ValueError('Missing or duplicated access member')
    # The loose separator's two sockets are at local X = ±4 mm, Y = −6.4.
    # Undo its source placement (identity apart from ~1 μrad of yaw) exactly.
    glb = trimesh.load_scene(path,process=False)
    _,definition = glb.graph[tool]
    rotation = np.array([[0,0,1],[0,1,0],[-1,0,0]])
    origin = np.array(recipe['toolOriginMm'])
    placed_tool = 'separator-on-middle-studs'
    scene.add(placed_tool,glb.geometry[definition].triangles*1000 @ rotation.T+origin)
    target_box = scene.boxes[brick]
    if np.max(np.abs(origin[[0,2]]-target_box.mean(axis=0)[[0,2]]))>.02 or abs(origin[1]-6.4-(target_box[1,1]-1.6))>.02:
        raise ValueError('Separator sockets are not registered to the middle studs')
    fit,_ = scene.column(placed_tool,brick)
    if fit>.06:
        raise ValueError(f'Separator does not seat: {fit:.3f} mm')
    work = [*groups,{'key':'brick','members':[brick],'trayZ':recipe['brickTrayZ']}]
    parked, paths, blocked, contacts = {}, {}, {}, []
    for group in work:
        key,members = group['key'],group['members']
        moving = set(members)
        pads=[]
        if key=='brick':
            moving.add(placed_tool)
        else:
            # Two finger pads approach vertically from above the two opposed
            # outer lips. The proven space is not evidence of human pinch force.
            x = group['padX']; region = np.stack([scene.boxes[n] for n in members]);
            zmin,zmax = region[:,0,2].min(),region[:,1,2].max()
            for za,zb in [(zmin-6,zmin-.02),(zmax+.02,zmax+6)]:
                pad = shapely.box(x-3,za,x+3,zb)
                pads.append(np.array([[x-3,89.75,za],[x+3,101.75,zb]]))
                # The tool must actually reach the moving material, not just
                # have an empty column nearby. Check the two opposite lips.
                contact_z=zmin if zb<zmin else zmax
                lip=shapely.box(x-3,contact_z-.15,x+3,contact_z+.15)
                if max(scene.highest_under_pad(n,lip) for n in moving)<91.0:
                    raise ValueError(f'{key}: missing opposed grip lip at {x},{contact_z}')
                for n,box in scene.boxes.items():
                    if n in moving or n in parked or n in (tool,placed_tool) or box[1,1]<89.75:
                        continue
                    if box[1,0]<x-3 or box[0,0]>x+3 or box[1,2]<za or box[0,2]>zb:
                        continue
                    if scene.highest_under_pad(n,pad)>=89.75:
                        raise ValueError(f'{key}: finger approach blocked by {n}')
        min_y=min(scene.boxes[n][0,1] for n in moving)
        home=np.zeros(3); up=np.array([0.,recipe['liftMm'],0.]); across=up+[0,0,group['trayZ']]
        down=np.array([0.,recipe['benchY']-min_y,group['trayZ']]); paths[key]=[v.tolist() for v in (home,up,across,down)]
        for pad in pads:
            for start,end in ((up,across),(across,down)):
                low=pad[0]+np.minimum(start,end); high=pad[1]+np.maximum(start,end)
                for fixed,installed in scene.boxes.items():
                    if fixed in moving or fixed in (tool,placed_tool): continue
                    other=installed+parked.get(fixed,home)
                    if np.min(np.minimum(high,other[1])-np.maximum(low,other[0]))>.01:
                        raise ValueError(f'{key}: finger transfer overlaps {fixed}')
        for n in moving:
            box=scene.boxes[n]
            for fixed,installed in scene.boxes.items():
                if fixed in moving or fixed==placed_tool or (fixed==tool and key=='brick'):
                    continue
                other=installed+parked.get(fixed,home)
                for leg,(start,end) in enumerate(zip((home,up,across),(up,across,down))):
                    low=box[0]+np.minimum(start,end); high=box[1]+np.maximum(start,end)
                    if np.min(np.minimum(high,other[1])-np.maximum(low,other[0]))<.01:
                        continue
                    if leg!=0 or fixed in parked:
                        raise ValueError(f'{key}: bench transfer {leg} of {n} overlaps {fixed}')
                    permitted={("4000041/L292","4000041/L262"),("4000041/L293","4000041/L263")}
                    depth,point=scene.column(n,fixed,(n,fixed) in permitted)
                    if depth>.012:
                        # The two resampled wide slopes meet a stud-top plane
                        # 0.04 mm below nominal. Limit the allowance to that face.
                        if (n,fixed) not in permitted or depth>.055 or abs(point[1]-91.2)>.01:
                            raise ValueError(f'{key}: {n} cannot lift past {fixed}: {depth:.3f} mm at {point}')
                        contacts.append({'moving':n,'fixed':fixed,'depthMm':round(depth,4),'witnessMm':point})
        for n in members:
            parked[n]=down
    # Counterexamples under the installed model distinguish a body blocker
    # from a part that blocks the tool only. Reverse transfers traverse the
    # same geometry in reverse order with the matching spare in the same slot.
    for label,mover,blocker in [('brick','4000041/L201','4000041/L208'),('tool',placed_tool,'4000041/L254')]:
        depth,point=scene.column(mover,blocker)
        if depth<3:
            raise ValueError(f'Missing expected {label} access witness')
        blocked[label]={'blocker':blocker,'depthMm':round(depth,3),'pointMm':point}
    return {'paths':paths,'initialBlockers':blocked,'contacts':contacts,'gripVerifiedOnKit':False}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('glb',type=Path)
    args=parser.parse_args()
    print(json.dumps(verify(args.glb,json.loads(Path('data/review/4000041/gantry-brick.json').read_text()))))
