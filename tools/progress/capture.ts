/**
 * Progress capture (implementation plan §8). Builds nothing: it runs the Vite dev
 * server, drives the real page in Chromium at the gate viewports, and writes
 * PNGs plus notes.md under docs/progress/<date>-<slug>/. Run it before every
 * commit. Screenshots here are a progress trail, never release evidence.
 */
import { createServer } from 'vite';
import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { findPreviousCapture } from './previous-capture.js';
import { VISUALLY_IDENTICAL_FRACTION, comparePngBuffers } from './png-diff.js';
import { GATE_VIEWPORTS, SCENARIOS, type Scenario, type Viewport } from './scenarios.js';

type Args = Readonly<{
    title: string;
    slug: string;
    commands: readonly string[];
    verificationRows: readonly string[];
    only: readonly string[];
    note?: string;
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
    return {
        title,
        slug,
        commands: list('--commands'),
        verificationRows: list('--rows'),
        only: list('--only'),
        ...(note === undefined ? {} : { note })
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

async function capture(
    page: Page,
    origin: string,
    scenario: Scenario,
    viewport: Viewport,
    file: string
): Promise<void> {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${origin}/${scenario.route}`, { waitUntil: 'networkidle' });
    if (scenario.waitFor !== undefined) {
        await page.waitForSelector(scenario.waitFor, { timeout: 15_000 });
    }
    await page.screenshot({ path: file, fullPage: scenario.fullPage ?? false });
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

    const server = await createServer({ logLevel: 'error' });
    const listener = await server.listen();
    const address = listener.resolvedUrls?.local[0] ?? 'http://localhost:5173/';
    const browser = await chromium.launch();

    const written: {
        file: string;
        scenario: Scenario;
        viewport: Viewport;
        digest: string;
        bytes: Buffer;
        /** Pixels differing from this scenario's capture in the previous folder. */
        previous?: { folder: string; fraction: number };
    }[] = [];
    try {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        const page = await context.newPage();
        for (const scenario of selected) {
            for (const viewport of scenario.viewports ?? GATE_VIEWPORTS) {
                const file = `${scenario.id}--${viewport.name}.png`;
                await capture(page, address, scenario, viewport, resolve(directory, file));
                const bytes = readFileSync(resolve(directory, file));
                const digest = createHash('sha256').update(bytes).digest('hex');
                const earlier = findPreviousCapture(root, folderName, file);
                written.push({
                    file,
                    scenario,
                    viewport,
                    digest,
                    bytes,
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
        await context.close();
    } finally {
        await browser.close();
        await server.close();
    }

    const changed = git(['status', '--porcelain']);
    const head = git(['rev-parse', '--short', 'HEAD']);
    const setDigest = createHash('sha256').update(written.map((entry) => entry.digest).join('\n')).digest('hex');

    // Two things must hold for a capture set to evidence a change: the captures differ from
    // each other where the scenarios claim they do, and at least one differs from the
    // previous commit's capture of the same scenario. Byte equality proves neither.
    const duplicates = identicalGroups(written);
    const unchanged = written.filter(
        (entry) =>
            entry.previous !== undefined && entry.previous.fraction <= VISUALLY_IDENTICAL_FRACTION
    );
    const fresh = written.length - unchanged.length;

    const lines: string[] = [
        `# ${args.title}`,
        '',
        `- Captured: ${new Date().toISOString()}`,
        `- HEAD at capture: \`${head || 'unknown'}\` (commit this folder with the change it documents)`,
        `- Server: Vite dev server at ${address}`,
        `- Capture set digest: \`${setDigest.slice(0, 16)}\``,
        `- Captures that differ from the previous capture set: **${fresh} of ${written.length}**`,
        '',
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
        '| File | Viewport | Δ vs previous capture | Highlight |',
        '| --- | --- | --- | --- |',
        ...written.map(
            (entry) =>
                `| \`${entry.file}\` | ${entry.viewport.name} | ${
                    entry.previous === undefined
                        ? 'first capture'
                        : `${(entry.previous.fraction * 100).toFixed(2)} % since \`${entry.previous.folder}\``
                } | ${entry.scenario.highlights} |`
        ),
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
                              args.note === undefined
                                  ? ' — drop it with `--only` or explain it in `--note`'
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
    console.log(`captured ${written.length} screenshot(s) -> ${directory}`);
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
    // A capture set that repeats the previous one in full evidences nothing. That is only
    // acceptable when the commit had no visible surface, which is what --note is for.
    if (fresh === 0 && args.note === undefined) {
        console.error(
            'refusing: every capture repeats the previous capture set, so nothing here\n' +
                'highlights a newly introduced change. Capture the state this commit introduces,\n' +
                'or pass --note "why it has no visible surface and which ticket will change that".'
        );
        process.exitCode = 1;
    }
}

await main();
