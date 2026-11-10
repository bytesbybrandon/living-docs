# living-docs

Turns a source document into a designed, self-contained HTML doc in one of three styles: an academic paper, a dark reading-notes paper, or a telemetry console.

Ships a CLI that follows the [AXI](https://axi.md) principles and a stdio MCP server over the same core.

## What it does

Input is a source: Markdown, plain text, HTML, a URL, or a PDF.
Output is one HTML file with inline CSS, inline SVG figures, and no network requests.
The model gives an outline and blocks; the renderer handles typography, diagrams, charts, and layout.

Three themes:

| Theme | Look | Best for |
| --- | --- | --- |
| `paper-light` | serif academic paper, two justified columns, drop caps, margin stamp, print rules | research papers, source-code studies, technical reports |
| `paper-dark` | cream on carbon, orange accent, numbered sections, algorithm boxes, takeaway strip | paper summaries, essays, annotated readings |
| `hud` | monospaced 12-panel console, cyan accents, animated graph hero, live clock | repo audits, skill catalogs, system snapshots, run reports |

## Install

```bash
npm install -g @bytesbybrandon/living-docs
```

Or run without installing:

```bash
npx -y -p @bytesbybrandon/living-docs living-docs-axi themes
npx -y -p @bytesbybrandon/living-docs living-docs-mcp
```

## Quick start

```bash
npm install
node bin/living-docs-axi.js
node bin/living-docs-axi.js ingest samples/source/harness-notes.md
node bin/living-docs-axi.js render samples/harness-engineering.json --theme paper-light -o docs/paper.html
node bin/living-docs-axi.js preview docs
```

`npm run samples` renders every model in `samples/` into `docs/`.

## Pipeline

```text
source ──ingest──▶ outline + normalized blocks
              │
              ├─ --draft ──▶ valid document model (renders as-is)
              │
              └─ agent authors a richer model against the schema
                                    │
                              render --theme ──▶ single HTML file
```

`ingest --draft` is the zero-judgment path: it produces a model that validates and renders immediately.
An agent then adds figures, charts, callouts, stats, and console panels against the schema.

## CLI

```text
living-docs-axi                         home: themes, built docs, next steps
living-docs-axi themes                  theme list with when to use each
living-docs-axi schema [--block figure] block fields and types
living-docs-axi ingest <path|url|->     outline, or --section <n|id> for one section
living-docs-axi ingest <path> --draft   write a model from the source
living-docs-axi render <model.json>     validate and write HTML
living-docs-axi validate <model.json>   validation only
living-docs-axi preview [dir]           serve built docs with an index
```

Flags: `--theme`, `-o/--out`, `--section`, `--max-chars`, `--full`, `--stdout`, `--url`, `--text`, `--port`, `--no-open`.
Unknown flags exit 2; invalid models exit 1.
Output is compact TOON-style tables with `help[]` next-step lines.

## Document model

A model is `{ schemaVersion: 1, theme?, meta, blocks }`.

`meta` takes `title`, `subtitle`, `kicker`, `runningHead`, `author`, `affiliation`, `date`, `stamps`, `abstract`, `indexTerms`, `footer`, `accent`.

Block types:

| Block | Purpose |
| --- | --- |
| `prose` | body text with inline markdown, `[[1]]` footnote refs |
| `heading` | numbered section (`level: 2`) or subsection (`level: 3`) |
| `figure` | generated diagram or chart, auto-numbered |
| `table` | rule-based table with small-caps head |
| `algorithm` | numbered pseudocode with an optional highlighted line |
| `callout` | `takeaway`, `note`, or `warn` aside |
| `stats` | row of headline numbers |
| `list`, `quote`, `code` | supporting text blocks |
| `image` | supplied file, inlined as a data URI |
| `footnotes` | footnote list printed at the foot |
| `ticker` | one-line console status strip (console theme) |
| `graphScene` | console hero: tabs, prompt, graph, active-node card |
| `panels` | console grid with 13 panel kinds (repo, bars, list, radar, tree, log, heat, big, spark, code, hist, metrics, diff) |

Figures accept either a `diagram` spec (nodes, edges, groups on a 1000-unit canvas) or a `chart` spec (`line`, `scatter`, `bar`, `steps` with series and annotations).
The renderer generates SVG; no image assets are required.

## Per-source style tokens

`meta.style` adapts a theme to its source without accepting arbitrary CSS.
Every choice is curated and validated, so the page stays coherent, printable, and deterministic.

| Token | Values | Effect |
| --- | --- | --- |
| `palette` | `default`, `ember`, `ocean`, `moss`, `graphite`, `ink`, `plum` | curated accent family |
| `seed` | hex color, e.g. `#2f6f8f` | derives the accent, tinted surfaces, and figure fills; lightness is corrected until the accent clears WCAG contrast against the page |
| `type` | papers: `classic`, `editorial`, `technical`; console: `mono`, `hybrid`, `terminal` | curated font stacks, no web fonts |
| `density` | `compact`, `normal`, `roomy` | body size, leading, figure margins, panel height |
| `figure` | `outline`, `solid`, `minimal` | diagram fill and stroke; `minimal` also drops chart gridlines |

`meta.accent` remains available as a direct accent override.
Motion is owned by the theme, not the model: the console animates its graph, pulse, and clock; the paper themes stay static.
Reduced-motion preferences disable the console animation.

```json
{
  "meta": {
    "title": "Example",
    "style": { "seed": "#2f6f8f", "type": "editorial", "density": "roomy", "figure": "minimal" }
  }
}
```

## MCP server

Published package (recommended):

```json
{
  "mcpServers": {
    "living-docs": {
      "command": "npx",
      "args": ["-y", "-p", "@bytesbybrandon/living-docs", "living-docs-mcp"]
    }
  }
}
```

Local checkout:

```json
{
  "mcpServers": {
    "living-docs": {
      "command": "node",
      "args": ["C:/Users/brand/Desktop/living-docs/bin/living-docs-mcp.js"]
    }
  }
}
```

Tools: `living_docs_themes`, `living_docs_schema`, `living_docs_ingest`, `living_docs_render`, `living_docs_preview`.
`living_docs_render` accepts a model object, a model path, or a source to draft from.

## Reactive skill

`living-docs` (authored in `~/Desktop/skills/living-docs`) runs the end-to-end workflow: intake, outline, theme and layout plan, model authoring, validation, render, human review, finalize.
It calls this CLI; it does not reimplement rendering.

## Guarantees

- One file per doc: CSS, SVG, and runtime script inlined; no CDN, fonts, or remote images.
- Deterministic output: identical model and theme produce identical bytes, including generated SVG ids, graph layout, and derived palette values.
- Curated styling: `meta.style` only accepts known palettes, type pairings, densities, and figure treatments; accent colors are contrast-corrected, and no arbitrary CSS is injected.
- Escaped content: document text is HTML-escaped; only `http(s)`, `mailto:`, `#`, and relative URLs survive as links.
- Print ready: paper themes ship `@page` rules and keep figures, tables, algorithms, and callouts unbroken.

## Tests

```bash
npm test
```

Covers rendering determinism and self-containment, escaping and link sanitization, schema validation, ingest of Markdown/HTML/text, CLI behavior and exit codes, and an in-memory MCP client round trip.
