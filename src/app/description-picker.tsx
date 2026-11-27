import { useEffect,useRef,useState } from 'react';
import type { PilotData } from './pilot-data.js';

export function DescriptionPicker({data,select}:{data:PilotData;select:(id:string)=>void}) {
    const [words,setWords]=useState(''),[ids,setIds]=useState<string[]>([]),[message,setMessage]=useState('');
    const active=useRef<AbortController|null>(null);
    useEffect(()=>()=>active.current?.abort(),[]);
    const search=async()=>{
        active.current?.abort();const abort=new AbortController();active.current=abort;setIds([]);setMessage('Searching…');
        try {
            const r=await fetch(`${import.meta.env.BASE_URL}api/describe`,{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,
                body:JSON.stringify({description:words,revision:data.repair.datasetRevision})});
            if(!r.ok) throw new Error();
            const result=await r.json();
            if(result.revision!==data.repair.datasetRevision || !Array.isArray(result.ids) || result.ids.some((id:unknown)=>!data.inventory.some(p=>p.id===id))) throw new Error();
            if(!abort.signal.aborted){setIds(result.ids);setMessage(result.ids.length?'Choose an occurrence to highlight it.':'No match. Try the ordinary picker.');}
        } catch {if(!abort.signal.aborted)setMessage('Description search unavailable. Use the inventory above.');}
    };
    return <details><summary>Find a piece by description</summary><label>Describe the piece <input maxLength={320} value={words} onChange={e=>setWords(e.target.value)}/></label>
        <button disabled={!words.trim()} onClick={()=>void search()}>Find possible matches</button><p aria-live="polite">{message}</p>
        {ids.map(id=><button key={id} onClick={()=>select(id)}>{data.inventory.find(p=>p.id===id)?.name} — {id}</button>)}</details>;
}
