# Document model

A model is `{ schemaVersion: 1, theme?, meta, blocks }`.
Validation is strict: unknown fields, unknown block types, and unresolved references fail with an exact path.

## Meta

`meta` accepts `title`, `subtitle`, `kicker`, `runningHead`, `author`, `affiliation`, `date`, `stamps`, `abstract`, `indexTerms`, `footer`, `accent`, and `style`.
`style` carries the [style tokens](style-tokens.md).

## Blocks

| Block | Purpose |
| --- | --- |
| `prose` | body text with inline markdown and `[[1]]` footnote refs |
| `heading` | numbered section (`level: 2`) or subsection (`level: 3`) |
| `figure` | generated diagram or chart, auto-numbered |
| `table` | rule-based table with small-caps head |
| `algorithm` | numbered pseudocode with an optional highlighted line |
| `callout` | `takeaway`, `note`, or `warn` aside |
| `stats` | row of headline numbers |
| `list`, `quote`, `code` | supporting text blocks |
| `image` | supplied file, inlined as a data URI |
| `footnotes` | footnote list printed at the foot |
| `ticker` | one-line console status strip |
| `graphScene` | console hero: tabs, prompt, graph, active-node card |
| `panels` | console grid with 13 panel kinds |

## Figures

A figure takes either a `diagram` spec or a `chart` spec.
Diagrams place nodes and edges on a 1000-unit canvas, with optional groups and notes.
Charts accept `line`, `scatter`, `bar`, and `steps` series, with ticks, bounds, legend, and annotations.
Both render as inline SVG, so no image assets are required.

`motion` is optional and accepts `none`, `draw`, `reveal`, or `steps`.
Motion is scoped CSS on the generated SVG: edges draw, marks fade in, and bars grow.
Print and `prefers-reduced-motion` freeze the final frame, and content stays visible while the animation runs.

## Console blocks

`graphScene` accepts a title, meta chips, tabs, a prompt line, a graph payload, an action strip, and a status line.
The graph layout is seeded, so the same model produces the same scene.
`panels` holds numbered panels with one of 13 kinds: `repo`, `bars`, `list`, `radar`, `tree`, `log`, `heat`, `big`, `spark`, `code`, `hist`, `metrics`, and `diff`.

Other themes render console blocks as annotated cards, so a model can switch themes without losing content.

## See also

- [Pipeline](pipeline.md)
- [Style tokens](style-tokens.md)
