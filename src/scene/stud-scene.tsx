import { useEffect, useRef, useState } from 'react';
import { ArrowHelper, Box3, Color, DirectionalLight, DoubleSide, EdgesGeometry, Group, HemisphereLight, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, MeshBasicMaterial, OrthographicCamera, Raycaster, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer } from 'three';
import { viewportInset } from './viewport-inset.js';
import { xrManual,type XrStep } from './xr-manual.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Vec3 } from '../domain/schema.js';

type Props = {
    assemblyName?: string;
    url: string; target: string; start: Vec3; end: Vec3; focus: boolean;
    replay: number; reset: number; onPick: (id:string) => void;
    colors?:ReadonlyMap<string,string>; explode?:number; isolate?:boolean;
    idleAutoRotate?:boolean;
    highlight?:string;
    selectionActive?:boolean;
    replacementPreview?:boolean;
    offsets?:Readonly<Record<string,Vec3>>;
    removed?:ReadonlySet<string>;
    xrStep?:XrStep|undefined;
};

export function StudScene(props: Props) {
    const host = useRef<HTMLDivElement>(null);
    const latest = useRef(props);
    useEffect(() => { latest.current = props; }, [props]);
    const [error, setError] = useState(false);
    const [retry,setRetry]=useState(0);
    const [modes,setModes]=useState<XRSessionMode[]>([]),[xrError,setXrError]=useState('');
    const xr=useRef<ReturnType<typeof xrManual>|null>(null);
    useEffect(()=>{if(!window.isSecureContext || !navigator.xr)return;let live=true;
        Promise.all((['immersive-ar','immersive-vr'] as const).map(async mode=>await navigator.xr!.isSessionSupported(mode)?mode:null)).then(result=>{if(live)setModes(result.filter(m=>m!==null));}).catch(()=>{});
        return ()=>{live=false;};},[]);
    useEffect(() => {
        const el = host.current!;
        setError(false);
        let renderer: WebGLRenderer;
        try { renderer = new WebGLRenderer({ antialias: true,alpha:true }); }
        catch { setError(true); return; }
        const scene = new Scene();
        const display=new Group();scene.add(display);
        scene.background = new Color(0xe6e6e6);
        const camera = new OrthographicCamera(-1, 1, 1, -1, 0.0001, 2);
        const controls = new OrbitControls(camera, renderer.domElement);
        let viewChanged=true;
        controls.addEventListener('change',()=>{viewChanged=true;});
        controls.minZoom = 0.4;
        controls.maxZoom = 12;
        controls.autoRotate = false;
        controls.autoRotateSpeed = 1.5;
        let resumeRotation: ReturnType<typeof setTimeout> | undefined;
        let userInteracting = true;
        const enableRotation = () => {
            userInteracting = false;
            controls.autoRotate = (latest.current.idleAutoRotate ?? false)
                && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            resumeRotation = undefined;
        };
        const pauseForInteraction = () => {
            userInteracting = true;
            controls.autoRotate = false;
            if (resumeRotation) clearTimeout(resumeRotation);
        };
        const resumeAfterInteraction = () => {
            if (resumeRotation) clearTimeout(resumeRotation);
            resumeRotation = setTimeout(enableRotation, 2500);
        };
        resumeRotation = setTimeout(enableRotation, 2500);
        controls.addEventListener('start', pauseForInteraction);
        controls.addEventListener('end', resumeAfterInteraction);
        el.appendChild(renderer.domElement);
        scene.add(new HemisphereLight(0xffffff, 0x87959c, 2));
        const light = new DirectionalLight(0xffffff, 2);
        light.position.set(-1,2,1);
        scene.add(light);
        const neutral = new MeshStandardMaterial({ color: 0x838e94 });
        const colors:Record<string,number>={'Black':0x222527,'Dark Grey':0x565d62,'Light Grey':0xa5aaab,'White':0xe7e7df,'Lime Green':0x9ab928,'Green':0x1f9d55,'Red':0xc81e1e,'Transparent Red':0xcd3029,'Blue':0x195d99,'Beige':0xc9b68d,'Yellow':0xf5c518};
        const resolveColor = (value: string | undefined): number | null => {
            if (!value) return null;
            if (colors[value] !== undefined) return colors[value]!;
            if (/^#[0-9a-f]{6}$/i.test(value)) return Number.parseInt(value.slice(1), 16);
            return null;
        };
        const meshPoses=new Map<Mesh,{pose:Vector3; explode:Vector3;neutral:MeshStandardMaterial;center:Vector3}>();
        const inset=viewportInset();
        let hoverOutline:LineSegments<EdgesGeometry,LineBasicMaterial>|undefined;
        let selectedOutline:LineSegments<EdgesGeometry,LineBasicMaterial>|undefined;
        let selectedHatch:Mesh|undefined;
        const componentEdges=new Map<Mesh['geometry'],EdgesGeometry>();
        const componentOutlineMaterial=new LineBasicMaterial({color:0x172127});
        const selectedOutlineMaterial=new LineBasicMaterial({color:0xe3262e});
        const hatchMaterial=new ShaderMaterial({
            transparent:true,
            depthWrite:false,
            polygonOffset:true,
            polygonOffsetFactor:-1,
            polygonOffsetUnits:-1,
            side:DoubleSide,
            vertexShader:`void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
            fragmentShader:`precision highp float;
void main() {
    float spacing = 14.0;
    float rising = mod(gl_FragCoord.x + gl_FragCoord.y, spacing);
    float falling = mod(gl_FragCoord.x - gl_FragCoord.y, spacing);
    float stripeA = 1.0 - smoothstep(0.7, 1.7, min(rising, spacing - rising));
    float stripeB = 1.0 - smoothstep(0.7, 1.7, min(falling, spacing - falling));
    float ink = max(stripeA, stripeB * 0.8);
    if (ink < 0.02) discard;
    gl_FragColor = vec4(0.89, 0.035, 0.055, ink * 0.78);
}`,
        });
        let targetRadius=0.005;
        let model: Group | undefined, stud: Mesh | undefined, disposed = false;
        const installed = new Vector3(), center = new Vector3();
        const arrow = new ArrowHelper();
        arrow.setColor(0xb92324);
        arrow.visible = false;
        display.add(arrow);
        const ghostMaterial=new MeshBasicMaterial({color:0x172127,wireframe:true,transparent:true,opacity:0.16,depthWrite:false});
        let ghost:Mesh|undefined;
        xr.current=xrManual(renderer,scene,display,()=>latest.current.xrStep);
        const dropModel = (root: Group) => root.traverse(n => {
            if (n instanceof Mesh) {
                n.geometry.dispose();
                for (const m of Array.isArray(n.material) ? n.material : [n.material]) m.dispose();
            }
        });
        // Orthographic projection: world units map to the same number of pixels on every
        // axis, so the assembly is never foreshortened by depth. The frustum is the fit
        // quantity now — there is no FOV, and camera distance only has to clear clipping.
        let aspect = 1, fitRadius = 0.08;
        const assemblyCenter = new Vector3(0,0.012,0);
        let assemblyRadius = 0.08;
        const applyFrustum = () => {
            const halfHeight = fitRadius / Math.min(1, aspect);
            camera.left = -halfHeight * aspect;
            camera.right = halfHeight * aspect;
            camera.top = halfHeight;
            camera.bottom = -halfHeight;
            camera.updateProjectionMatrix();
        };
        const frameCamera = () => {
            const focused = latest.current.focus;
            const p=latest.current;
            const pivot = focused
                ? center.clone().addScaledVector(new Vector3(...p.start).add(new Vector3(...p.end)),0.0005)
                : assemblyCenter.clone();
            // Shift the assembly left on screen, leaving clear space for the overlaid
            // instruction card on the right. This is a view-space offset, not a model move.
            if (focused) pivot.add(new Vector3(-1,0,0.6).normalize().multiplyScalar(0.025));
            controls.target.copy(pivot);
            const halfStroke=new Vector3(...p.start).distanceTo(new Vector3(...p.end))*0.0005;
            // 0.125 m half-height reproduces the picker framing of the old 0.36 m @ 38° view;
            // 0.014 m is the floor that a 40 mm minimum camera distance used to give a small part.
            fitRadius = focused ? Math.max(0.014,1.45*(targetRadius+halfStroke)) : assemblyRadius;
            camera.zoom = 1;
            applyFrustum();
            // Keep the canopy-facing three-quarter view: a lower angle than the
            // isometric framing makes the nose and cockpit area easier to read.
            camera.position.copy(controls.target).add(new Vector3(-0.6,0.65,-1).normalize().multiplyScalar(0.4));
            controls.update();
        };
        new GLTFLoader().load(props.url, gltf => {
            if (disposed) { dropModel(gltf.scene); return; }
            model = gltf.scene;
            display.add(model);
            if (props.assemblyName && props.assemblyName !== 'helicopter') {
                const bounds = new Box3().setFromObject(model);
                bounds.getCenter(assemblyCenter);
                assemblyRadius = bounds.getSize(new Vector3()).length() / 2;
            }
            model.traverse(n => {
                if (!(n instanceof Mesh)) return;
                const original=n.material;
                const colour=latest.current.colors?.get(String(n.userData.instanceId));
                const hex = resolveColor(colour);
                const useAssetColor=props.assemblyName==='scanner' && original instanceof MeshStandardMaterial;
                n.material = useAssetColor ? original.clone() : hex !== null ? new MeshStandardMaterial({color:hex}) : neutral.clone();
                original.dispose();
                let edges=componentEdges.get(n.geometry);
                if(!edges) { edges=new EdgesGeometry(n.geometry,32); componentEdges.set(n.geometry,edges); }
                n.add(new LineSegments(edges,componentOutlineMaterial));
                const position = new Box3().setFromObject(n).getCenter(new Vector3());
                meshPoses.set(n,{pose:n.position.clone(),center:position.clone(),neutral:n.material,explode:position.sub(assemblyCenter).multiplyScalar(0.7)});
            });
            inset.frame(model);
        }, undefined, () => { if (!disposed) setError(true); });
        const resize = new ResizeObserver(() => {
            const w = el.clientWidth, h = el.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w,h,false);
            viewChanged=true;
            aspect = w/h;
            // Refit only the frustum: a resize keeps the operator's zoom, unlike frameCamera.
            applyFrustum();
        });
        resize.observe(el);
        let pointerOrigin: { x: number; y: number } | undefined;
        let pointerDragged = false;
        const pointerDown = (event: PointerEvent) => {
            pointerOrigin = { x: event.clientX, y: event.clientY };
            pointerDragged = false;
        };
        const pointerMove = (event: PointerEvent) => {
            if (!pointerOrigin || pointerDragged) return;
            pointerDragged = Math.hypot(event.clientX-pointerOrigin.x,event.clientY-pointerOrigin.y)>5;
        };
        const pick = (event: MouseEvent) => {
            if(pointerDragged) { pointerOrigin=undefined;pointerDragged=false;return; }
            pointerOrigin=undefined;
            if (!model) return;
            const rect = el.getBoundingClientRect(), ray = new Raycaster();
            ray.setFromCamera(new Vector2(2*(event.clientX-rect.left)/rect.width-1,1-2*(event.clientY-rect.top)/rect.height),camera);
            const object=ray.intersectObjects([...meshPoses.keys()].filter(n=>n.visible),false)[0]?.object;
            if(typeof object?.userData.instanceId==='string') latest.current.onPick(object.userData.instanceId);
        };
        el.addEventListener('pointerdown',pointerDown);
        el.addEventListener('pointermove',pointerMove);
        el.addEventListener('click',pick);
        let previous: Props | undefined, began = 0, lastTime=0;
        const a = new Vector3(), b = new Vector3(), displacement = new Vector3();
        renderer.setAnimationLoop((now: number) => {
            if (!model) return;
            const p = latest.current;
            const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!userInteracting) controls.autoRotate = (p.idleAutoRotate ?? false)
                && !reduced;
            controls.update();
            // A stationary repair page can contain over a million triangles. Redraw
            // when a control changes, a stroke/spin is active, or XR requests a frame.
            const playing=!reduced && (p.replacementPreview || (p.focus && lastTime<began+1200));
            if(previous===p && !viewChanged && !playing && !renderer.xr.isPresenting) return;
            if(previous?.target!==p.target || previous?.selectionActive!==p.selectionActive){
                selectedOutline?.removeFromParent();
                selectedOutline?.geometry.dispose();
                selectedOutline=undefined;
                selectedHatch?.removeFromParent();
                selectedHatch=undefined;
                stud=[...meshPoses.keys()].find(m=>m.userData.instanceId===p.target);
                if(!stud){setError(true);return;}
                renderer.domElement.dataset.activeInstance=p.target;
                installed.copy(meshPoses.get(stud)!.pose);center.copy(meshPoses.get(stud)!.center);
                targetRadius=new Box3().setFromObject(stud).getSize(new Vector3()).length()/2;
                if(p.selectionActive!==false){
                    selectedHatch=new Mesh(stud.geometry,hatchMaterial);
                    selectedHatch.renderOrder=1;
                    stud.add(selectedHatch);
                    selectedOutline=new LineSegments(new EdgesGeometry(stud.geometry,32),selectedOutlineMaterial);
                    selectedOutline.renderOrder=2;
                    stud.add(selectedOutline);
                }
                if(ghost) display.remove(ghost);ghost=new Mesh(stud.geometry,ghostMaterial);ghost.quaternion.copy(stud.quaternion);ghost.visible=false;display.add(ghost);
            }
            if(!stud)return;
            if (!previous || previous.reset !== p.reset || previous.focus !== p.focus || previous.start!==p.start || previous.end!==p.end) {frameCamera();xr.current?.recenter();}
            if (previous?.highlight !== p.highlight) {
                if (hoverOutline) {hoverOutline.removeFromParent();hoverOutline.geometry.dispose();hoverOutline.material.dispose();hoverOutline=undefined;}
                const hoveredMesh=[...meshPoses.keys()].find(m=>m.userData.instanceId===p.highlight);
                if (hoveredMesh) {
                    hoverOutline=new LineSegments(new EdgesGeometry(hoveredMesh.geometry,32),new LineBasicMaterial({color:0xffb000,linewidth:2}));
                    hoveredMesh.add(hoverOutline);
                }
            }
            if (previous?.start !== p.start || previous.end !== p.end || previous.replay !== p.replay) {
                began = now;
                a.fromArray(p.start).multiplyScalar(0.001);
                b.fromArray(p.end).multiplyScalar(0.001);
                const v = b.clone().sub(a);
                arrow.visible = v.lengthSq() > 0;
                if(ghost){ghost.visible=arrow.visible;ghost.position.copy(installed).add(a);}
                if (arrow.visible) {
                    arrow.position.copy(center).add(a).y += 0.005;
                    arrow.setDirection(v.clone().normalize());
                    arrow.setLength(v.length(),0.0015,0.001);
                }
            }
            if (previous?.colors !== p.colors) {
                for (const [mesh] of meshPoses) {
                    const hex = resolveColor(p.colors?.get(String(mesh.userData.instanceId)));
                    if (mesh.material instanceof MeshStandardMaterial && p.assemblyName!=='scanner') {
                        mesh.material.color.setHex(hex !== null ? hex : 0x838e94);
                    }
                }
            }
            if(previous?.explode!==p.explode || previous?.isolate!==p.isolate || previous?.offsets!==p.offsets || previous?.removed!==p.removed || !previous) {
                for(const [mesh,entry] of meshPoses) {
                    mesh.visible=!p.removed?.has(String(mesh.userData.instanceId)) && (!p.isolate || mesh===stud);
                    mesh.position.copy(entry.pose).addScaledVector(entry.explode,p.explode ?? 0);
                    const offset=p.offsets?.[String(mesh.userData.instanceId)];
                    if(offset) mesh.position.addScaledVector(new Vector3(...offset),0.001);
                }
            }
            previous = p;
            lastTime=now;
            viewChanged=false;
            const t = reduced ? 1 : Math.min(1,(now-began)/1200);
            stud.position.copy(installed).add(displacement.lerpVectors(a,b,t)).addScaledVector(meshPoses.get(stud)!.explode,p.explode ?? 0);
            xr.current?.update();
            if(p.replacementPreview) inset.drawReplacement(renderer,el.clientWidth,el.clientHeight,now,stud);
            else {
                renderer.render(scene,camera);
                if(p.focus) inset.draw(renderer,scene,camera,el.clientWidth,el.clientHeight);
            }
            if (!p.focus) {
                const ndc = displacement.copy(center).addScaledVector(meshPoses.get(stud)!.explode,p.explode ?? 0).project(camera);
                renderer.domElement.dataset.targetPoint = `${(ndc.x+1)/2},${(1-ndc.y)/2}`;
            }
        });
        return () => {
            disposed = true; resize.disconnect();
            el.removeEventListener('pointerdown',pointerDown);el.removeEventListener('pointermove',pointerMove);el.removeEventListener('click',pick);
            if (resumeRotation) clearTimeout(resumeRotation);
            controls.removeEventListener('start', pauseForInteraction);
            controls.removeEventListener('end', resumeAfterInteraction);
            renderer.setAnimationLoop(null); controls.dispose(); inset.dispose(); if (model) dropModel(model);
            xr.current?.dispose();xr.current=null;ghostMaterial.dispose();meshPoses.forEach(v=>v.neutral.dispose());
            componentEdges.forEach(edges=>edges.dispose());
            selectedOutline?.geometry.dispose();
            componentOutlineMaterial.dispose();selectedOutlineMaterial.dispose();hatchMaterial.dispose();
            arrow.dispose(); neutral.dispose(); renderer.dispose(); renderer.domElement.remove();
            hoverOutline?.geometry.dispose();hoverOutline?.material.dispose();
        };
    }, [props.url,retry]);
    return <div className="stud-scene" ref={host} aria-label={`${props.assemblyName ?? 'Helicopter'} with selected piece highlighted`}>
        {error && <p role="status">3D view unavailable. Follow the written direction and stop landmark. <button onClick={()=>setRetry(n=>n+1)}>Retry 3D view</button></p>}
        {props.focus && !props.replacementPreview && !error && <div className="scene-viewfinder" role="img" aria-label={`Full ${props.assemblyName ?? 'helicopter'} overview`} />}
        {props.focus && !error && <div className="scene-tools">
            {props.xrStep && modes.map(mode=><button key={mode} onClick={()=>{xr.current?.enter(mode).catch(()=>setXrError('Headset session unavailable. Continue on this screen.'));}}>Open {mode==='immersive-ar'?'AR':'VR'} twin</button>)}{xrError}</div>}
    </div>;
}
