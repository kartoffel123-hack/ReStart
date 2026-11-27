import { ReactFlow, Background, Controls, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AssemblyModel } from '../domain/schema.js';

/** Local neighbourhood of the selected occurrence; every occurrence remains addressable in the list. */
export function AssemblyDiagram({model,id,select}:{model:AssemblyModel;id:string;select:(id:string)=>void}) {
    const edges: Edge[] = [];
    const edge = (from:string,to:string,label:string,style:string) => edges.push({
        id:JSON.stringify([from,to,label]),source:from,target:to,label,style:{strokeDasharray:style}
    });
    const selected = model.occurrences.find(o=>o.id===id);
    if (selected?.parent) edge(selected.parent,id,'contains','6 3');
    model.occurrences.filter(o=>o.parent===id).forEach(o=>edge(id,o.id,'contains','6 3'));
    model.connections.filter(c=>c.a===id || c.b===id).forEach(c=>edge(c.a,c.b,c.kind,''));
    const ops = model.operations.filter(o=>o.members.includes(id));
    for (const op of ops) {
        edge(id,op.id,op.alternativeGroup ? `choice: ${op.alternativeGroup}` : op.phase,'2 2');
        op.requires.forEach(r=>edge(r.subject.id,op.id,`requires ${r.acceptable.join(' or ')}`,'4 4'));
    }
    const ids = [...new Set([id,...edges.flatMap(e=>[e.source,e.target])])];
    const nodes = ids.map((key,i)=>({id:key,position: i===0 ? {x:0,y:80} : {x:(i%2 ? -280:280),y:Math.floor((i-1)/2)*90},
        data:{label:model.occurrences.find(o=>o.id===key)?.commonName ?? key},
        style:{background:key===id?'#fff2c4':'white'}}));
    return <div style={{height:350}}><ReactFlow key={id} nodes={nodes} edges={edges} fitView nodesDraggable={false}
        onNodeClick={(_,n)=>{if(model.occurrences.some(p=>p.id===n.id)) select(n.id);}}>
        <Background/><Controls/></ReactFlow></div>;
}
