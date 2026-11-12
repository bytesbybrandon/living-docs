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

`ingest --draft` never writes figures.
It drafts text, lists, stats, and a timeline from the source, so every figure is authored into the model by hand or by an agent.
Run `living-docs-axi schema --block figure` for every nested field.

### Diagram

Nodes sit at fixed `x` and `y` positions on a canvas that is 1000 units wide by default.
There is no auto layout, so choose positions that leave room for labels.
Node ids must be unique, and every edge and group member must name an existing node id.
Node `kind` is `box`, `accent`, `plain`, `dashed`, or `stack`.
Edge `route` is `straight` or `elbow`.

```json
{
  "type": "figure",
  "id": "segments",
  "caption": "Appends go to the active segment. Sealed segments stay read-only.",
  "spec": "diagram",
  "span": "page",
  "motion": "draw",
  "diagram": {
    "width": 1000,
    "height": 360,
    "nodes": [
      { "id": "writer", "label": "writer", "sub": "append", "x": 40, "y": 150, "w": 160, "h": 64 },
      { "id": "dir", "label": "segment directory", "x": 280, "y": 150, "w": 200, "h": 64, "kind": "accent" },
      { "id": "hot", "label": "active segment", "x": 580, "y": 60, "w": 180, "h": 64 },
      { "id": "cold", "label": "sealed segments", "x": 580, "y": 240, "w": 180, "h": 64, "kind": "dashed" }
    ],
    "edges": [
      { "from": "writer", "to": "dir", "label": "publish" },
      { "from": "dir", "to": "hot", "route": "elbow" },
      { "from": "dir", "to": "cold", "route": "elbow" }
    ],
    "groups": [{ "label": "segment store", "nodes": ["hot", "cold"] }],
    "notes": ["Sealing copies no payload."]
  }
}
```

### Chart

Chart `kind` is `line`, `scatter`, `bar`, or `steps`.
A series carries `points` of `{ x, y }`, or `values` and `labels` for bars.
Series `tone` is `accent`, `ink`, `muted`, `kept`, or `rejected`.

```json
{
  "type": "figure",
  "caption": "Lookup probes grow with segment count.",
  "spec": "chart",
  "chart": {
    "kind": "line",
    "xLabel": "segments",
    "yLabel": "probes",
    "series": [
      { "name": "nacre", "tone": "accent", "points": [{ "x": 1, "y": 1 }, { "x": 32, "y": 32 }, { "x": 128, "y": 128 }] }
    ]
  }
}
```

Use an `image` block instead when the graphic already exists as a raster or SVG file.

### Motion

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
