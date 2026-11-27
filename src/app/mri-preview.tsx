import { useEffect, useRef, useState } from 'react';
import { Box3, Color, DirectionalLight, HemisphereLight, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './mri-preview.css';

const SOURCE_SHA256 = '88740a3882f24ad03e9182fb8c29aca74fe7b3cc15445c45856adfa515b6f63d';
const base = `${import.meta.env.BASE_URL}models/lego-mri/`;

type Manifest = Readonly<{
    schema: 'restart.geometry-preview/1';
    model: 'LEGO MRI';
    sourceSha256: string;
    geometry: string;
    geometrySha256: string;
    triangles: number;
    vertices: number;
    boundsMm: Readonly<{ min: readonly number[]; max: readonly number[] }>;
    note: string;
}>;

async function loadGeometry(signal: AbortSignal): Promise<Readonly<{ manifest: Manifest; bytes: ArrayBuffer }>> {
    const response = await fetch(`${base}manifest.json`, { signal });
    if (!response.ok) throw new Error(`MRI manifest HTTP ${response.status}`);
    const data = await response.json() as Manifest;
    if (data.schema !== 'restart.geometry-preview/1' || data.model !== 'LEGO MRI' ||
        data.sourceSha256 !== SOURCE_SHA256 || !/^geometry-[a-f0-9]{64}\.glb$/.test(data.geometry) ||
        !/^[a-f0-9]{64}$/.test(data.geometrySha256)) {
        throw new Error('MRI geometry manifest is invalid or does not match the pinned source');
    }
    const geometry = await fetch(`${base}${data.geometry}`, { signal });
    if (!geometry.ok) throw new Error(`MRI geometry HTTP ${geometry.status}`);
    const bytes = await geometry.arrayBuffer();
    const digest = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
        (value) => value.toString(16).padStart(2, '0')
    ).join('');
    if (digest !== data.geometrySha256) throw new Error('MRI geometry hash mismatch');
    return { manifest: data, bytes };
}

export function MriPreview() {
    const host = useRef<HTMLDivElement>(null);
    const [error, setError] = useState('');
    const [details, setDetails] = useState<Pick<Manifest, 'vertices' | 'triangles' | 'boundsMm'> | null>(null);

    useEffect(() => {
        const element = host.current;
        if (!element) return;
        let renderer: WebGLRenderer;
        try {
            renderer = new WebGLRenderer({ antialias: true, alpha: false });
        } catch {
            setError('This browser could not create a WebGL view.');
            return;
        }
        let disposed = false;
        let resize: ResizeObserver | undefined;
        let modelLoaded = false;
        const abort = new AbortController();
        const scene = new Scene();
        scene.background = new Color(0xe8e9e6);
        const camera = new OrthographicCamera(-1, 1, 1, -1, 0.001, 100);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        scene.add(new HemisphereLight(0xffffff, 0x667078, 2));
        const light = new DirectionalLight(0xffffff, 2.5);
        light.position.set(-1, 2, 2);
        scene.add(light);
        element.appendChild(renderer.domElement);

        void loadGeometry(abort.signal)
            .then(({ manifest, bytes }) => {
                if (disposed) return;
                setDetails({ vertices: manifest.vertices, triangles: manifest.triangles, boundsMm: manifest.boundsMm });
                return new Promise<void>((resolve, reject) => {
                    new GLTFLoader().parse(bytes, '', (gltf) => {
                    if (disposed) return;
                    modelLoaded = true;
                    element.dataset.modelLoaded = 'true';
                    scene.add(gltf.scene);
                    const bounds = new Box3().setFromObject(gltf.scene);
                    const center = bounds.getCenter(new Vector3());
                    gltf.scene.position.sub(center);
                    const size = bounds.getSize(new Vector3());
                    const radius = Math.max(size.x, size.y, size.z) * 0.68;
                    const fit = () => {
                        const aspect = Math.max(0.1, element.clientWidth / Math.max(1, element.clientHeight));
                        const halfHeight = radius / Math.min(1, aspect);
                        camera.left = -halfHeight * aspect;
                        camera.right = halfHeight * aspect;
                        camera.top = halfHeight;
                        camera.bottom = -halfHeight;
                        camera.position.set(-1, 1, 1).normalize().multiplyScalar(radius * 4);
                        camera.lookAt(0, 0, 0);
                        camera.updateProjectionMatrix();
                        controls.target.set(0, 0, 0);
                        controls.update();
                    };
                    fit();
                    resize = new ResizeObserver(() => {
                        if (!disposed) {
                            renderer.setSize(element.clientWidth, element.clientHeight, false);
                            fit();
                        }
                    });
                    resize.observe(element);
                    renderer.setSize(element.clientWidth, element.clientHeight, false);
                    renderer.setAnimationLoop(() => {
                        controls.update();
                        renderer.render(scene, camera);
                    });
                    resolve();
                    }, reject);
                });
            })
            .catch((reason: unknown) => {
                if (!disposed && !(reason instanceof DOMException && reason.name === 'AbortError')) {
                    setError(reason instanceof Error ? reason.message : 'Could not load MRI geometry.');
                }
            });

        return () => {
            disposed = true;
            abort.abort();
            renderer.setAnimationLoop(null);
            controls.dispose();
            resize?.disconnect();
            if (modelLoaded) {
                scene.traverse((object) => {
                    const mesh = object as typeof object & { geometry?: { dispose(): void }; material?: { dispose(): void } | Array<{ dispose(): void }> };
                    mesh.geometry?.dispose();
                    for (const material of Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []) material.dispose();
                });
            }
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    return (
        <main className="mri-preview">
            <header className="mri-preview__header">
                <div>
                    <p className="mri-preview__eyebrow">ReStart · Geometry preview</p>
                    <h1>LEGO MRI</h1>
                    <p className="mri-preview__subhead">Explore the supplied STEP model</p>
                </div>
                <span className="mri-preview__badge">Preview only · no repair data</span>
            </header>
            <div className="mri-preview__content">
                <section className="mri-preview__viewport" aria-label="LEGO MRI model view">
                    <div className="mri-preview__canvas" ref={host} />
                    <p className="mri-preview__hint">Drag to rotate · scroll to zoom</p>
                    {error && <p className="mri-preview__error" role="alert">{error}</p>}
                </section>
                <aside className="mri-preview__info">
                    <p className="mri-preview__eyebrow">Source model</p>
                    <h2>Single tessellated solid</h2>
                    <p>This STEP file contains one surface, not a component assembly. Part selection, disassembly steps, and repair evidence are not available for this model.</p>
                    {details && <dl>
                        <div><dt>Vertices</dt><dd>{details.vertices.toLocaleString()}</dd></div>
                        <div><dt>Triangles</dt><dd>{details.triangles.toLocaleString()}</dd></div>
                        <div><dt>Units</dt><dd>Millimetres · converted for display</dd></div>
                    </dl>}
                    <a href="#/helicopter">Open the helicopter repair pilot</a>
                </aside>
            </div>
        </main>
    );
}
