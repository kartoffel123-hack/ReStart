import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll,afterEach,beforeAll,expect,it } from 'vitest';
import { http,HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { loadPackage } from '../../src/app/package-loader.js';

const base='https://manual.test/project/models/30465/';
const server=setupServer(http.get(`${base}*`,({request})=>{
    const path=request.url.slice(base.length);
    if(!/^(channel\.json|pilot\/[a-z0-9.-]+)$/.test(path)) return new HttpResponse(null,{status:404});
    return new HttpResponse(new Uint8Array(readFileSync(join('public/models/30465',path))));
}));
beforeAll(()=>server.listen({onUnhandledRequest:'error'}));
afterEach(()=>server.resetHandlers());
afterAll(()=>server.close());

it('refuses a graph from another generation and can retry without mixing bytes',async()=>{
    server.use(http.get(`${base}pilot/graph.json`,()=>HttpResponse.json({operations:[]}),{once:true}));
    await expect(loadPackage(base,new AbortController().signal)).rejects.toThrow(/hash mismatch/);
    const result=await loadPackage(base,new AbortController().signal);
    expect(result.model.connections).toHaveLength(84);
    expect(result.pilot.inventory).toHaveLength(70);
});
it('reports the missing file before installing the package',async()=>{
    server.use(http.get(`${base}pilot/light-stud.json`,()=>new HttpResponse(null,{status:404})));
    await expect(loadPackage(base,new AbortController().signal)).rejects.toThrow(/light-stud.json: HTTP 404/);
});

it('rejects a helicopter package returned at the scanner URL',async()=>{
    const scanner=base.replace('30465','4000041');
    server.use(http.get(`${scanner}channel.json`,()=>HttpResponse.json({schemaVersion:1,stage:'pilot',path:'pilot/'})),
        http.get(`${scanner}pilot/index.json`,()=>HttpResponse.json(JSON.parse(readFileSync('public/models/30465/pilot/index.json','utf8')))));
    await expect(loadPackage(scanner,new AbortController().signal)).rejects.toThrow('Wrong dataset index');
});

it('refuses a stale scanner index before loading any of its assets',async()=>{
    const scanner=base.replace('30465','4000041'),path=`candidates/${'0'.repeat(64)}/`;
    server.use(http.get(`${scanner}channel.json`,()=>HttpResponse.json({schemaVersion:1,stage:'candidate',path})),
        http.get(`${scanner}${path}index.json`,()=>HttpResponse.json({schema:'restart.dataset/2'})));
    await expect(loadPackage(scanner,new AbortController().signal)).rejects.toThrow('Candidate index hash mismatch');
});
