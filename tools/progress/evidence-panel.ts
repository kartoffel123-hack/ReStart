/**
 * The panel that stands in for a screenshot when a commit has no rendered surface
 * (implementation plan §8.3).
 *
 * Importer, graph and planner commits change numbers, not pixels, so a re-shot placeholder
 * highlights nothing. The capture tool renders the commit's own measured output into a page
 * and screenshots that. The markup is built here, away from the browser, so the escaping and
 * the layout contract stay testable without launching Chromium.
 */
import type { Viewport } from './scenarios.js';

/** Rendered at the wider gate width from plan §5 so measured output stays readable. */
export const EVIDENCE_VIEWPORT: Viewport = {
    name: 'laptop-1280x800',
    width: 1280,
    height: 800
};

/** Name inside the capture folder. The previous-folder comparison keys on this. */
export const EVIDENCE_FILE_NAME = `evidence--${EVIDENCE_VIEWPORT.name}.png`;

export type EvidencePanel = Readonly<{
    /** The `--title`, shown as the heading so the PNG is legible on its own. */
    title: string;
    /** ISO timestamp and short `HEAD`, repeated in the image for the same reason. */
    captured: string;
    head: string;
    /** Commands actually run, shown under the heading. */
    commands: readonly string[];
    /** The measured output, reproduced verbatim. */
    body: string;
}>;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * A complete HTML document. The presentation palette is inlined because the panel is rendered
 * with `setContent`, where the app's stylesheet is not loaded.
 */
export function evidenceHtml(panel: EvidencePanel): string {
    const commands =
        panel.commands.length === 0
            ? '<p class="muted">no commands recorded</p>'
            : `<ul>${panel.commands
                  .map((command) => `<li><code>${escapeHtml(command)}</code></li>`)
                  .join('')}</ul>`;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(panel.title)}</title>
<style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 32px;
        width: ${EVIDENCE_VIEWPORT.width}px;
        background: #e6e6e6;
        color: #172127;
        font: 16px/1.5 'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', system-ui, sans-serif;
    }
    .panel {
        background: #ffffff;
        border: 1px solid #c9cfd3;
        border-radius: 6px;
        padding: 24px;
    }
    .kicker {
        display: inline-block;
        background: #fff2c4;
        border: 1px solid #8a5a00;
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 13px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }
    h1 { font-size: 26px; line-height: 1.2; margin: 16px 0 4px; }
    .meta { color: #5c666d; font-size: 14px; margin: 0; }
    h2 { font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; color: #5c666d; margin: 24px 0 8px; }
    ul { margin: 0; padding-left: 20px; }
    code, pre { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 14px; }
    pre {
        background: #e6e6e6;
        border: 1px solid #c9cfd3;
        border-radius: 6px;
        padding: 16px;
        margin: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
    .muted { color: #5c666d; font-style: italic; }
    footer { color: #5c666d; font-size: 13px; margin-top: 24px; }
</style>
</head>
<body>
<div class="panel">
    <span class="kicker">No rendered surface yet &mdash; this panel is the change</span>
    <h1>${escapeHtml(panel.title)}</h1>
    <p class="meta">captured ${escapeHtml(panel.captured)} at <code>HEAD ${escapeHtml(panel.head)}</code></p>
    <h2>Commands actually run</h2>
    ${commands}
    <h2>What this commit produced</h2>
    <pre>${escapeHtml(panel.body)}</pre>
    <footer>Progress trail under <code>docs/progress/</code>: not release evidence, read by no test.</footer>
</div>
</body>
</html>
`;
}

/** Reject an empty panel before a browser is launched: an empty image evidences nothing. */
export function requireEvidenceBody(raw: string, source: string): string {
    const body = raw.replace(/\s+$/, '');
    if (body.trim().length === 0) {
        throw new Error(
            `--evidence-file ${source} is empty. The panel is the screenshot for a commit ` +
                'with no rendered surface, so it has to carry the measured output.'
        );
    }
    return body;
}
