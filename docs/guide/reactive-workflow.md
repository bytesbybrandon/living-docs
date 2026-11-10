# Reactive workflow

An optional reactive skill wraps the same pipeline: intake, outline, theme and style plan, model authoring, validation, render, human review, and finalize.
It calls the CLI and does not reimplement rendering.

## Boundary

The skill is maintained separately from this package.
`src/model/schema.js` and the AXI commands are the stable engine surface.

## Plan and review

The workflow holds two human gates.
The first approves the theme, style tokens, sections, and figures.
The second reviews the rendered page.
Model revisions are bounded at four attempts before the run ends in an error state.

## See also

- [CLI reference](cli.md)
- [Style tokens](style-tokens.md)
