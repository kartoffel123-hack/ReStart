/**
 * Ticket 2 · V01/V07 · inventory, BoM and timing lookup (plan 02 §3A.6, plan 03 V01/V07).
 *
 * The workbooks are the only place the challenge states what a piece is made of, which
 * functional unit it belongs to, and how long a connection takes. Two of those three are
 * explicitly hypothetical, so this file pins both the joins and the labels: a number that
 * reaches the UI without its "challenge assumption" provenance is a worse outcome than no
 * number at all.
 *
 * Measured on the supplied files: `Teileliste` header row 3, data rows 4-34 (31 inventory
 * rows), quantity column G, row 35 = total 70. `Bill of Materials` 70 data rows. MTM English
 * sheet `Vorschlag_2_Grid_EN` rows 2-63 keyed by `Row_ID`, seconds in column L; German sheet
 * `Vorschlag_2_Raster` seconds in column R.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ExcelJS from 'exceljs';
import { parseStepEntities } from '../../tools/lib/step-file.js';
import { buildAssemblyTree, type AssemblyTree } from '../../tools/lib/step-tree.js';
import {
    MATERIAL_PROVENANCE,
    TIMING_PROVENANCE,
    joinSources,
    readBillOfMaterials,
    readInventory,
    readTimingLookup
} from '../../tools/lib/workbooks.js';

const ASSETS = 'assets/siemens-provided';
const COMPONENTS = `${ASSETS}/Components.xlsx`;
const BOM = `${ASSETS}/BoM_Helicopter_LEGO.xlsx`;
const MTM = `${ASSETS}/MTM_Mapping_Connection_V3.xlsx`;

let tree: AssemblyTree;
let inventory: Awaited<ReturnType<typeof readInventory>>;
let bom: Awaited<ReturnType<typeof readBillOfMaterials>>;
let timing: Awaited<ReturnType<typeof readTimingLookup>>;
let joined: ReturnType<typeof joinSources>;

beforeAll(async () => {
    const bytes = new Uint8Array(
        readFileSync(resolve('assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP'))
    );
    tree = buildAssemblyTree(parseStepEntities(new TextDecoder().decode(bytes)));
    inventory = await readInventory(COMPONENTS);
    bom = await readBillOfMaterials(BOM);
    timing = await readTimingLookup(MTM);
    joined = joinSources({ inventory, bom, occurrences: tree.occurrences });
}, 120_000);

/**
 * Flatten a sheet to plain values. The supplied German sheet uses shared formulas, which
 * ExcelJS refuses to write once their master cell moves, so counterexample workbooks are
 * rebuilt from values rather than by editing the original cells.
 */
function grid(worksheet: ExcelJS.Worksheet, rows: number): (string | number | null)[][] {
    const table: (string | number | null)[][] = [];
    for (let row = 1; row <= rows; row += 1) {
        const line: (string | number | null)[] = [];
        for (let column = 1; column <= worksheet.columnCount; column += 1) {
            const value = worksheet.getCell(row, column).value as unknown;
            if (value === null || value === undefined) line.push(null);
            else if (typeof value === 'object') {
                const object = value as Record<string, unknown>;
                const resolved =
                    object.result ??
                    (Array.isArray(object.richText)
                        ? (object.richText as Array<{ text: string }>).map((part) => part.text).join('')
                        : null);
                line.push(
                    typeof resolved === 'number'
                        ? resolved
                        : resolved === null || resolved === undefined
                          ? null
                          : String(resolved)
                );
            } else line.push(value as string | number);
        }
        table.push(line);
    }
    return table;
}

