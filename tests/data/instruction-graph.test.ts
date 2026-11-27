import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const load = (file: string) => JSON.parse(readFileSync(file, 'utf8'));

it('maps every physical target to sheet observations and keeps the two rotor-axle exits separate', () => {
    const graph = load('data/review/instruction-graph.json');
    const pilot = load('public/models/30465/pilot/graph.json');
    const pieces = pilot.occurrences.filter((o: {kind: string}) => o.kind === 'piece');
    expect(Object.keys(graph.targets).sort()).toEqual(pieces.map((o: {id: string}) => o.id).sort());
    for (const target of Object.values(graph.targets) as {stages: number[]; options: string[]}[]) {
        expect(target.stages.length).toBeGreaterThan(0);
        expect(target.options.length).toBeGreaterThan(0);
        for (const id of target.options) expect(graph.moves[id]).toBeDefined();
    }
    const axle = '30465/NAUO19/NAUO53';
    for (const [carried, cleared] of [[36, 37], [37, 36]]) {
        const move = graph.moves[`sheet:22:carry-${carried}`];
        expect(move.members).toEqual([axle, `30465/NAUO${carried}`]);
        expect(move.requiresClear).toEqual([`30465/NAUO${cleared}`]);
        expect(graph.targets[axle].options).toContain(move.id);
    }
    const tail = graph.moves['sheet:18:withdraw-rotor-stack'];
    expect(tail.requiresClear).toEqual(['30465/NAUO28/NAUO48']);
    expect(tail.members).toHaveLength(3);
    expect(graph.moves['sheet:19:lift-tail-with-light'].releases).toHaveLength(2);
});
