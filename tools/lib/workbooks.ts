/**
 * Ticket 2 · V01/V07 · workbook import (plan 02 §3A.6).
 *
 * Three supplied workbooks, three different jobs:
 * - `Components.xlsx` / `Teileliste` is the inventory: 31 part types whose quantities sum to
 *   the 70 physical pieces, joined to the STEP by the supplied CAD name.
 * - `BoM_Helicopter_LEGO.xlsx` is one row per piece with mass, volume and a functional-unit
 *   suggestion.
 * - `MTM_Mapping_Connection_V3.xlsx` maps a connection class to a disassembly time.
 *
 * Two of those are hypothetical by design. The colour legend maps colours to *invented*
 * materials and the MTM times are *fictitious*, so both leave this module carrying their
 * provenance: a downstream screen cannot display them as measured data by accident.
 *
 * Rows are located by header text rather than by column letter where a header exists, so a
 * supplied column cannot shift meaning silently; the resolved letters are reported so the
 * plan's stated letters can be checked.
 */
import ExcelJS from 'exceljs';
import { resolve } from 'node:path';
import type { Occurrence } from './step-tree.js';

/** The colour/material legend is a challenge fiction, not measured material data. */
export const MATERIAL_PROVENANCE =
    'challenge assumption: the supplied colour-to-material legend is hypothetical, not measured material data';

/** The MTM lookup is a challenge fiction, not measured times. */
export const TIMING_PROVENANCE =
    'challenge assumption: the supplied MTM times are fictitious, not measured disassembly times';

function cellText(cell: ExcelJS.Cell): string {
    const value = cell.value as unknown;
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        const object = value as Record<string, unknown>;
        if (Array.isArray(object.richText)) {
            return (object.richText as Array<{ text: string }>).map((part) => part.text).join('');
        }
        if (typeof object.result === 'string' || typeof object.result === 'number') {
            return String(object.result);
        }
        if (typeof object.text === 'string') return object.text;
        return '';
    }
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        return String(value);
    }
    return '';
}