describe('parts list (Teileliste)', () => {
    it('reads 31 inventory rows whose quantities sum to the declared total of 70', () => {
        expect(inventory.rows.length).toBe(31);
        expect(inventory.declaredTotal).toBe(70);
        expect(inventory.rows.reduce((sum, row) => sum + row.quantity, 0)).toBe(70);
        expect(inventory.issues).toEqual([]);
    });

    it('keeps the supplied CAD name spelling, including the mismatched Small Bush number', () => {
        const bush = inventory.rows.find((row) => row.stepName === 'Small Bush - 30565');
        expect(bush).toBeDefined();
        expect(bush?.quantity).toBe(9);
        expect(bush?.color).toBe('Light Grey');
        // The source says 30565 where every sibling says 30465. Normalising it would break
        // the join to the STEP names, so the importer passes it through untouched.
        expect(inventory.rows.some((row) => row.stepName.includes('Small Bush - 30465'))).toBe(false);
    });

    it('labels the colour/material legend as a challenge assumption, never as measured material', () => {
        const bush = inventory.rows.find((row) => row.stepName === 'Small Bush - 30565');
        expect(bush?.materialType).toBe('Aluminium');
        expect(bush?.provenance).toBe(MATERIAL_PROVENANCE);
        expect(MATERIAL_PROVENANCE).toMatch(/challenge|assumption/i);
    });
});

describe('bill of materials', () => {
    it('has one row per physical piece and recognises the module level', () => {
        expect(bom.rows.length).toBe(70);
        const knownModules = new Set(tree.modules.map((module) => module.name));
        const withModule = bom.rows.filter((row) => row.module !== null);
        expect(withModule.length).toBeGreaterThan(0);
        for (const row of withModule) expect(knownModules.has(row.module as string)).toBe(true);
        // Some rows hang directly off the root, so depth alone cannot identify the module.
        expect(bom.rows.filter((row) => row.module === null).length).toBeGreaterThan(0);
    });

    it('covers exactly the same 70 pieces as the assembly, but not in the same order', () => {
        const fromTree = tree.occurrences.map((occurrence) => occurrence.name).sort();
        const fromBom = bom.rows.map((row) => row.partName).sort();
        expect(fromBom).toEqual(fromTree);
        // Plan 02 §3A.6 says the sequences agree by type; they do not agree positionally, so
        // a row may not be joined to an occurrence by index.
        const positional = bom.rows.filter((row, index) => row.partName === tree.occurrences[index]?.name);
        expect(positional.length).toBeLessThan(70);
        expect(joined.positionalAgreement).toBe(positional.length);
    });

    it('marks individual row identity ambiguous where a name repeats without an instance mark', () => {
        expect(joined.uniqueRows + joined.ambiguousRows).toBe(70);
        expect(joined.ambiguousRows).toBeGreaterThan(0);
        const bushes = bom.rows.filter((row) => row.partName === 'Small Bush - 30565');
        expect(bushes.length).toBe(9);
        expect(bushes.every((row) => row.rowLink === 'ambiguous')).toBe(true);
    });

    it('reports the functional-unit column as candidates that group nothing yet', () => {
        // Column I holds one "∿ <first word of the part name>" label per row, so it cannot be
        // the functional-unit model; the model needs membership reviewed on the kit.
        expect(bom.candidateUnits.length).toBe(70);
        expect(new Set(bom.candidateUnits.map((unit) => unit.label)).size).toBe(70);
        expect(bom.functionalUnitsNeedReview).toBe(true);
    });
});

