# Architecture

Status: implemented, pre-1.0. Source revision: this repository at the current commit.

## Ownership and contracts

The engine is one core with three interfaces.

| Module | Owns | Depends on |
| --- | --- | --- |
| `src/model/` | document model schema, validation, safe inline Markdown | nothing |
| `src/ingest/` | source formats to normalized blocks and outlines | model helpers |
| `src/render/` | blocks to HTML, SVG generators, style resolution, themes | model, ingest output shapes |
| `src/axi/` | command parsing, TOOL-style output, file writes, preview | ingest, render, schema |
| `src/mcp/` | MCP tool definitions and result shaping | ingest, render, schema |
| `src/server/preview.js` | local static preview and index | nothing |
| `scripts/build-site.js`, `site/` | the website: gallery and guide rendered by the engine, plus a hand-written landing page | render, ingest, samples, `docs/guide/` |

Dependency direction is one way: interfaces depend on the core; the core never imports the CLI or MCP layer.
Theme modules own CSS and document shells but use the shared block renderers, so all themes keep the same escaping and numbering behavior.

## Decisions and effects

The public entry is `renderDoc(model, {theme, baseDir})`.
It validates the model, resolves style tokens into a palette, renders blocks with numbered figures and tables, wraps the result in a theme document, and reports stats.
Ingest returns an outline plus blocks and can emit a draft model that already validates.

Figures are generated SVG: diagrams from positioned nodes and edges, charts from series and ticks, and the console hero from a seeded layout.
Identifiers and graph positions derive from content, not randomness, so repeated renders match.

## Invariants and boundaries

- One HTML file per document: CSS, SVG, and the console runtime are inlined.
- Text is escaped; only http, https, mailto, hash, and relative links survive.
- Style tokens are an allowlist: palette, seed, type, density, and figure treatment. Accent colors are contrast corrected.
- Motion is theme owned. The console animates and honors reduced motion; the paper themes stay static.
- Image paths are inlined as data URIs, and a missing image degrades to a visible figure error.
- PDF text extraction depends on the optional `unpdf` package and reports a typed error when it is missing.

## Evidence and further detail

- Tests cover determinism, self-containment, escaping, schema errors, ingest, CLI exit codes, MCP round trips, and style tokens.
- Samples in `samples/` are the visual proof; `npm run samples` writes them to `docs/`.
- Known gaps: no visual regression suite, no per-theme versioning, and no browser-based layout assertions.
- Decisions live in `docs/decisions/`.
