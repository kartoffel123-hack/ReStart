import { Box3, Color, DirectionalLight, HemisphereLight, Mesh, OrthographicCamera, Scene, Vector3, type WebGLRenderer } from 'three';

/** Draw the actual target mesh again, isolated, using the same WebGL context.
 * This is display-only: the copy never participates in picking or pose replay. */
export function partInset() {
    const scene=new Scene(),camera=new OrthographicCamera(-1,1,1,-1,0.00001,2);
    scene.background=new Color('#fff2c4');scene.add(new HemisphereLight(0xffffff,0x87959c,2));
    const light=new DirectionalLight(0xffffff,2.4);light.position.set(-1,2,1);scene.add(light);
    let part:Mesh|undefined;
    return {
        select(source:Mesh) {
            if(part) scene.remove(part);
            part=new Mesh(source.geometry,source.material);part.quaternion.copy(source.quaternion);scene.add(part);
            const box=new Box3().setFromObject(part),center=box.getCenter(new Vector3());
            const radius=box.getSize(new Vector3()).length()/2;
            part.position.sub(center);
            // Same isometric axis and framing as the main view. The inset is square, so one
            // half-extent covers both axes; 1.38 reproduces the old radius*4.8 @ 32° framing.
            const half=radius*1.38;
            camera.left=-half;camera.right=half;camera.top=half;camera.bottom=-half;
            camera.updateProjectionMatrix();
            camera.position.set(-1,1,-1).normalize().multiplyScalar(radius*4.8);camera.lookAt(0,0,0);
        },
        draw(renderer:WebGLRenderer,w:number,h:number) {
            if(!part || renderer.xr.isPresenting)return;
            const size=Math.min(140,Math.floor(w*0.26),Math.floor(h*0.36));
            renderer.setScissorTest(true);renderer.setViewport(12,12,size,size);renderer.setScissor(12,12,size,size);
            renderer.render(scene,camera);renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);
        }
    };
}
