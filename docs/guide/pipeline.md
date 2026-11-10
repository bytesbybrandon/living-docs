# Pipeline

The engine turns one source into one self-contained HTML document.

```text
source -> ingest -> outline + normalized blocks
                 |
                 +-> --draft -> valid document model
                 |
                 +-> author a richer model against the schema
                                      |
                                render --theme -> single HTML file
```

## Ingest

`ingest` accepts a file path (Markdown, plain text, HTML, or PDF), a URL, inline text, or standard input.
It returns an outline with section ids, titles, and word counts.
Large sources stay bounded: read the outline, then pull one section at a time with `--section <n|id>`.

## Draft models

`ingest --draft` is the zero-judgment path.
It writes a document model that validates and renders immediately.
An author then adds figures, charts, callouts, stats, and console panels against the schema.

## Render

`render` validates the model, resolves style tokens, and writes one file with inline CSS, inline SVG, and the console runtime.
The file loads no fonts, images, or scripts from the network.

## See also

- [CLI reference](cli.md)
- [Document model](document-model.md)
- [Style tokens](style-tokens.md)
