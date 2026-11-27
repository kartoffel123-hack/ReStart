/**
 * Ticket 1 · V01 · AP203 entity index (plan 02 §3A.1).
 *
 * Reads the supplied STEP snapshot as a record stream and indexes the entities the
 * assembly needs. Three details of this export matter and are handled explicitly:
 *
 * - strings are single-quoted and escape a quote by doubling it (`''`), and a `;`
 *   inside a string must not end the record;
 * - records span multiple lines;
 * - this snapshot expresses its representation relationships as **complex entities**
 *   (`#n =( REPRESENTATION_RELATIONSHIP ( … ) …_WITH_TRANSFORMATION ( … ) … ( ) );`),
 *   so one entity carries several type/argument pairs and is indexed under each.
 *
 * Pure text processing: no filesystem, no clock, no CAD kernel.
 */

/** A `#123` reference to another entity. */
export type StepRef = Readonly<{ ref: number }>;

/** `.ENUM.` literal, a bare type constant, or the derived-value marker `*`. */
export type StepConstant = Readonly<{ constant: string }>;

/**
 * A simple-value instantiation used as a value, e.g. `LENGTH_MEASURE( 1.0, #a, #b )`
 * inside `UNCERTAINTY_MEASURE_WITH_UNIT`. Not needed by the assembly, but it must not
 * make a record unparsable.
 */
export type StepApplied = Readonly<{ applied: string; args: readonly StepValue[] }>;

/** `$` (omitted) is `null`; `*` is {@link STEP_DERIVED}. */
export type StepValue =
    | string
    | number
    | boolean
    | StepRef
    | StepConstant
    | StepApplied
    | null
    | readonly StepValue[];

export const STEP_DERIVED: StepConstant = Object.freeze({ constant: '*' });

export type StepConstituent = Readonly<{ type: string; args: readonly StepValue[] }>;

export type StepEntity = Readonly<{
    id: number;
    /** First constituent type; for a plain entity that is its only type. */
    type: string;
    /** Every constituent type in source order. Length 1 unless the entity is complex. */
    types: readonly string[];
    constituents: readonly StepConstituent[];
}>;

export type StepDiagnostic = Readonly<{
    code: 'unparsable-record' | 'dangling-reference' | 'duplicate-entity-id';
    message: string;
    entityId?: number;
}>;

export type StepIndex = Readonly<{
    entities: ReadonlyMap<number, StepEntity>;
    /** Entity IDs grouped by entity type, including each type of a complex entity. */
    byType: ReadonlyMap<string, readonly number[]>;
    count: number;
    diagnostics: readonly StepDiagnostic[];
}>;

const REF_PATTERN = /^#(\d+)$/;
const NAME_PATTERN = /^[A-Za-z_][A-Za-z_0-9]*$/;

type Token =
    | { kind: 'ref'; id: number }
    | { kind: 'number'; value: number }
    | { kind: 'string'; value: string }
    | { kind: 'boolean'; value: boolean }
    | { kind: 'constant'; value: string }
    | { kind: 'omitted' }
    | { kind: 'name'; value: string }
    | { kind: 'open' }
    | { kind: 'close' }
    | { kind: 'comma' };

/**
 * Distinguishes "this value is omitted" (`null`) from "the record did not parse".
 * `null` alone cannot do both.
 */
const PARSE_FAILED = Symbol('parse-failed');
type Parsed<T> = T | typeof PARSE_FAILED;

function isSpace(char: string | undefined): boolean {
    return char === ' ' || char === '\t' || char === '\r' || char === '\n' || char === '\f';
}

/** Split one entity body into tokens, or return null when malformed. */
function tokenize(body: string): Token[] | null {
    const tokens: Token[] = [];
    let index = 0;
    while (index < body.length) {
        const char = body[index] as string;
        if (isSpace(char)) {
            index += 1;
            continue;
        }
        if (char === '(') {
            tokens.push({ kind: 'open' });
            index += 1;
            continue;
        }
        if (char === ')') {
            tokens.push({ kind: 'close' });
            index += 1;
            continue;
        }
        if (char === ',') {
            tokens.push({ kind: 'comma' });
            index += 1;
            continue;
        }
        if (char === '$') {
            tokens.push({ kind: 'omitted' });
            index += 1;
            continue;
        }
        if (char === '*') {
            tokens.push({ kind: 'constant', value: '*' });
            index += 1;
            continue;
        }
        if (char === "'") {
            let cursor = index + 1;
            let text = '';
            let closed = false;
            while (cursor < body.length) {
                if (body[cursor] === "'") {
                    if (body[cursor + 1] === "'") {
                        text += "'";
                        cursor += 2;
                        continue;
                    }
                    closed = true;
                    cursor += 1;
                    break;
                }
                text += body[cursor];
                cursor += 1;
            }
            if (!closed) return null;
            tokens.push({ kind: 'string', value: text });
            index = cursor;
            continue;
        }

        let cursor = index;
        while (cursor < body.length && !isSpace(body[cursor])) {
            const next = body[cursor] as string;
            if (next === '(' || next === ')' || next === ',' || next === "'") break;
            cursor += 1;
        }
        const word = body.slice(index, cursor);
        index = cursor;
        if (word.length === 0) return null;
        if (word.length > 1 && word.startsWith('.') && word.endsWith('.')) {
            const literal = word.slice(1, -1);
            if (literal === 'T') tokens.push({ kind: 'boolean', value: true });
            else if (literal === 'F') tokens.push({ kind: 'boolean', value: false });
            else tokens.push({ kind: 'constant', value: literal });
            continue;
        }
        const reference = REF_PATTERN.exec(word);
        if (reference) {
            tokens.push({ kind: 'ref', id: Number(reference[1]) });
            continue;
        }
        const numeric = Number(word);
        if (Number.isFinite(numeric)) {
            tokens.push({ kind: 'number', value: numeric });
            continue;
        }
        if (NAME_PATTERN.test(word)) {
            tokens.push({ kind: 'name', value: word });
            continue;
        }
        return null;
    }
    return tokens;
}

