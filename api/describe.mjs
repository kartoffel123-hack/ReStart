import { readFile } from 'node:fs/promises';

/** Optional server-only OpenAI-compatible model. The browser submits a short
 * description, never a provider key, URL, catalog or executable query. */
export default async function describe(req,res) {
    if(req.method!=='POST') return res.status(405).json({error:'Use POST'});
    const {MODEL_ENDPOINT,MODEL_NAME,MODEL_API_KEY}=process.env;
    if(!MODEL_ENDPOINT || !MODEL_NAME) return res.status(503).json({error:'Description search is not configured'});
    try {
        const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
        if(typeof input?.description!=='string' || !input.description.trim() || input.description.length>320) return res.status(400).json({error:'Enter a short description'});
        const root=new URL('../public/models/30465/',import.meta.url);
        const channel=JSON.parse(await readFile(new URL('channel.json',root),'utf8'));
        if(!/^(pilot|releases\/[0-9a-f]{64})\/$/.test(channel.path)) throw new Error();
        const dataset=JSON.parse(await readFile(new URL(channel.path+'light-stud.json',root),'utf8'));
        if(input.revision!==dataset.repair.datasetRevision) return res.status(409).json({error:'Reload the assembly before searching'});
        const catalog=dataset.inventory.map(({id,name,color,elementId})=>({id,name,color,elementId}));
        const ids=new Set(catalog.map(p=>p.id));
        const response=await fetch(MODEL_ENDPOINT,{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json',...(MODEL_API_KEY?{Authorization:`Bearer ${MODEL_API_KEY}`}:{})},
            body:JSON.stringify({model:MODEL_NAME,temperature:0,max_tokens:200,messages:[{role:'system',content:'Rank up to five matching occurrence IDs from this catalog. Preserve ambiguous repeated parts. If none match, return an empty list. Respond only with JSON {"ids": [string,...]}. '+JSON.stringify(catalog)},
                {role:'user',content:input.description}]})});
        if(!response.ok) throw new Error();
        const json=await response.json();const proposed=JSON.parse(json.choices[0].message.content);
        if(!Array.isArray(proposed.ids) || proposed.ids.some(id=>typeof id!=='string' || !ids.has(id))) throw new Error();
        return res.status(200).json({revision:input.revision,ids:[...new Set(proposed.ids)].slice(0,5)});
    } catch { return res.status(502).json({error:'Description search unavailable. Use the inventory.'}); }
}
