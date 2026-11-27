import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Scene, Vector3, type WebGLRenderer } from 'three';

export type XrStep={id:string;text:string;confirm:()=>void;replay:()=>void};
/** Keep a viewer-relative twin beside the operator. No physical registration is
 * assumed. Input is routed through the desktop session's explicit step ID. */
export function xrManual(renderer:WebGLRenderer,scene:Scene,display:Group,getStep:()=>XrStep|undefined) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
    const ctx=canvas.getContext('2d')!;
    const texture=new CanvasTexture(canvas),material=new MeshBasicMaterial({map:texture});
    const hud=new Mesh(new PlaneGeometry(0.64,0.16),material);scene.add(hud);hud.visible=false;
    const bg=scene.background;
    let active:XRSession|undefined, dead=false, positioned=false,shown='',last=0;
    const end=()=>{active=undefined;positioned=false;shown='';hud.visible=false;display.scale.setScalar(1);display.position.setScalar(0);display.quaternion.identity();scene.background=bg;};
    const confirm=()=>{const now=performance.now();if(now-last>450){getStep()?.confirm();last=now;}};
    const replay=()=>getStep()?.replay();
    const enter=async(mode:XRSessionMode)=>{
        if(!navigator.xr || active) return;
        const session=await navigator.xr.requestSession(mode,{optionalFeatures:['local-floor']});
        if(dead){await session.end();return;}
        renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
        session.addEventListener('end',end,{once:true});session.addEventListener('select',confirm);session.addEventListener('squeeze',replay);
        active=session;
        try {await renderer.xr.setSession(session);} catch(e){await session.end();throw e;}
        if(mode==='immersive-ar') scene.background=null;
    };
    const update=()=>{
        if(!active || !renderer.xr.isPresenting) return;
        if(!positioned){
            const camera=renderer.xr.getCamera(), position=camera.getWorldPosition(new Vector3()),rotation=camera.getWorldQuaternion(new Quaternion());
            display.position.copy(new Vector3(0,-0.17,-0.65).applyQuaternion(rotation).add(position));display.scale.setScalar(3);
            hud.position.copy(new Vector3(0,0.08,-0.8).applyQuaternion(rotation).add(position));hud.quaternion.copy(rotation);positioned=true;
        }
        const step=getStep();if(!step || step.id===shown) return;
        shown=step.id;hud.visible=true;ctx.fillStyle='#fff2c4';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#172127';ctx.font='36px sans-serif';
        let line='',y=46;for(const word of step.text.split(' ')) {if(ctx.measureText(line+' '+word).width>970){ctx.fillText(line,24,y);y+=44;line='';}line+=(line?' ':'')+word;}ctx.fillText(line,24,y);
        ctx.font='26px sans-serif';ctx.fillText('Trigger: confirm step     Grip: replay',24,239);texture.needsUpdate=true;
    };
    return {enter,update,recenter:()=>{positioned=false;},dispose:()=>{dead=true;if(active){active.removeEventListener('select',confirm);active.removeEventListener('squeeze',replay);void active.end().catch(()=>{});}hud.geometry.dispose();material.dispose();texture.dispose();}};
}