/** Recursive-descent over one record body; `null` means the record is not parsable. */
function parseEntityBody(body: string): readonly StepConstituent[] | null {
    const tokens = tokenize(body);
    if (!tokens || tokens.length === 0) return null;
    let position = 0;
    const peek = (): Token | undefined => tokens[position];

    const parseValue = (): Parsed<StepValue> => {
        const token = peek();
        if (!token) return PARSE_FAILED;
        if (token.kind === 'open') {
            position += 1;
            const items: StepValue[] = [];
            if (peek()?.kind === 'close') {
                position += 1;
                return items;
            }
            for (;;) {
                const value = parseValue();
                if (value === PARSE_FAILED) return PARSE_FAILED;
                items.push(value);
                const separator = peek();
                if (separator?.kind === 'comma') {
                    position += 1;
                    continue;
                }
                if (separator?.kind === 'close') {
                    position += 1;
                    return items;
                }
                return PARSE_FAILED;
            }
        }
        switch (token.kind) {
            case 'ref':
                position += 1;
                return { ref: token.id };
            case 'number':
                position += 1;
                return token.value;
            case 'string':
                position += 1;
                return token.value;
            case 'boolean':
                position += 1;
                return token.value;
            case 'constant':
                position += 1;
                return { constant: token.value };
            case 'omitted':
                position += 1;
                return null;
            case 'name':
                position += 1;
                // `NAME ( … )` as a value is a simple-value instantiation, not a constant.
                if (peek()?.kind === 'open') {
                    const args = parseArguments();
                    if (args === PARSE_FAILED) return PARSE_FAILED;
                    return { applied: token.value, args };
                }
                return { constant: token.value };
            default:
                return PARSE_FAILED;
        }
    };

    const parseArguments = (): Parsed<readonly StepValue[]> => {
        if (peek()?.kind !== 'open') return PARSE_FAILED;
        position += 1;
        const args: StepValue[] = [];
        if (peek()?.kind === 'close') {
            position += 1;
            return args;
        }
        for (;;) {
            const value = parseValue();
            if (value === PARSE_FAILED) return PARSE_FAILED;
            args.push(value);
            const separator = peek();
            if (separator?.kind === 'comma') {
                position += 1;
                continue;
            }
            if (separator?.kind === 'close') {
                position += 1;
                return args;
            }
            return PARSE_FAILED;
        }
    };

    const constituents: StepConstituent[] = [];
    if (peek()?.kind === 'open') {
        position += 1; // complex entity: =( TYPE ( … ) TYPE ( … ) )
        while (peek() && peek()?.kind !== 'close') {
            const name = peek();
            if (name?.kind !== 'name') return null;
            position += 1;
            const args = parseArguments();
            if (args === PARSE_FAILED) return null;
            constituents.push({ type: name.value, args });
        }
        if (peek()?.kind !== 'close') return null;
        position += 1;
    } else {
        const name = peek();
        if (name?.kind !== 'name') return null;
        position += 1;
        const args = parseArguments();
        if (args === PARSE_FAILED) return null;
        constituents.push({ type: name.value, args });
    }
    return position === tokens.length && constituents.length > 0 ? constituents : null;
}

/**
 * Remove `/* … *\/` comments before splitting records.
 *
 * A comment is not inside a string, but a `/*` inside a quoted string is literal text, so
 * this tracks quoting. Left in place, a comment between two records would be glued onto the
 * following record and make it unparsable.
 */
function stripComments(source: string): string {
    if (!source.includes('/*')) return source;
    let output = '';
    let index = 0;
    let inString = false;
    while (index < source.length) {
        const char = source[index] as string;
        if (inString) {
            output += char;
            if (char === "'") {
                if (source[index + 1] === "'") {
                    output += "'";
                    index += 2;
                    continue;
                }
                inString = false;
            }
            index += 1;
            continue;
        }
        if (char === "'") {
            inString = true;
            output += char;
            index += 1;
            continue;
        }
        if (char === '/' && source[index + 1] === '*') {
            const end = source.indexOf('*/', index + 2);
            index = end < 0 ? source.length : end + 2;
            output += ' ';
            continue;
        }
        output += char;
        index += 1;
    }
    return output;
}

