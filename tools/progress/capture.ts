/**
 * Progress capture (implementation plan §8). Builds nothing: it runs the Vite dev
 * server, drives the real page in Chromium at the gate viewports, and writes
 * PNGs plus notes.md under docs/progress/<date>-<slug>/. Run it before every
 * commit. When the commit has no rendered surface, §8.3 asks for the measured output
 * instead of a re-shot placeholder: pass --evidence-file and the tool renders that text
 * into the folder as an image. Screenshots here are a progress trail, never release
 * evidence.
 */
import { createServer } from 'vite';
import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { findPreviousCapture } from './previous-capture.js';
import { VISUALLY_IDENTICAL_FRACTION, comparePngBuffers } from './png-diff.js';
import {
    EVIDENCE_FILE_NAME,
    EVIDENCE_VIEWPORT,
    evidenceHtml,
    requireEvidenceBody
} from './evidence-panel.js';
import {
    isPlaceholderStub,
    layoutId,
    layoutSignature,
    placeholderFiles,
    redundantStubs,
    sameLayoutGroups,
    type ScreenNode
} from './screen-signature.js';
import { GATE_VIEWPORTS, SCENARIOS, type Scenario, type Viewport } from './scenarios.js';

/** One PNG in a capture folder, with the facts notes.md reports about it. */
type Capture = {
    file: string;
    scenario: Scenario;
    viewport: Viewport;
    digest: string;
    bytes: Buffer;
    /** Layout identity of the rendered screen; wording is excluded. */
    layout: string;
    /** True while a placeholder stands in for the screen this scenario names. */
    stub: boolean;
    /** Pixels differing from this scenario's capture in the previous folder. */
    previous?: { folder: string; fraction: number };
};

/** Stands in for a screen in the highlights table when §8.3 renders the evidence panel. */
const EVIDENCE_SCENARIO: Scenario = {
    id: 'evidence',
    label: 'Evidence panel',
    route: '(rendered by the capture tool)',
    highlights:
        'Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet.'
};

type Args = Readonly<{
    title: string;
    slug: string;
    commands: readonly string[];
    verificationRows: readonly string[];
    only: readonly string[];
    note?: string;
    /** Path to the measured output rendered as the panel required by §8.3. */
    evidenceFile?: string;
}>;