describe('inventory joined to the assembly', () => {
    it('reconciles every part type to its occurrence multiplicity', () => {
        expect(joined.types.length).toBe(31);
        expect(joined.unmatchedInventory).toEqual([]);
        expect(joined.unmatchedOccurrences).toEqual([]);
        expect(joined.issues).toEqual([]);
        for (const type of joined.types) {
            expect(type.occurrences, type.stepName).toBe(type.quantity);
            expect(type.occurrenceIds).toHaveLength(type.quantity);
        }
        const axle = joined.types.find((type) => type.stepName === 'Axle - 30465_3 - Long');
        expect(axle?.occurrenceIds).toContain('30465/NAUO1/NAUO79');
    });

    it('carries the inventory row number so a claim traces back to a cell', () => {
        const bush = joined.types.find((type) => type.stepName === 'Small Bush - 30565');
        expect(bush?.row).toBe(30);
        expect(bush?.quantity).toBe(9);
    });

    it('refuses to reconcile when a quantity no longer matches the assembly', async () => {
        // Counterexample for a join that only checks the total: one type short and one type
        // long keeps the sum at 70 while describing the wrong assembly.
        const directory = mkdtempSync(join(tmpdir(), 'restart-inventory-'));
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(resolve(COMPONENTS));
            const sheet = workbook.getWorksheet('Teileliste');
            if (sheet === undefined) throw new Error('Teileliste missing');
            sheet.getCell('G30').value = 8;
            sheet.getCell('G31').value = 4;
            const tampered = join(directory, 'tampered.xlsx');
            writeFileSync(tampered, Buffer.from(await workbook.xlsx.writeBuffer()));
            const broken = await readInventory(tampered);
            expect(broken.rows.reduce((sum, row) => sum + row.quantity, 0)).toBe(70);
            const rebalanced = joinSources({ inventory: broken, bom, occurrences: tree.occurrences });
            expect(rebalanced.issues.join('\n')).toMatch(/Small Bush - 30565.*9|Large Bush - 30465.*3/);
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });
});

describe('MTM timing lookup', () => {
    it('keys the lookup by Row_ID and cross-checks the German sheet by ID', () => {
        expect(timing.rows.length).toBe(62);
        expect(new Set(timing.rows.map((row) => row.rowId)).size).toBe(62);
        expect(timing.crossCheckIssues).toEqual([]);
    });

    it('is labelled fictitious and returns unknown rather than an estimate', () => {
        expect(timing.provenance).toBe(TIMING_PROVENANCE);
        expect(TIMING_PROVENANCE).toMatch(/fictitious|challenge/i);
        expect(timing.secondsFor('does-not-exist')).toBeNull();
        expect(timing.secondsFor('ST-mittel')).toBe(3);
    });

    it('cross-checks by ID, so reordering the German sheet changes nothing', async () => {
        // Counterexample for a loader that compared the two sheets row by row: reversing the
        // German sheet keeps every ID's own time, so an ID-keyed check stays silent while a
        // positional one reports 62 disagreements. Bumping one time then has to be caught.
        const directory = mkdtempSync(join(tmpdir(), 'restart-mtm-'));
        try {
            const original = new ExcelJS.Workbook();
            await original.xlsx.readFile(resolve(MTM));
            const english = original.getWorksheet('Vorschlag_2_Grid_EN');
            const german = original.getWorksheet('Vorschlag_2_Raster');
            if (english === undefined || german === undefined) throw new Error('MTM sheets missing');

            const fresh = new ExcelJS.Workbook();
            const englishCopy = fresh.addWorksheet('Vorschlag_2_Grid_EN');
            grid(english, english.rowCount).forEach((line, index) => {
                englishCopy.getRow(index + 1).values = [undefined, ...line];
            });
            const rows = grid(german, 63);
            const header = rows[0] ?? [];
            const reversed = [header, ...rows.slice(1).reverse()];
            let bumped = 0;
            for (const line of reversed) {
                if (line[0] === 'ST-mittel') {
                    line[17] = 99;
                    bumped += 1;
                }
            }
            expect(bumped).toBe(1);
            const germanCopy = fresh.addWorksheet('Vorschlag_2_Raster');
            reversed.forEach((line, index) => {
                germanCopy.getRow(index + 1).values = [undefined, ...line];
            });

            const tampered = join(directory, 'tampered-mtm.xlsx');
            writeFileSync(tampered, Buffer.from(await fresh.xlsx.writeBuffer()));
            const checked = await readTimingLookup(tampered);
            expect(checked.rows.length).toBe(62);
            expect(checked.crossCheckIssues).toHaveLength(1);
            expect(checked.crossCheckIssues[0]).toMatch(/ST-mittel/);
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });
});
