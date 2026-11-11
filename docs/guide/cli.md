# CLI reference

The `living-docs-axi` command follows the AXI principles: compact TOON-style output, a content-first home view, and `help[]` next-step lines.

```text
living-docs-axi                         home: themes, built docs, next steps
living-docs-axi themes                  theme list with when to use each
living-docs-axi schema [--block figure] block fields and types
living-docs-axi ingest <path|url|->     outline, or --section <n|id> for one section
living-docs-axi ingest <path> --draft   write a model, with a drafted timeline, from the source
living-docs-axi render <model.json>     validate and write HTML, or --format mp4|webm|gif for video
living-docs-axi validate <model.json>   validation only
living-docs-axi preview [dir]           serve built docs with an index
```

## Flags

| Flag | Purpose |
| --- | --- |
| `--theme <name>` | `paper-light`, `paper-dark`, `hud`, or a curated look: `field-notes`, `editorial`, `blueprint`. With `--draft`, omitted means the source picks |
| `--seed <hex>` | with `--draft`: accent seed, overriding the one derived from the title |
| `-o`, `--out <file>` | output path |
| `--section <n\|id>` | ingest one section |
| `--max-chars <n>` | cap section text, default 12000 |
| `--full` | disable truncation |
| `--stdout` | print HTML instead of writing a file |
| `--url <url>` | ingest a URL |
| `--text <text>` | ingest inline text |
| `--port <n>` | preview port, default 4600 |
| `--no-open` | do not open a browser |
| `--static` | draft without timeline cues |
| `--format <f>` | `html` (default), `mp4`, `webm`, or `gif` |
| `--size <WxH>` | video stage, default `1080x1350` |
| `--fps <n>` | video frames per second, default 30 |
| `--scale <n>` | device pixel ratio for the stage, default 1 |

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | success |
| 1 | invalid model or runtime failure |
| 2 | usage error, including unknown flags |

Errors are structured on standard output.
Unknown flags fail loud instead of being ignored.

## Examples

```bash
npx -y living-docs-axi themes
npx -y living-docs-axi ingest samples/source/harness-notes.md --draft -o docs/draft.model.json
npx -y living-docs-axi render docs/draft.model.json --theme paper-dark -o docs/draft.html
npx -y living-docs-axi preview docs --no-open
```

## See also

- [Pipeline](pipeline.md)
- [Document model](document-model.md)
- [Timeline and video](timeline.md)
