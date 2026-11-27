import { Box3, Color, DirectionalLight, EdgesGeometry, HemisphereLight, LineBasicMaterial, LineSegments, Mesh, OrthographicCamera, Scene, Vector3, type Group, type WebGLRenderer } from 'three';

/** Draw a miniature overview of the full assembly into the main WebGL canvas. */
export function viewportInset() {
    const camera=new OrthographicCamera(-1,1,1,-1,0.00001,2);
    const mainPartCamera=new OrthographicCamera(-1,1,1,-1,0.00001,2);
    const direction=new Vector3(-0.6,0.65,-1).normalize();
    const center=new Vector3();
    const mainDirection=new Vector3();
    let radius=0;
    let framed=false;
    const replacementScene=new Scene();
    replacementScene.background=new Color(0xe6e6e6);
    replacementScene.add(new HemisphereLight(0xffffff,0x87959c,2));
    const partLight=new DirectionalLight(0xffffff,2);
    partLight.position.set(-1,2,1);
    replacementScene.add(partLight);
    let replacement:Mesh|undefined;
    let replacementOutline:LineSegments|undefined;
    let replacementOutlineMaterial:LineBasicMaterial|undefined;
    let replacementSource:Mesh|undefined;
    let replacementRadius=0;
    let lastSpinTime=0;
    const framePart=(source:Mesh) => {
        if(replacementSource===source && replacement)return;
        if(replacement) {
            replacementScene.remove(replacement);
            replacement.geometry.dispose();
            replacementOutline?.geometry.dispose();
            replacementOutlineMaterial?.dispose();
        }
        source.updateWorldMatrix(true,false);
        source.geometry.computeBoundingBox();
        const box=source.geometry.boundingBox?.clone().applyMatrix4(source.matrixWorld) ?? new Box3().setFromObject(source);
        const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
        const partCenter=box.getCenter(new Vector3());
        geometry.translate(-partCenter.x,-partCenter.y,-partCenter.z);
        replacement=new Mesh(geometry,source.material);
        replacementOutlineMaterial=new LineBasicMaterial({color:0x172127});
        replacementOutline=new LineSegments(new EdgesGeometry(geometry,32),replacementOutlineMaterial);
        replacement.add(replacementOutline);
        replacementScene.add(replacement);
        replacementSource=source;
        replacementRadius=box.getSize(new Vector3()).length()/2;
        lastSpinTime=0;
    };
    return {
        frame(model:Group) {
            const box=new Box3().setFromObject(model);
            box.getCenter(center);
            radius=box.getSize(new Vector3()).length()/2;
            const aspect=1.5;
            const halfHeight=radius*0.69;
            camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;
            camera.top=halfHeight;camera.bottom=-halfHeight;
            camera.updateProjectionMatrix();
            camera.position.copy(center).addScaledVector(direction,-radius*3.5);
            camera.lookAt(center);
            framed=true;
        },
        draw(renderer:WebGLRenderer,scene:Scene,mainCamera:OrthographicCamera,w:number,h:number) {
            if(!framed || renderer.xr.isPresenting)return;
            mainCamera.getWorldDirection(mainDirection);
            camera.up.copy(mainCamera.up);
            camera.position.copy(center).addScaledVector(mainDirection,-radius*3.5);
            camera.lookAt(center);
            const width=Math.min(200,Math.floor(w*0.34),Math.floor(h*0.45));
            const height=Math.floor(width/1.5);
            const left=12,bottom=12;
            renderer.setScissorTest(true);
            renderer.setViewport(left,bottom,width,height);
            renderer.setScissor(left,bottom,width,height);
            renderer.render(scene,camera);
            renderer.setScissorTest(false);
            renderer.setViewport(0,0,w,h);
        },
        drawReplacement(renderer:WebGLRenderer,w:number,h:number,now:number,source:Mesh|undefined) {
            if(renderer.xr.isPresenting || !source)return;
            framePart(source);
            if(!replacement)return;
            if(lastSpinTime>0) replacement.rotation.y+=(Math.min(now-lastSpinTime,50))*0.0008;
            lastSpinTime=now;
            const aspect=w/Math.max(1,h);
            const halfHeight=replacementRadius*1.35/Math.min(1,aspect);
            mainPartCamera.left=-halfHeight*aspect;mainPartCamera.right=halfHeight*aspect;
            mainPartCamera.top=halfHeight;mainPartCamera.bottom=-halfHeight;
            mainPartCamera.position.copy(direction).multiplyScalar(replacementRadius*3.5);
            mainPartCamera.lookAt(0,0,0);
            mainPartCamera.updateProjectionMatrix();
            renderer.setScissorTest(false);
            renderer.setViewport(0,0,w,h);
            renderer.setScissor(0,0,w,h);
            renderer.render(replacementScene,mainPartCamera);
        },
        dispose() {
            if(replacement) replacement.geometry.dispose();
            replacementOutline?.geometry.dispose();
            replacementOutlineMaterial?.dispose();
        }
    };
}
