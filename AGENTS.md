# Agent instructions

This repository is a documentation renderer, an AXI CLI, and an MCP server over one core.
These rules are specific to this repository and compose with any user-level agent policy.

## Essential rules

- Use Node 20 or newer and ECMAScript modules.
- Run `npm install` once, then `npm test` before proposing a change.
- Keep rendering deterministic: identical model and theme must produce identical bytes.
- Keep output self-contained: no CDN, web fonts, remote images, or external scripts.
- Never write arbitrary CSS from a document model. Extend the curated style tokens instead.
- Escape document text and keep link sanitization in `src/model/markdown.js`.
- Write normal prose in commits and pull requests, with no agent attribution trailers.
- Follow the repository style: one sentence per line in Markdown, no em dashes, no marketing language.

## Authority and approval

- Changes to the document model schema require a matching validator and test.
- Adding a theme means adding a renderer, a palette, and a sample model.
- Publishing to npm, rewriting Git history, and changing repository visibility need explicit human approval.
- Do not edit `.documentation/`, `.reactive/`, `.docs/`, or generated `docs/` output by hand.

## Load context by task

- Document model or validation: `src/model/schema.js`, `src/model/validate.js`.
- Ingest behavior: `src/ingest/index.js` and the format modules beside it.
- Layout or visual change: `src/render/blocks.js`, `src/render/style.js`, and the theme module.
- CLI or MCP surface: `src/axi/cli.js`, `src/mcp/server.js`.
- Contract and decisions: `ARCHITECTURE.md`, `docs/decisions/`.

## Verify the affected scope

- Unit and contract checks: `npm test`.
- Rendered proof: `npm run samples`, then inspect `docs/*.html` at desktop and mobile widths.
- Package surface: `npm pack --dry-run` before any publish.