function parseArgs(argv: readonly string[]): Args {
    const read = (flag: string): string | undefined => {
        const index = argv.indexOf(flag);
        return index >= 0 ? argv[index + 1] : undefined;
    };
    const title = read('--title') ?? 'progress capture';
    const normalised = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    // Trim on a word boundary so folder names stay readable.
    const clipped = normalised.slice(0, 48);
    const derived = normalised.length <= 48 ? normalised : clipped.replace(/-+$/, '');
    const slug = read('--slug') ?? (derived.length > 0 ? derived : 'progress-capture');
    const list = (flag: string): string[] =>
        (read(flag) ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
    const note = read('--note');
    const evidenceFile = read('--evidence-file');
    return {
        title,
        slug,
        commands: list('--commands'),
        verificationRows: list('--rows'),
        only: list('--only'),
        ...(note === undefined ? {} : { note }),
        ...(evidenceFile === undefined ? {} : { evidenceFile })
    };
}

function git(args: readonly string[]): string {
    try {
        return execFileSync('git', [...args], { encoding: 'utf8' }).trim();
    } catch {
        return '';
    }
}

function stamp(): string {
    const now = new Date();
    const pad = (value: number): string => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Read the §8.3 panel body, with a message that says what to do about a bad path. */
function readEvidence(source: string): string {
    let raw: string;
    try {
        raw = readFileSync(source, 'utf8');
    } catch {
        throw new Error(
            `--evidence-file ${source} could not be read. Pass a file holding the measured ` +
                'output this commit produced, or drop the flag and pass --note.'
        );
    }
    return requireEvidenceBody(raw, source);
}

async function capture(
    page: Page,
    origin: string,
    scenario: Scenario,
    viewport: Viewport,
    file: string
): Promise<{ layout: string; stub: boolean }> {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${origin}/${scenario.route}`, { waitUntil: 'networkidle' });
    if (scenario.setup === 'cross-block') {
        await page.evaluate(() => sessionStorage.clear());
        await page.reload();
        await page.getByRole('combobox', {name:'Occurrence'}).selectOption('30465/NAUO17/NAUO56');
        await page.getByRole('button', {name:/select cross block/i}).click();
        for (let i = 0; i < 14; i++) await page.getByRole('button', {name:'Confirm this step'}).click();
        await page.getByRole('region', {name:'This step'}).getByText(/slide the cross block sideways/i).first().waitFor();
    }
    if (scenario.setup === 'expand-nauo56-sequence') {
        const sequence = page.getByRole('region', { name: 'Reparaturablauf' });
        for (const summary of await sequence.locator('summary').all()) await summary.click();
    }
    if(scenario.setup==='buried-pin') {
        await page.evaluate(()=>sessionStorage.clear());await page.reload();
        await page.getByRole('combobox',{name:'Occurrence'}).selectOption('30465/NAUO33/NAUO38');
        await page.getByRole('button',{name:/Select friction pin with stud/i}).click();
        await page.getByRole('button',{name:'Confirm this step'}).click();
        await page.locator('.rs-manual__instruction').filter({hasText:'pull the blue pin'}).waitFor();
    }
    if(scenario.setup==='blocked-preview') {
        await page.getByRole('button',{name:'Restore baseline'}).click();
        await page.getByRole('status').filter({hasText:'Draft: 4 steps'}).waitFor();
        await page.getByLabel('Reason',{exact:true}).fill('The handle needs this connection released.');
        await page.getByRole('button',{name:'Add blocker'}).click();
        await page.getByRole('status').filter({hasText:'Draft: 6 steps'}).waitFor();
    }
    if (scenario.waitFor !== undefined) {
        await page.waitForSelector(scenario.waitFor, { timeout: 15_000 });
    }
    // Read the structure before the pixels: a screen that only differs in wording has to
    // be reported as the same screen, which no pixel comparison can establish on its own.
    const screen = await readScreen(page);
    await page.screenshot({ path: file, fullPage: scenario.fullPage ?? false });
    return { layout: layoutSignature(screen), stub: isPlaceholderStub(screen) };
}

/**
 * Walk the mounted screen into a `ScreenNode` tree. Text and attributes are dropped on the
 * way out, so the result describes layout only; `data-placeholder` survives as the stub flag.
 */
async function readScreen(page: Page): Promise<ScreenNode> {
    return page.evaluate(() => {
        // No inner named function goes in here: the bundler preserves function names by
        // calling a `__name` helper that exists in Node but not inside the page, so a
        // recursive `walk` serialises into a ReferenceError. This loop stays function-free.
        type Mutable = {
            tag: string;
            classes: string[];
            placeholder?: boolean;
            children: Mutable[];
        };
        type Pending = { element: Element; depth: number; parent: Mutable[] };
        const MAX_NODES = 800;
        const MAX_DEPTH = 16;
        const rootElement = document.querySelector('#root') ?? document.body;
        const root: Mutable = {
            tag: rootElement.tagName.toLowerCase(),
            classes: Array.from(rootElement.classList),
            children: []
        };
        if (rootElement.hasAttribute('data-placeholder')) root.placeholder = true;
        const pending: Pending[] = [{ element: rootElement, depth: 0, parent: root.children }];
        let seen = 0;
        while (pending.length > 0 && seen < MAX_NODES) {
            const current = pending.pop();
            if (current === undefined) break;
            if (current.depth >= MAX_DEPTH) continue;
            for (const child of Array.from(current.element.children)) {
                if (seen >= MAX_NODES) break;
                seen += 1;
                const node: Mutable = {
                    tag: child.tagName.toLowerCase(),
                    classes: Array.from(child.classList),
                    children: []
                };
                if (child.hasAttribute('data-placeholder')) node.placeholder = true;
                current.parent.push(node);
                pending.push({ element: child, depth: current.depth + 1, parent: node.children });
            }
        }
        return root;
    });
}

/** Captures that render the same pixels, compared only within one viewport size. */
function identicalGroups(
    written: readonly { file: string; viewport: Viewport; bytes: Buffer }[]
): string[][] {
    const groups: { viewport: string; files: string[]; bytes: Buffer }[] = [];
    for (const entry of written) {
        const match = groups.find(
            (group) =>
                group.viewport === entry.viewport.name &&
                comparePngBuffers(group.bytes, entry.bytes) <= VISUALLY_IDENTICAL_FRACTION
        );
        if (match === undefined) {
            groups.push({ viewport: entry.viewport.name, files: [entry.file], bytes: entry.bytes });
        } else {
            match.files.push(entry.file);
        }
    }
    return groups.filter((group) => group.files.length > 1).map((group) => group.files);
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    const selected =
        args.only.length > 0 ? SCENARIOS.filter((s) => args.only.includes(s.id)) : SCENARIOS.slice();
    if (selected.length === 0) {
        throw new Error(`no capture scenario matched ${JSON.stringify(args.only)}`);
    }

    const root = resolve('docs/progress');
    const folderName = `${stamp()}-${args.slug}`;
    const directory = resolve(root, folderName);
    mkdirSync(directory, { recursive: true });

    // Recorded before rendering so the evidence panel and notes.md state the same instant.
    const capturedAt = new Date().toISOString();
    const head = git(['rev-parse', '--short', 'HEAD']);
    const server = await createServer({ logLevel: 'error' });
    const listener = await server.listen();
    const address = listener.resolvedUrls?.local[0] ?? 'http://localhost:5173/';
    const browser = await chromium.launch();

    const written: Capture[] = [];
    let panel: Capture | undefined;
    let panelBody: string | undefined;
    try {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        const page = await context.newPage();
        for (const scenario of selected) {
            for (const viewport of scenario.viewports ?? GATE_VIEWPORTS) {
                const file = `${scenario.id}--${viewport.name}.png`;
                const { layout, stub } = await capture(
                    page,
                    address,
                    scenario,
                    viewport,
                    resolve(directory, file)
                );
                const bytes = readFileSync(resolve(directory, file));
                const digest = createHash('sha256').update(bytes).digest('hex');
                const earlier = findPreviousCapture(root, folderName, file);
                written.push({
                    file,
                    scenario,
                    viewport,
                    digest,
                    bytes,
                    layout,
                    stub,
                    ...(earlier === undefined
                        ? {}
                        : {
                              previous: {
                                  folder: earlier.folder,
                                  fraction: comparePngBuffers(bytes, readFileSync(earlier.file))
                              }
                          })
                });
            }
        }
        if (args.evidenceFile !== undefined) {
            const body = readEvidence(args.evidenceFile);
            panelBody = body;
            await page.setViewportSize({
                width: EVIDENCE_VIEWPORT.width,
                height: EVIDENCE_VIEWPORT.height
            });
            await page.setContent(
                evidenceHtml({
                    title: args.title,
                    captured: capturedAt,
                    head: head || 'unknown',
                    commands: args.commands,
                    body
                }),
                { waitUntil: 'load' }
            );
            await page.screenshot({
                path: resolve(directory, EVIDENCE_FILE_NAME),
                fullPage: true
            });
            const bytes = readFileSync(resolve(directory, EVIDENCE_FILE_NAME));
            const earlier = findPreviousCapture(root, folderName, EVIDENCE_FILE_NAME);
            panel = {
                file: EVIDENCE_FILE_NAME,
                scenario: EVIDENCE_SCENARIO,
                viewport: EVIDENCE_VIEWPORT,
                digest: createHash('sha256').update(bytes).digest('hex'),
                bytes,
                // Not a screen: it has no layout that could be shared with a route.
                layout: 'evidence-panel',
                stub: false,
                ...(earlier === undefined
                    ? {}
                    : {
                          previous: {
                              folder: earlier.folder,
                              fraction: comparePngBuffers(bytes, readFileSync(earlier.file))
                          }
                      })
            };
        }
        await context.close();
    } finally {
        await browser.close();
        await server.close();
    }

    const changed = git(['status', '--porcelain']);
    const entries = panel === undefined ? written : [...written, panel];

    // Which captures repeat the previous commit's capture of the same scenario. Byte equality
    // proves nothing, so this is the pixel fraction from png-diff, not a hash comparison.
    const repeats = entries.filter(
        (entry) =>
            entry.previous !== undefined && entry.previous.fraction <= VISUALLY_IDENTICAL_FRACTION
    );
    // §8.3: a panel that repeats the previous commit's panel evidences nothing either.
    const freshPanel = panel !== undefined && !repeats.includes(panel);

    // §8.3: neither does a re-shot placeholder. When the panel carries the change, the stubs that
    // repeat are dropped from the folder instead of committed beside it, so the trail stops
    // filling with pictures of a screen that has not been built yet.
    const dropped = redundantStubs(
        entries.map((entry) => ({ file: entry.file, stub: entry.stub, unchanged: repeats.includes(entry) })),
        freshPanel
    );
    for (const file of dropped) rmSync(resolve(directory, file), { force: true });
    const shown = entries.filter((entry) => !dropped.includes(entry.file));

    const setDigest = createHash('sha256')
        .update(shown.map((entry) => entry.digest).join('\n'))
        .digest('hex');

    // Two things must hold for a capture set to evidence a change: the captures differ from
    // each other where the scenarios claim they do, and at least one differs from the
    // previous commit's capture of the same scenario.
    const duplicates = identicalGroups(shown);
    const sharedLayouts = sameLayoutGroups(
        shown.map((entry) => ({ file: entry.file, viewport: entry.viewport.name, layout: entry.layout }))
    );
    const stubs = placeholderFiles(shown.map((entry) => ({ file: entry.file, stub: entry.stub })));
    const allStubs = written.length > 0 && stubs.length === written.length;
    const unchanged = shown.filter((entry) => repeats.includes(entry));
    const fresh = shown.length - unchanged.length;

    const lines: string[] = [
        `# ${args.title}`,
        '',
        `- Captured: ${capturedAt}`,
        `- HEAD at capture: \`${head || 'unknown'}\` (commit this folder with the change it documents)`,
        `- Server: Vite dev server at ${address}`,
        `- Capture set digest: \`${setDigest.slice(0, 16)}\``,
        `- Captures that differ from the previous capture set: **${fresh} of ${shown.length}**`,
        '',
        ...(panelBody === undefined
            ? []
            : [
                  '## Evidence panel (plan §8.3)',
                  '',
                  `\`${EVIDENCE_FILE_NAME}\` is the image that highlights this commit. No rendered`,
                  'surface changed, so the capture tool rendered the measured output below into a',
                  'page and screenshotted it. It is reproduced here verbatim so the trail can be',
                  'read without opening the PNG:',
                  '',
                  '~~~',
                  panelBody,
                  '~~~',
                  ''
              ]),
        '## Verification rows touched',
        '',
        args.verificationRows.length > 0 ? args.verificationRows.map((row) => `- ${row}`).join('\n') : '- none recorded',
        '',
        '## Commands actually run',
        '',
        args.commands.length > 0
            ? args.commands.map((command) => `- \`${command}\``).join('\n')
            : '- none recorded',
        '',
        '## What each capture highlights',
        '',
        `Δ is the fraction of pixels differing from the same scenario in the previous capture`,
        `folder; at or below ${(VISUALLY_IDENTICAL_FRACTION * 100).toFixed(1)} % the two renders count as the same screen.`,
        '',
        '| File | Viewport | Layout | Δ vs previous capture | Highlight |',
        '| --- | --- | --- | --- | --- |',
        ...shown.map(
            (entry) =>
                `| \`${entry.file}\` | ${entry.viewport.name} | \`${layoutId(entry.layout)}\`${
                    entry.stub ? ' placeholder' : ''
                } | ${
                    entry.previous === undefined
                        ? 'first capture'
                        : `${(entry.previous.fraction * 100).toFixed(2)} % since \`${entry.previous.folder}\``
                } | ${entry.scenario.highlights} |`
        ),
        '',
        '## Screens still rendered by a placeholder',
        '',
        stubs.length === 0
            ? 'Every capture renders a screen that exists.'
            : [
                  'These scenarios name a screen that is not built yet, so their PNGs show a labelled stub.',
                  'They confirm routing only: they cannot evidence behaviour introduced by this commit.',
                  '',
                  ...stubs.map((file) => `- \`${file}\``),
                  '',
                  `**${stubs.length} of ${shown.length}** captures are placeholders.`
              ].join('\n'),
        '',
        '## Captures that share one layout',
        '',
        sharedLayouts.length === 0
            ? 'Each scenario renders a structurally different screen at its viewport size.'
            : [
                  'These render the same structure with different wording, so they are one screen, not',
                  'several. A pixel comparison calls them distinct because the text differs; the layout',
                  'identity does not. Build the screens or capture a state that genuinely differs.',
                  '',
                  ...sharedLayouts.map((files) => `- one layout: ${files.map((f) => `\`${f}\``).join(', ')}`)
              ].join('\n'),
        '',
        '## Captures that look the same',
        '',
        duplicates.length === 0
            ? 'Every capture in this set is visually distinct at its viewport size.'
            : [
                  'These render the same pixels, so they cannot show the difference their scenario claims.',
                  'Either the surface really is unchanged (say so in the Note) or the scenarios need distinct content.',
                  '',
                  ...duplicates.map((files) => `- identical: ${files.map((f) => `\`${f}\``).join(', ')}`)
              ].join('\n'),
        '',
        '## Placeholder captures dropped from this folder',
        '',
        dropped.length === 0
            ? [
                  'Nothing was dropped: every capture in this folder is either a built screen, a',
                  'capture that differs from the previous commit, or the only image this commit has.'
              ].join('\n')
            : [
                  'These routes are still rendered by a placeholder and their capture was identical',
                  'to the previous commit\u2019s, so committing them would add pictures that highlight',
                  'nothing while the evidence panel above carries the change (plan \u00a78.3). The',
                  'routes and the tickets that will replace them stay recorded here:',
                  '',
                  ...dropped.map((file) => `- \`${file}\``)
              ].join('\n'),
        '',
        '## Unchanged since the previous capture',
        '',
        unchanged.length === 0
            ? 'Nothing here repeats the previous commit’s capture.'
            : [
                  'These are pixel-for-pixel what the previous capture already showed, so they document',
                  'no newly introduced behaviour:',
                  '',
                  ...unchanged.map(
                      (entry) =>
                          `- \`${entry.file}\` unchanged since \`${entry.previous?.folder}\`${
                              entry.file === EVIDENCE_FILE_NAME
                                  ? ' — the panel repeats the previous commit’s panel; put this commit’s own numbers in it'
                                  : args.note === undefined
                                    ? ' — drop it with `--only`, or render this commit’s output with `--evidence-file`'
                                    : ''
                          }`
                  )
              ].join('\n'),
        '',
        '## Working tree at capture',
        '',
        '```',
        changed || '(clean)',
        '```',
        '',
        ...(args.note === undefined ? [] : ['## Note', '', args.note, '']),
        'Captures under `docs/progress/` are a progress trail, not release evidence: no test',
        'reads them and they satisfy no V-row in the verification plan.'
    ];

    writeFileSync(resolve(directory, 'notes.md'), `${lines.join('\n')}\n`);
    console.log(`captured ${shown.length} image(s) -> ${directory}`);
    if (panel !== undefined) {
        console.log(
            freshPanel
                ? `evidence panel rendered from ${args.evidenceFile} (plan §8.3)`
                : `warning: the evidence panel repeats the previous commit's panel, so it shows nothing new`
        );
    }
    if (duplicates.length > 0) {
        console.warn(`warning: ${duplicates.length} group(s) of captures render identical pixels:`);
        for (const files of duplicates) console.warn(`  ${files.join(' == ')}`);
    }
    if (unchanged.length > 0) {
        console.warn(`warning: ${unchanged.length} capture(s) repeat the previous capture set:`);
        for (const entry of unchanged) {
            console.warn(`  ${entry.file} unchanged since ${entry.previous?.folder}`);
        }
    }
    if (sharedLayouts.length > 0) {
        console.warn(`warning: ${sharedLayouts.length} group(s) of captures render one shared layout:`);
        for (const files of sharedLayouts) console.warn(`  ${files.join(' == ')}`);
    }
    if (stubs.length > 0) {
        console.warn(`note: ${stubs.length} capture(s) render a placeholder, not a built screen.`);
    }
    if (dropped.length > 0) {
        console.log(
            `dropped ${dropped.length} unchanged placeholder capture(s); the evidence panel is\n` +
                'the image for this commit, and the routes are recorded in notes.md (plan §8.3).'
        );
    }
    // §8 requires an image that highlights the change. Two ways a set can fail that: every
    // capture renders a placeholder, which shows routing rather than behaviour (§8.2), or every
    // capture repeats the previous commit's capture (§8.1). Either is normal for build-side
    // work, so §8.3 gives it an image: --evidence-file renders the commit's measured output.
    // A --note explains a set; it no longer excuses one that shows nothing new, because that
    // is exactly how two unchanged stub PNGs passed as progress for several commits running.
    if (allStubs && !freshPanel) {
        console.error(
            'refusing: every capture renders a placeholder screen, so nothing here shows\n' +
                'behaviour introduced by this commit. Build the screen, capture a state that\n' +
                'differs structurally, or pass --evidence-file <file> holding the measured output\n' +
                'this commit produced (plan §8.3). --note no longer covers this on its own.'
        );
        process.exitCode = 1;
    }
    if (fresh === 0 && !freshPanel) {
        console.error(
            'refusing: every capture repeats the previous capture set, so nothing here\n' +
                'highlights a newly introduced change. Capture the state this commit introduces,\n' +
                'or pass --evidence-file <file> holding the measured output this commit produced\n' +
                '(plan §8.3), which is the image for a commit with no rendered surface.'
        );
        process.exitCode = 1;
    }
}

await main();
