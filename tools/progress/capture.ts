/**
 * Progress capture (implementation plan §8). Builds nothing: it runs the Vite dev
 * server, drives the real page in Chromium at the gate viewports, and writes
 * PNGs plus notes.md under docs/progress/<date>-<slug>/. Run it before every
 * commit. Screenshots here are a progress trail, never release evidence.
 */
import { createServer } from 'vite';
import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
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

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    const selected =
        args.only.length > 0 ? SCENARIOS.filter((s) => args.only.includes(s.id)) : SCENARIOS.slice();
    if (selected.length === 0) {
        throw new Error(`no capture scenario matched ${JSON.stringify(args.only)}`);
    }

    const directory = resolve('docs/progress', `${stamp()}-${args.slug}`);
    mkdirSync(directory, { recursive: true });

    const server = await createServer({ logLevel: 'error' });
    const listener = await server.listen();
    const address = listener.resolvedUrls?.local[0] ?? 'http://localhost:5173/';
    const browser = await chromium.launch();

    const written: { file: string; scenario: Scenario; viewport: Viewport }[] = [];
    try {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        const page = await context.newPage();
        for (const scenario of selected) {
            for (const viewport of scenario.viewports ?? GATE_VIEWPORTS) {
                const file = `${scenario.id}--${viewport.name}.png`;
                await capture(page, address, scenario, viewport, resolve(directory, file));
                written.push({ file, scenario, viewport });
            }
        }
        await context.close();
    } finally {
        await browser.close();
        await server.close();
    }

    const changed = git(['status', '--porcelain']);
    const head = git(['rev-parse', '--short', 'HEAD']);
    const digest = createHash('sha256').update(written.map((entry) => entry.file).join('\n')).digest('hex');

    const lines: string[] = [
        `# ${args.title}`,
        '',
        `- Captured: ${new Date().toISOString()}`,
        `- HEAD at capture: \`${head || 'unknown'}\` (commit this folder with the change it documents)`,
        `- Server: Vite dev server at ${address}`,
        `- Capture set digest: \`${digest.slice(0, 16)}\``,
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
        '| File | Viewport | Highlight |',
        '| --- | --- | --- |',
        ...written.map((entry) => `| \`${entry.file}\` | ${entry.viewport.name} | ${entry.scenario.highlights} |`),
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
}

await main();
