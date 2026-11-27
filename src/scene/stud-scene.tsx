import { useEffect, useRef, useState } from 'react';
import { ArrowHelper, Box3, Color, DirectionalLight, DoubleSide, EdgesGeometry, Group, HemisphereLight, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, MeshBasicMaterial, Object3D, OrthographicCamera, Raycaster, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer } from 'three';
import { partInset } from './part-inset.js';
import { xrManual,type XrStep } from './xr-manual.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Vec3 } from '../domain/schema.js';

type Props = {
    url: string; target: string; start: Vec3; end: Vec3; focus: boolean;
    replay: number; reset: number; onPick: (id:string) => void;
    colors?:ReadonlyMap<string,string>; explode?:number; isolate?:boolean;
    hiddenIds?:ReadonlySet<string>;
    highlightIds?:ReadonlySet<string>;
    onHover?:(id:string|null)=>void;
    idleAutoRotate?:boolean;
    highlight?:string;
    offsets?:Readonly<Record<string,Vec3>>;
    xrStep?:XrStep|undefined;
};

export function StudScene(props: Props) {
    const host = useRef<HTMLDivElement>(null);
    const latest = useRef(props);
    useEffect(() => { latest.current = props; }, [props]);
    const [error, setError] = useState(false);
    const [retry,setRetry]=useState(0),[paused,pause]=useState(false);
    const pausedRef=useRef(false);
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
        const meshPoses=new Map<Mesh,{pose:Vector3; explode:Vector3;neutral:MeshStandardMaterial;center:Vector3;parent:Object3D}>();
        const inset=partInset();
        const hoverOutlines=new Map<string,LineSegments<EdgesGeometry,LineBasicMaterial>>();
        let selectedOutline:LineSegments<EdgesGeometry,LineBasicMaterial>|undefined;
        let selectedHatch:Mesh|undefined;
        const componentOutlines:LineSegments<EdgesGeometry,LineBasicMaterial>[]=[];
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
        let aspect = 1, fitRadius = 0.125;
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
            controls.target.copy(focused ? center.clone().addScaledVector(new Vector3(...p.start).add(new Vector3(...p.end)),0.0005) : new Vector3(0,0.012,0));
            const halfStroke=new Vector3(...p.start).distanceTo(new Vector3(...p.end))*0.0005;
            // 0.125 m half-height reproduces the picker framing of the old 0.36 m @ 38° view;
            // 0.014 m is the floor that a 40 mm minimum camera distance used to give a small part.
            fitRadius = focused ? Math.max(0.014,1.3*(targetRadius+halfStroke)) : 0.125;
            camera.zoom = 1;
            applyFrustum();
            // A true isometric axis (35.26° elevation, 45° azimuth) in the corner the view
            // already looked from. Distance is fixed because orthographic scale ignores it.
            camera.position.copy(controls.target).add(new Vector3(-1,1,-1).normalize().multiplyScalar(0.4));
            controls.update();
        };
        new GLTFLoader().load(props.url, gltf => {
            if (disposed) { dropModel(gltf.scene); return; }
            model = gltf.scene;
            display.add(model);
            model.traverse(n => {
                if (!(n instanceof Mesh)) return;
                n.material.dispose();
                const colour=latest.current.colors?.get(String(n.userData.instanceId));
                const hex = resolveColor(colour);
                n.material = hex !== null ? new MeshStandardMaterial({color:hex}) : neutral.clone();
                const outline=new LineSegments(new EdgesGeometry(n.geometry,32),componentOutlineMaterial);
                n.add(outline);
                componentOutlines.push(outline);
                const position = new Box3().setFromObject(n).getCenter(new Vector3());
                meshPoses.set(n,{pose:n.position.clone(),center:position.clone(),neutral:n.material,explode:position.sub(new Vector3(0,0.012,0)).multiplyScalar(0.7),parent:n.parent!});
            });
        }, undefined, () => { if (!disposed) setError(true); });
        const resize = new ResizeObserver(() => {
            const w = el.clientWidth, h = el.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w,h,false);
            aspect = w/h;
            // Refit only the frustum: a resize keeps the operator's zoom, unlike frameCamera.
            applyFrustum();
        });
        resize.observe(el);
        const pick = (event: MouseEvent) => {
            if (!model) return;
            const rect = el.getBoundingClientRect(), ray = new Raycaster();
            ray.setFromCamera(new Vector2(2*(event.clientX-rect.left)/rect.width-1,1-2*(event.clientY-rect.top)/rect.height),camera);
            const object=ray.intersectObjects([...meshPoses.keys()].filter(n=>n.visible),false)[0]?.object;
            if(typeof object?.userData.instanceId==='string') latest.current.onPick(object.userData.instanceId);
        };
        el.addEventListener('click',pick);
        let lastHover: string | null = null;
        const hover = (event: MouseEvent) => {
            if (!model) return;
            const rect=el.getBoundingClientRect(),ray=new Raycaster();
            ray.setFromCamera(new Vector2(2*(event.clientX-rect.left)/rect.width-1,1-2*(event.clientY-rect.top)/rect.height),camera);
            const object=ray.intersectObjects([...meshPoses.keys()].filter(n=>n.visible),false)[0]?.object;
            const id=typeof object?.userData.instanceId==='string' ? object.userData.instanceId : null;
            if(id!==lastHover){lastHover=id;latest.current.onHover?.(id);}
        };
        const leave = () => {lastHover=null;latest.current.onHover?.(null);};
        el.addEventListener('mousemove',hover);
        el.addEventListener('mouseleave',leave);
        let previous: Props | undefined, began = 0, lastTime=0;
        const a = new Vector3(), b = new Vector3(), displacement = new Vector3();
        renderer.setAnimationLoop((now: number) => {
            if (!model) return;
            const p = latest.current;
            if (!userInteracting) controls.autoRotate = (p.idleAutoRotate ?? false)
                && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if(previous?.target!==p.target){
                selectedOutline?.removeFromParent();
                selectedOutline?.geometry.dispose();
                selectedOutline=undefined;
                selectedHatch?.removeFromParent();
                selectedHatch=undefined;
                stud=[...meshPoses.keys()].find(m=>m.userData.instanceId===p.target);
                if(!stud){setError(true);return;}
                installed.copy(meshPoses.get(stud)!.pose);center.copy(meshPoses.get(stud)!.center);
                targetRadius=new Box3().setFromObject(stud).getSize(new Vector3()).length()/2;
                selectedHatch=new Mesh(stud.geometry,hatchMaterial);
                selectedHatch.renderOrder=1;
                stud.add(selectedHatch);
                selectedOutline=new LineSegments(new EdgesGeometry(stud.geometry,32),selectedOutlineMaterial);
                selectedOutline.renderOrder=2;
                stud.add(selectedOutline);
                inset.select(stud);
                if(ghost) display.remove(ghost);ghost=new Mesh(stud.geometry,ghostMaterial);ghost.quaternion.copy(stud.quaternion);ghost.visible=false;display.add(ghost);
            }
            if(!stud)return;
            if (!previous || previous.reset !== p.reset || previous.focus !== p.focus || previous.start!==p.start || previous.end!==p.end) {frameCamera();xr.current?.recenter();}
            if (previous?.highlightIds !== p.highlightIds || previous?.highlight !== p.highlight) {
                for(const outline of hoverOutlines.values()){outline.removeFromParent();outline.geometry.dispose();outline.material.dispose();}
                hoverOutlines.clear();
                const ids=p.highlightIds ?? (p.highlight ? new Set([p.highlight]) : new Set<string>());
                for(const id of ids){
                    const hoveredMesh=[...meshPoses.keys()].find(m=>m.userData.instanceId===id);
                    if(!hoveredMesh || p.hiddenIds?.has(id))continue;
                    const outline=new LineSegments(new EdgesGeometry(hoveredMesh.geometry,32),new LineBasicMaterial({color:id===p.highlight?0xffb000:0x168aad,linewidth:2}));
                    hoveredMesh.add(outline);hoverOutlines.set(id,outline);
                }
            }
            if (previous?.start !== p.start || previous.end !== p.end || previous.replay !== p.replay) {
                began = now;
                a.fromArray(p.start).multiplyScalar(0.001);
                b.fromArray(p.end).multiplyScalar(0.001);
                const v = b.clone().sub(a);
                arrow.visible = v.lengthSq() > 0;
                if(ghost){ghost.visible=arrow.visible;ghost.position.copy(installed).add(a);}
                pausedRef.current=false;pause(false);
                if (arrow.visible) {
                    arrow.position.copy(center).add(a).y += 0.005;
                    arrow.setDirection(v.clone().normalize());
                    arrow.setLength(v.length(),0.0015,0.001);
                }
            }
            if (previous?.colors !== p.colors) {
                for (const [mesh] of meshPoses) {
                    const hex = resolveColor(p.colors?.get(String(mesh.userData.instanceId)));
                    if (mesh.material instanceof MeshStandardMaterial) {
                        mesh.material.color.setHex(hex !== null ? hex : 0x838e94);
                    }
                }
            }
            if(previous?.explode!==p.explode || previous?.isolate!==p.isolate || previous?.offsets!==p.offsets || !previous) {
                for(const [mesh,entry] of meshPoses) {
                    mesh.position.copy(entry.pose).addScaledVector(entry.explode,p.explode ?? 0);
                    const offset=p.offsets?.[String(mesh.userData.instanceId)];
                    if(offset) mesh.position.addScaledVector(new Vector3(...offset),0.001);
                }
            }
            // Reconcile visibility every frame so confirmed removals cannot reappear
            // through later pose, focus, or camera updates.
            for(const [mesh,entry] of meshPoses) {
                const removed=p.hiddenIds?.has(String(mesh.userData.instanceId)) ?? false;
                if(removed){
                    mesh.visible=false;
                    mesh.removeFromParent();
                    continue;
                }
                if(mesh.parent!==entry.parent)entry.parent.add(mesh);
                mesh.visible=!p.isolate || mesh===stud;
            }
            previous = p;
            if(pausedRef.current) began+=now-lastTime;
            lastTime=now;
            controls.update();
            const t = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : Math.min(1,(now-began)/1200);
            stud.position.copy(installed).add(displacement.lerpVectors(a,b,t)).addScaledVector(meshPoses.get(stud)!.explode,p.explode ?? 0);
            xr.current?.update();renderer.render(scene,camera);
            if(p.focus) inset.draw(renderer,el.clientWidth,el.clientHeight);
            if (!p.focus) {
                const ndc = displacement.copy(center).addScaledVector(meshPoses.get(stud)!.explode,p.explode ?? 0).project(camera);
                renderer.domElement.dataset.targetPoint = `${(ndc.x+1)/2},${(1-ndc.y)/2}`;
            }
        });
        return () => {
            disposed = true; resize.disconnect(); el.removeEventListener('click',pick);
            el.removeEventListener('mouseleave',leave);
            if (resumeRotation) clearTimeout(resumeRotation);
            controls.removeEventListener('start', pauseForInteraction);
            controls.removeEventListener('end', resumeAfterInteraction);
            renderer.setAnimationLoop(null); controls.dispose();
            if (model) {
                for(const [mesh,entry] of meshPoses)if(mesh.parent!==entry.parent)entry.parent.add(mesh);
                dropModel(model);
            }
            xr.current?.dispose();xr.current=null;ghostMaterial.dispose();meshPoses.forEach(v=>v.neutral.dispose());
            componentOutlines.forEach(outline=>outline.geometry.dispose());
            selectedOutline?.geometry.dispose();
            componentOutlineMaterial.dispose();selectedOutlineMaterial.dispose();hatchMaterial.dispose();
            arrow.dispose(); neutral.dispose(); renderer.dispose(); renderer.domElement.remove();
            el.removeEventListener('mousemove',hover);
            for(const outline of hoverOutlines.values()){outline.geometry.dispose();outline.material.dispose();}
        };
    }, [props.url,retry]);
    return <div className="stud-scene" ref={host} aria-label="Helicopter with selected piece highlighted">
        {error && <p role="status">3D view unavailable. Follow the written direction and stop landmark. <button onClick={()=>setRetry(n=>n+1)}>Retry 3D view</button></p>}
        {props.focus && !error && <div className="scene-tools"><button
            className="scene-tool-icon"
            type="button"
            onClick={()=>{pausedRef.current=!pausedRef.current;pause(pausedRef.current);}}
            aria-label={paused?'Continue animation':'Pause animation'}
            title={paused?'Continue animation':'Pause animation'}
        >{paused
            ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg>
            : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM15 5h4v14h-4z" /></svg>
        }</button>
            {props.xrStep && modes.map(mode=><button key={mode} onClick={()=>{xr.current?.enter(mode).catch(()=>setXrError('Headset session unavailable. Continue on this screen.'));}}>Open {mode==='immersive-ar'?'AR':'VR'} twin</button>)}{xrError}</div>}
    </div>;
}