function cellNumber(cell: ExcelJS.Cell): number | null {
    const text = cellText(cell).trim();
    if (text === '') return null;
    const parsed = Number(text.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

async function sheet(path: string, name: string): Promise<ExcelJS.Worksheet> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(resolve(path));
    const worksheet = workbook.getWorksheet(name);
    if (worksheet === undefined) {
        throw new Error(`${path} has no sheet named "${name}"`);
    }
    return worksheet;
}

/** Header row of a sheet, found by a cell that must be in it, so a moved header is caught. */
function findHeaderRow(worksheet: ExcelJS.Worksheet, required: string, limit = 12): number {
    for (let row = 1; row <= Math.min(worksheet.rowCount, limit); row += 1) {
        for (let column = 1; column <= worksheet.columnCount; column += 1) {
            if (cellText(worksheet.getCell(row, column)).trim() === required) return row;
        }
    }
    throw new Error(`${worksheet.name}: no header row containing "${required}"`);
}

function columnByHeader(
    worksheet: ExcelJS.Worksheet,
    headerRow: number,
    header: string,
    issues?: string[]
): number | undefined {
    for (let column = 1; column <= worksheet.columnCount; column += 1) {
        if (cellText(worksheet.getCell(headerRow, column)).trim() === header) return column;
    }
    issues?.push(`${worksheet.name}: column "${header}" is missing`);
    return undefined;
}

function readColumn(worksheet: ExcelJS.Worksheet, row: number, column: number | undefined): string {
    return column === undefined ? '' : cellText(worksheet.getCell(row, column)).trim();
}

// ---------------------------------------------------------------- inventory

export type InventoryRow = Readonly<{
    /** Spreadsheet row, so any claim about a part traces back to a cell. */
    row: number;
    elementId: string;
    bricksetName: string;
    /** The CAD name used by the STEP assembly; matched verbatim, spelling included. */
    stepName: string;
    color: string;
    materialType: string;
    materialNumber: string;
    designNo: string;
    quantity: number;
    provenance: string;
}>;

export type Inventory = Readonly<{
    rows: readonly InventoryRow[];
    /** The sheet's own total row, kept separate so a mismatch is visible. */
    declaredTotal: number | null;
    issues: readonly string[];
}>;

/**
 * Read `Teileliste`: header row 3, data rows 4-34, quantity in column G, colour in column D,
 * and row 35 holding the total. Positions are derived from the header and the first empty
 * Element-ID rather than hardcoded, so a revision that shifts the block is reported instead
 * of quietly read from the wrong rows.
 */
export async function readInventory(path: string): Promise<Inventory> {
    const worksheet = await sheet(path, 'Teileliste');
    const headerRow = findHeaderRow(worksheet, 'Element-ID');
    const column = {
        elementId: columnByHeader(worksheet, headerRow, 'Element-ID'),
        bricksetName: columnByHeader(worksheet, headerRow, 'Name (Brickset)'),
        color: columnByHeader(worksheet, headerRow, 'Color'),
        materialType: columnByHeader(worksheet, headerRow, 'Material Type'),
        materialNumber: columnByHeader(worksheet, headerRow, 'Material number (designation)'),
        quantity: columnByHeader(worksheet, headerRow, 'Quantity'),
        designNo: columnByHeader(worksheet, headerRow, 'Design-No.'),
        stepName: columnByHeader(worksheet, headerRow, 'Component name (STEP assembly)')
    };
    const issues: string[] = [];
    const rows: InventoryRow[] = [];
    let row = headerRow + 1;
    for (; row <= worksheet.rowCount; row += 1) {
        const elementId = readColumn(worksheet, row, column.elementId);
        const stepName = readColumn(worksheet, row, column.stepName);
        if (elementId === '' && stepName === '') break;
        if (stepName === '') {
            issues.push(`Teileliste row ${row}: inventory row without a STEP component name`);
            continue;
        }
        const quantity = cellNumber(worksheet.getCell(row, column.quantity ?? 1)) ?? 0;
        if (quantity <= 0) issues.push(`Teileliste row ${row}: quantity ${quantity} is not positive`);
        rows.push({
            row,
            elementId,
            bricksetName: readColumn(worksheet, row, column.bricksetName),
            stepName,
            color: readColumn(worksheet, row, column.color),
            materialType: readColumn(worksheet, row, column.materialType),
            materialNumber: readColumn(worksheet, row, column.materialNumber),
            designNo: readColumn(worksheet, row, column.designNo),
            quantity,
            provenance: MATERIAL_PROVENANCE
        });
    }

    // The total sits just below the block (row 35 on the supplied file).
    let declaredTotal: number | null = null;
    for (let probe = row; probe <= row + 4 && probe <= worksheet.rowCount; probe += 1) {
        const value = cellNumber(worksheet.getCell(probe, column.quantity ?? 1));
        if (value !== null && value > 0) {
            declaredTotal = value;
            break;
        }
    }
    if (declaredTotal === null) {
        issues.push('Teileliste: no total row found below the inventory block');
    } else {
        const sum = rows.reduce((total, entry) => total + entry.quantity, 0);
        if (sum !== declaredTotal) {
            issues.push(`Teileliste: quantities sum to ${sum}, the sheet declares ${declaredTotal}`);
        }
    }
    return { rows, declaredTotal, issues };
}

// ---------------------------------------------------------------- bill of materials

export type BillOfMaterialsRow = Readonly<{
    row: number;
    hierarchy: string;
    /** The subassembly level, or null when the row hangs directly off the root. */
    module: string | null;
    partName: string;
    componentLabel: string;
    /** The `#n` instance mark on the component label, when the sheet supplied one. */
    instanceMark: number | null;
    functionalUnitCandidate: string;
    volumeCm3: number | null;
    massG: number | null;
    contacts: string;
    /** `unique` only when no other row shares the part name. */
    rowLink: 'unique' | 'ambiguous';
}>;

export type BillOfMaterials = Readonly<{
    rows: readonly BillOfMaterialsRow[];
    /** One label per row; 1:1 with rows means the column groups nothing (see below). */
    candidateUnits: ReadonlyArray<Readonly<{ row: number; label: string; partName: string }>>;
    functionalUnitsNeedReview: boolean;
    uniqueRows: number;
    ambiguousRows: number;
    /** Informational: things a reviewer should know that do not invalidate the import. */
    notices: readonly string[];
}>;

const MODULE_PATTERN = /^Stage\b/i;

/** Read the `Bill of Materials` sheet: one row per physical piece, 70 on this revision. */
export async function readBillOfMaterials(path: string): Promise<BillOfMaterials> {
    const worksheet = await sheet(path, 'Bill of Materials');
    const headerRow = findHeaderRow(worksheet, 'Product Hierarchy');
    const column = {
        hierarchy: columnByHeader(worksheet, headerRow, 'Product Hierarchy'),
        component: columnByHeader(worksheet, headerRow, 'Component Name'),
        unit: columnByHeader(worksheet, headerRow, 'Functional Unit'),
        volume: columnByHeader(worksheet, headerRow, 'Volume (cm³)'),
        mass: columnByHeader(worksheet, headerRow, 'Mass (g)'),
        contacts: columnByHeader(worksheet, headerRow, 'Contacts / Nearby')
    };
    const issues: string[] = [];
    const raw: Omit<BillOfMaterialsRow, 'rowLink'>[] = [];
    for (let row = headerRow + 1; row <= worksheet.rowCount; row += 1) {
        const hierarchy = readColumn(worksheet, row, column.hierarchy);
        if (hierarchy === '') continue;
        const segments = hierarchy.split('/').map((segment) => segment.trim()).filter((segment) => segment !== '');
        const partName = segments[segments.length - 1] ?? '';
        if (partName === '') {
            issues.push(`Bill of Materials row ${row}: empty product hierarchy`);
            continue;
        }
        const parent = segments.length >= 3 ? (segments[segments.length - 2] ?? '') : '';
        const componentLabel = readColumn(worksheet, row, column.component);
        const mark = /#(\d+)$/.exec(componentLabel)?.[1];
        raw.push({
            row,
            hierarchy,
            module: MODULE_PATTERN.test(parent) ? parent : null,
            partName,
            componentLabel,
            instanceMark: mark === undefined ? null : Number(mark),
            functionalUnitCandidate: readColumn(worksheet, row, column.unit),
            volumeCm3: cellNumber(worksheet.getCell(row, column.volume ?? 1)),
            massG: cellNumber(worksheet.getCell(row, column.mass ?? 1)),
            contacts: readColumn(worksheet, row, column.contacts)
        });
    }

    const byName = new Map<string, number>();
    for (const entry of raw) byName.set(entry.partName, (byName.get(entry.partName) ?? 0) + 1);
    const rows: BillOfMaterialsRow[] = raw.map((entry) => ({
        ...entry,
        rowLink: (byName.get(entry.partName) ?? 0) === 1 ? 'unique' : 'ambiguous'
    }));

    // Every repeated name on this revision does carry complete `#1..#n` marks, but nothing in
    // the STEP ties mark `#n` to a particular usage path, so a repeated name still cannot stand
    // for one physical piece without a revision-bound mapping (plan 02 §3A.6). Rows are joined
    // at type level and marked ambiguous; `instanceMark` is kept so a reviewed mapping can be
    // recorded against it later. Incomplete marks would be a defect in the supplied data.
    for (const [name, count] of [...byName].sort((a, b) => a[0].localeCompare(b[0]))) {
        if (count <= 1) continue;
        const marked = rows.filter((entry) => entry.partName === name && entry.instanceMark !== null);
        if (marked.length !== count) {
            issues.push(
                `Bill of Materials: "${name}" has ${count} rows but only ${marked.length} instance marks`
            );
        }
    }

    const labels = new Set(rows.map((entry) => entry.functionalUnitCandidate));
    return {
        rows,
        candidateUnits: rows.map((entry) => ({
            row: entry.row,
            label: entry.functionalUnitCandidate,
            partName: entry.partName
        })),
        // One distinct label per row groups nothing, so the functional-unit model still needs
        // membership reviewed on the physical assembly (plan 02 §3C.1).
        functionalUnitsNeedReview: rows.length > 0 && labels.size >= rows.length,
        uniqueRows: rows.filter((entry) => entry.rowLink === 'unique').length,
        ambiguousRows: rows.filter((entry) => entry.rowLink === 'ambiguous').length,
        notices: issues.map((message) => `${message}; joined at type level only`)
    };
}

// ---------------------------------------------------------------- reconciliation

export type JoinedType = Readonly<{
    stepName: string;
    /** Quantity declared by the parts list. */
    quantity: number;
    /** Occurrences actually expanded from the STEP. */
    occurrences: number;
    occurrenceIds: readonly string[];
    row: number;
    color: string;
    materialType: string;
    materialNumber: string;
    bricksetName: string;
    designNo: string;
    elementId: string;
    bomRows: readonly number[];
    rowLink: 'unique' | 'ambiguous';
    functionalUnitCandidates: readonly string[];
    massG: number | null;
    volumeCm3: number | null;
    provenance: string;
}>;

export type JoinedSources = Readonly<{
    types: readonly JoinedType[];
    unmatchedInventory: readonly string[];
    unmatchedOccurrences: readonly string[];
    /** BoM rows whose part name equals the occurrence at the same index; low by design. */
    positionalAgreement: number;
    uniqueRows: number;
    ambiguousRows: number;
    functionalUnitsNeedReview: boolean;
    issues: readonly string[];
    /** Ambiguity a reviewer must resolve, as opposed to a join that no longer holds. */
    notices: readonly string[];
}>;

/**
 * Reconcile the three sources against the expanded assembly. Quantities are checked per type,
 * not only in total: one type short and another long keeps the sum at 70 while describing a
 * different assembly.
 */
export function joinSources(input: Readonly<{
    inventory: Inventory;
    bom: BillOfMaterials;
    occurrences: readonly Occurrence[];
}>): JoinedSources {
    const { inventory, bom, occurrences } = input;
    const issues: string[] = [...inventory.issues];
    const notices: string[] = [...bom.notices];
    if (bom.functionalUnitsNeedReview) {
        notices.push(
            `Bill of Materials: ${bom.rows.length} distinct functional-unit labels for ${bom.rows.length} rows; ` +
                'they are candidates only and functional-unit membership still needs review on the kit'
        );
    }
    if (bom.ambiguousRows > 0) {
        notices.push(
            `Bill of Materials: ${bom.ambiguousRows} rows share a part name and are joined at type level, not to a piece`
        );
    }

    const occurrenceIdsByName = new Map<string, string[]>();
    for (const occurrence of occurrences) {
        const bucket = occurrenceIdsByName.get(occurrence.name);
        if (bucket === undefined) occurrenceIdsByName.set(occurrence.name, [occurrence.id]);
        else bucket.push(occurrence.id);
    }
    const bomRowsByName = new Map<string, BillOfMaterialsRow[]>();
    for (const row of bom.rows) {
        const bucket = bomRowsByName.get(row.partName);
        if (bucket === undefined) bomRowsByName.set(row.partName, [row]);
        else bucket.push(row);
    }

    const types: JoinedType[] = [];
    const seen = new Set<string>();
    for (const entry of inventory.rows) {
        if (seen.has(entry.stepName)) {
            issues.push(`Teileliste row ${entry.row}: "${entry.stepName}" is listed twice`);
            continue;
        }
        seen.add(entry.stepName);
        const ids = occurrenceIdsByName.get(entry.stepName) ?? [];
        const rows = bomRowsByName.get(entry.stepName) ?? [];
        if (ids.length !== entry.quantity) {
            issues.push(
                `${entry.stepName}: parts list declares ${entry.quantity}, the assembly has ${ids.length}`
            );
        }
        if (ids.length === 0) {
            issues.push(`${entry.stepName}: listed in the parts list but absent from the assembly`);
        }
        if (rows.length !== entry.quantity) {
            issues.push(
                `${entry.stepName}: parts list declares ${entry.quantity}, the bill of materials has ${rows.length} rows`
            );
        }
        const masses = rows.map((row) => row.massG).filter((value): value is number => value !== null);
        const volumes = rows.map((row) => row.volumeCm3).filter((value): value is number => value !== null);
        types.push({
            stepName: entry.stepName,
            quantity: entry.quantity,
            occurrences: ids.length,
            occurrenceIds: [...ids].sort(),
            row: entry.row,
            color: entry.color,
            materialType: entry.materialType,
            materialNumber: entry.materialNumber,
            bricksetName: entry.bricksetName,
            designNo: entry.designNo,
            elementId: entry.elementId,
            bomRows: rows.map((row) => row.row).sort((a, b) => a - b),
            rowLink: rows.length === 1 ? 'unique' : 'ambiguous',
            functionalUnitCandidates: [...new Set(rows.map((row) => row.functionalUnitCandidate))].sort(),
            massG: masses.length === rows.length && masses.length > 0 ? masses[0] ?? null : null,
            volumeCm3: volumes.length === rows.length && volumes.length > 0 ? volumes[0] ?? null : null,
            provenance: entry.provenance
        });
    }
    types.sort((a, b) => a.stepName.localeCompare(b.stepName));

    const unmatchedInventory = inventory.rows
        .map((entry) => entry.stepName)
        .filter((name) => !occurrenceIdsByName.has(name))
        .sort();
    const unmatchedOccurrences = [...occurrenceIdsByName.keys()]
        .filter((name) => !seen.has(name))
        .sort();
    for (const name of unmatchedOccurrences) {
        issues.push(`${name}: present in the assembly but missing from the parts list`);
    }

    let positionalAgreement = 0;
    for (let index = 0; index < Math.min(bom.rows.length, occurrences.length); index += 1) {
        if (bom.rows[index]?.partName === occurrences[index]?.name) positionalAgreement += 1;
    }

    return {
        types,
        unmatchedInventory,
        unmatchedOccurrences,
        positionalAgreement,
        uniqueRows: bom.uniqueRows,
        ambiguousRows: bom.ambiguousRows,
        functionalUnitsNeedReview: bom.functionalUnitsNeedReview,
        issues,
        notices: [...notices].sort()
    };
}

// ---------------------------------------------------------------- timing lookup

export type TimingRow = Readonly<{
    row: number;
    rowId: string;
    connectionType: string;
    dinCategory: string;
    dinSubcategory: string;
    massKg: number | null;
    dimensionLmm: number | null;
    distanceClass: string;
    pickupGripClass: string;
    placementFit: string;
    /** Seconds per connection. Fictitious: the workbook is a challenge lookup, not a study. */
    secondsPerConnection: number | null;
    mappingQuality: string;
    rationale: string;
    /** German MTM sheet's unrounded base time before the worst-case allowance. */
    germanBaseSeconds: number | null;
    /** German MTM sheet's worst-case estimate (+30%); selected for the dependency graph. */
    germanWorstCaseSeconds: number | null;
    /** Rounded German display value, cross-checked against the English lookup. */
    germanSeconds: number | null;
}>;

export type TimingLookup = Readonly<{
    rows: readonly TimingRow[];
    /** Disagreements between the English and German sheets, keyed by Row_ID. */
    crossCheckIssues: readonly string[];
    provenance: string;
    secondsFor: (rowId: string) => number | null;
}>;

const ENGLISH_SHEET = 'Vorschlag_2_Grid_EN';
const GERMAN_SHEET = 'Vorschlag_2_Raster';

/**
 * Read the connection timing lookup. The English sheet supplies the rounded `Time_per_Connection`
 * keyed by `Row_ID`; the German sheet supplies exact base/worst-case values and is cross-checked
 * **by ID**, never by row position, because the two sheets are independent copies.
 */
export async function readTimingLookup(path: string): Promise<TimingLookup> {
    const english = await sheet(path, ENGLISH_SHEET);
    const german = await sheet(path, GERMAN_SHEET);
    const headerRow = findHeaderRow(english, 'Row_ID');
    const column = {
        rowId: columnByHeader(english, headerRow, 'Row_ID'),
        connectionType: columnByHeader(english, headerRow, 'Connection_Type (DIN 8593)'),
        dinCategory: columnByHeader(english, headerRow, 'DIN_Category'),
        dinSubcategory: columnByHeader(english, headerRow, 'DIN_Subcategory'),
        massKg: columnByHeader(english, headerRow, 'Mass_kg'),
        dimensionLmm: columnByHeader(english, headerRow, 'Dimension_L_mm'),
        distanceClass: columnByHeader(english, headerRow, 'Distance_Class'),
        pickupGripClass: columnByHeader(english, headerRow, 'Pickup_Grip_Class'),
        placementFit: columnByHeader(english, headerRow, 'Placement_Fit'),
        seconds: columnByHeader(english, headerRow, 'Time_per_Connection'),
        quality: columnByHeader(english, headerRow, 'Mapping_Quality'),
        rationale: columnByHeader(english, headerRow, 'Rationale')
    };

    const germanHeaderRow = findHeaderRow(german, 'Zeilen_ID');
    const germanIdColumn = columnByHeader(german, germanHeaderRow, 'Zeilen_ID');
    const germanBaseSecondsColumn = columnByHeader(german, germanHeaderRow, 'Zeit_Sekunden');
    const germanWorstCaseSecondsColumn = columnByHeader(
        german,
        germanHeaderRow,
        'Worst_Case_Sekunden (+30%)'
    );
    const germanSecondsColumn = columnByHeader(german, germanHeaderRow, 'Zeiten je Verbindung');
    const germanTiming = new Map<
        string,
        { baseSeconds: number | null; worstCaseSeconds: number | null; roundedSeconds: number | null }
    >();
    for (let row = germanHeaderRow + 1; row <= german.rowCount; row += 1) {
        const id = germanIdColumn === undefined ? '' : cellText(german.getCell(row, germanIdColumn)).trim();
        if (id === '') continue;
        germanTiming.set(id, {
            baseSeconds:
                germanBaseSecondsColumn === undefined
                    ? null
                    : cellNumber(german.getCell(row, germanBaseSecondsColumn)),
            worstCaseSeconds:
                germanWorstCaseSecondsColumn === undefined
                    ? null
                    : cellNumber(german.getCell(row, germanWorstCaseSecondsColumn)),
            roundedSeconds:
                germanSecondsColumn === undefined
                    ? null
                    : cellNumber(german.getCell(row, germanSecondsColumn))
        });
    }

    const rows: TimingRow[] = [];
    const crossCheckIssues: string[] = [];
    for (let row = headerRow + 1; row <= english.rowCount; row += 1) {
        const rowId = readColumn(english, row, column.rowId);
        if (rowId === '') continue;
        const seconds = cellNumber(english.getCell(row, column.seconds ?? 1));
        const germanValue = germanTiming.get(rowId);
        if (!germanTiming.has(rowId)) {
            crossCheckIssues.push(`${rowId}: absent from the German sheet`);
        } else if (germanValue?.roundedSeconds !== seconds) {
            crossCheckIssues.push(
                `${rowId}: English ${seconds ?? 'blank'} s, German ${germanValue?.roundedSeconds ?? 'blank'} s`
            );
        }
        rows.push({
            row,
            rowId,
            connectionType: readColumn(english, row, column.connectionType),
            dinCategory: readColumn(english, row, column.dinCategory),
            dinSubcategory: readColumn(english, row, column.dinSubcategory),
            massKg: cellNumber(english.getCell(row, column.massKg ?? 1)),
            dimensionLmm: cellNumber(english.getCell(row, column.dimensionLmm ?? 1)),
            distanceClass: readColumn(english, row, column.distanceClass),
            pickupGripClass: readColumn(english, row, column.pickupGripClass),
            placementFit: readColumn(english, row, column.placementFit),
            secondsPerConnection: seconds,
            mappingQuality: readColumn(english, row, column.quality),
            rationale: readColumn(english, row, column.rationale),
            germanBaseSeconds: germanValue?.baseSeconds ?? null,
            germanWorstCaseSeconds: germanValue?.worstCaseSeconds ?? null,
            germanSeconds: germanValue?.roundedSeconds ?? null
        });
    }

    const byId = new Map(rows.map((row) => [row.rowId, row.secondsPerConnection]));
    return {
        rows,
        crossCheckIssues,
        provenance: TIMING_PROVENANCE,
        // An unmapped operation stays unknown; the plan forbids estimating it.
        secondsFor: (rowId: string) => byId.get(rowId) ?? null
    };
}
