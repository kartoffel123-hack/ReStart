import { ReactFlow, Background, Controls, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { graphlib,layout } from '@dagrejs/dagre';
import { useMemo } from 'react';
import type { AssemblyModel } from '../domain/schema.js';

/* Node/edge labels sit on white nodes, so keep them dark even under a dark OS theme
   (ReactFlow's default --xy-node-color becomes near-white in that case). */
const varInk = 'var(--rs-ink)';

/** Local neighbourhood of the selected occurrence; every occurrence remains addressable in the list. */
export function AssemblyDiagram({model,id,select}:{model:AssemblyModel;id:string;select:(id:string)=>void}) {
    const {nodes,edges}=useMemo(()=>{
    const edges: Edge[] = [];
    const edge = (from:string,to:string,label:string,style:string) => edges.push({
        id:JSON.stringify([from,to,label]),source:from,target:to,label,style:{strokeDasharray:style},
        labelStyle:{fill:varInk,fontWeight:500},labelBgStyle:{fill:'#ffffff',fillOpacity:0.9},labelBgPadding:[4,2] as [number,number]
    });
    const selected = model.occurrences.find(o=>o.id===id);
    if (selected?.parent) edge(selected.parent,id,'contains','6 3');
    model.occurrences.filter(o=>o.parent===id).forEach(o=>edge(id,o.id,'contains','6 3'));
    model.connections.filter(c=>c.a===id || c.b===id).forEach(c=>edge(c.a,c.b,c.kind,''));
    const ops = model.operations.filter(o=>o.members.includes(id));
    for (const op of ops) {
        edge(id,op.id,op.alternativeGroup ? `choice: ${op.alternativeGroup}` : op.phase,'2 2');
        // The exhaustive installed-state guards remain in the textual rule list.
        // Draw the target's access dependencies rather than hiding them in 69 identical edges.
        op.requires.filter(r=>r.role!=='support' || !r.id.startsWith('installed:')).forEach(r=>edge(r.subject.id,op.id,`requires ${r.acceptable.join(' or ')}`,'4 4'));
    }
    const ids = [...new Set([id,...edges.flatMap(e=>[e.source,e.target])])];
    const graph=new graphlib.Graph().setGraph({rankdir:'LR',nodesep:28,ranksep:96}).setDefaultEdgeLabel(()=>({}));
    ids.forEach(key=>graph.setNode(key,{width:170,height:48}));edges.forEach(e=>graph.setEdge(e.source,e.target));layout(graph);
    const nodes = ids.map(key=>({id:key,position:{x:graph.node(key).x-85,y:graph.node(key).y-24},
        data:{label:model.occurrences.find(o=>o.id===key)?.commonName ?? model.operations.find(o=>o.id===key)?.phase ?? key},
        style:{background:key===id?'#fff2c4':'white',color:varInk}}));
    return {nodes,edges};},[id,model]);
    return <div style={{height:350}}><ReactFlow key={id} nodes={nodes} edges={edges} fitView nodesDraggable={false}
        onNodeClick={(_,n)=>{if(model.occurrences.some(p=>p.id===n.id)) select(n.id);}}>
        <Background/><Controls/></ReactFlow></div>;
}
