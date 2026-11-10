# Timeline and video

A timeline makes a doc move in step with its own text.
Cues highlight a source sentence, light up the figure part it describes, count numbers up, type text out, and push a camera onto a block.
The same timeline plays on the live page and records to MP4, WebM, or GIF.

## Marks and ids

Wrap a sentence in any prose string, the abstract included, with `[[mark:id|text]]`.
Give any block an `id` so cues can point at it.
Ids use lowercase letters, digits, and hyphens, and must be unique.

```json
{ "type": "figure", "id": "loop", "caption": "...", "spec": "diagram", "diagram": { "nodes": [{ "id": "editor", "label": "4B editor", "x": 552, "y": 28 }] } }
```

## Cues

`timeline.cues` is a list of `{ at, dur, do, target }`.
`at` and `dur` are seconds; `dur` defaults to 1.2.

| `do` | What it does |
| --- | --- |
| `highlight` | Sweeps a highlighter across a mark or block, then leaves a faint underline. |
| `focus` | Lights up a block or part and dims its siblings. |
| `reveal` | Fades and rises a block or part in at the cue time. |
| `count` | Counts the numbers inside the target up from zero. |
| `type` | Types the target's text out. |
| `camera` | Video only: pushes onto a block or part, or back to `page`. `zoom` sets the scale. |
| `activate` | HUD only: glides the scene crosshair to a label. |

Targets are `mark:<id>`, `<blockId>`, `<blockId>/<part>`, or `page` for the camera.
A part is a diagram node id, a panel index such as `08`, or a scene label.
Validation rejects a cue whose target does not exist.

`timeline.duration` defaults to the last cue end plus 1.5 seconds.
`timeline.loop` restarts the live page when it ends; reveals, counts, and typing stay settled after the first pass.
On the live page, a block whose cue comes up while it is still below the fold waits, with its cues in order, until the reader scrolls to it.

## Drafted cues

`ingest --draft` writes a timeline from the source: up to four abstract sentences and five section leads are marked and highlighted in reading order, the camera visits each lead, and stats count up.
Pass `--static` for a draft without cues.
Edit or replace the drafted cues like any other part of the model.

## Video

```bash
living-docs-axi render docs/notes.model.json --format mp4 -o docs/notes.mp4
living-docs-axi render docs/notes.model.json --format gif --size 1080x1350 --fps 30
```

The renderer lays the doc out on a fixed stage, seeks the timeline frame by frame in headless Chromium, and pipes the frames to ffmpeg.
Every frame is a pure function of time, so two renders on one machine produce the same frames.
MP4 is the default for sharing; GIF is 720 wide at 15 fps for READMEs.
Video needs the optional `playwright` package with Chromium, and `ffmpeg` on `PATH` or in `LIVING_DOCS_FFMPEG`.
In a project, run `npm i -D playwright`; with npx, add it to the same call:

```bash
npx -y -p @bytesbybrandon/living-docs -p playwright living-docs-axi render notes.model.json --format mp4
npx playwright install chromium
```

## Accessibility and print

Under `prefers-reduced-motion`, print, or with scripts off, the page shows its final state: everything revealed, counted, and typed, with narrated sentences underlined.
Docs without a timeline ship no runtime.