/** Locate the DATA section so header text is never mistaken for a record. */
function dataSection(source: string): string {
    const uncommented = stripComments(source);
    const start = uncommented.search(/^DATA\s*;[ \t]*$/m);
    if (start < 0) return uncommented;
    const bodyStart = uncommented.indexOf('\n', start) + 1;
    const end = uncommented.search(/^ENDSEC\s*;[ \t]*$/m);
    return end > bodyStart ? uncommented.slice(bodyStart, end) : uncommented.slice(bodyStart);
}

/**
 * Index every entity in the DATA section. A record that cannot be parsed is reported
 * as a diagnostic instead of being dropped silently, so a dataset revision change is loud.
 */
export function parseStepEntities(source: string): StepIndex {
    const data = dataSection(source);
    const entities = new Map<number, StepEntity>();
    const diagnostics: StepDiagnostic[] = [];
    const byType = new Map<string, number[]>();

    let recordStart = 0;
    let inString = false;
    for (let cursor = 0; cursor <= data.length; cursor += 1) {
        const char = cursor < data.length ? data[cursor] : undefined;
        if (char === "'") {
            inString = !inString;
            continue;
        }
        const atEnd = cursor === data.length;
        if (inString || (char !== ';' && !atEnd)) continue;

        const record = data.slice(recordStart, cursor).trim();
        recordStart = cursor + 1;
        if (record.length === 0) continue;
        if (/^ENDSEC$/i.test(record)) break;

        const assignment = /^#(\d+)\s*=([\s\S]*)$/.exec(record);
        if (!assignment) {
            diagnostics.push({
                code: 'unparsable-record',
                message: `Not an entity assignment: ${record.slice(0, 60)}`
            });
            continue;
        }
        const id = Number(assignment[1]);
        const constituents = parseEntityBody((assignment[2] ?? '').trim());
        if (!constituents) {
            diagnostics.push({
                code: 'unparsable-record',
                message: `Unparsable entity body: ${record.slice(0, 60)}`,
                entityId: id
            });
            continue;
        }
        if (entities.has(id)) {
            diagnostics.push({ code: 'duplicate-entity-id', message: `Repeated entity id #${id}`, entityId: id });
            continue;
        }
        const entity: StepEntity = {
            id,
            type: (constituents[0] as StepConstituent).type,
            types: constituents.map((constituent) => constituent.type),
            constituents
        };
        entities.set(id, entity);
        for (const type of entity.types) {
            const bucket = byType.get(type);
            if (bucket) bucket.push(id);
            else byType.set(type, [id]);
        }
    }

    return { entities, byType, count: entities.size, diagnostics };
}

/** Every entity reference inside a value tree, in source order, without duplicates. */
export function refsIn(value: StepValue | readonly StepValue[]): number[] {
    const found: number[] = [];
    const seen = new Set<number>();
    const walk = (node: StepValue | readonly StepValue[]): void => {
        if (Array.isArray(node)) {
            for (const child of node) walk(child);
            return;
        }
        if (node !== null && typeof node === 'object' && 'ref' in node) {
            if (!seen.has(node.ref)) {
                seen.add(node.ref);
                found.push(node.ref);
            }
            return;
        }
        if (node !== null && typeof node === 'object' && 'applied' in node) walk(node.args);
    };
    walk(value);
    return found;
}

export function entityOf(index: StepIndex, id: number | undefined): StepEntity | undefined {
    return id === undefined ? undefined : index.entities.get(id);
}

export function entitiesOfType(index: StepIndex, type: string): readonly StepEntity[] {
    const ids = index.byType.get(type) ?? [];
    const found: StepEntity[] = [];
    for (const id of ids) {
        const entity = index.entities.get(id);
        if (entity) found.push(entity);
    }
    return found;
}

/** Arguments of a named constituent, or of the first constituent when `type` is omitted. */
export function argsOf(entity: StepEntity | undefined, type?: string): readonly StepValue[] {
    if (!entity) return [];
    if (type === undefined) return (entity.constituents[0] as StepConstituent).args;
    return entity.constituents.find((constituent) => constituent.type === type)?.args ?? [];
}

/** `#ref` at an argument position, or undefined when the argument is absent or omitted. */
export function refAt(entity: StepEntity | undefined, position: number): number | undefined {
    const value = argsOf(entity)[position];
    return value !== null && typeof value === 'object' && !Array.isArray(value) && 'ref' in value
        ? value.ref
        : undefined;
}

/** The reference at `position`, but only when it points at an entity of `type`. */
export function refOfType(
    index: StepIndex,
    entity: StepEntity | undefined,
    position: number,
    type: string
): number | undefined {
    const id = refAt(entity, position);
    const target = entityOf(index, id);
    return target && target.types.includes(type) ? target.id : undefined;
}

export function stringAt(entity: StepEntity | undefined, position: number): string | undefined {
    const value = argsOf(entity)[position];
    return typeof value === 'string' ? value : undefined;
}
