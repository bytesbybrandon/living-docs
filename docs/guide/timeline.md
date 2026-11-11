# Timeline and video

A timeline makes a doc move in step with its own text.
Cues highlight a source sentence, light up the figure part it describes, count numbers up, type text out, and scroll the video frame to a block.
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
| `focus` | Outlines a block or part and dims its siblings. The glow stays inside the block. |
| `reveal` | Fades a block or part in at the cue time, without moving it. |
| `count` | Counts the numbers inside the target up from zero. |
| `type` | Types the target's text out. The full text keeps its space, so nothing reflows. |
| `camera` | Video only: scrolls the frame to a block or part, or back to `page`. The page stays flat at 100%; `zoom` is an opt-in that scales it. |
| `activate` | HUD only: glides the scene crosshair to a label. |

Targets are `mark:<id>`, `<blockId>`, `<blockId>/<part>`, or `page` for the camera.
A part is a diagram node id, a panel index such as `08`, or a scene label.
Validation rejects a cue whose target does not exist.

`timeline.duration` defaults to the last cue end plus 1.5 seconds.
`timeline.loop` restarts the live page when it ends; reveals, counts, and typing stay settled after the first pass.
On the live page, a block whose cue comes up while it is still below the fold waits, with its cues in order, until the reader scrolls to it.

## Drafted cues

`ingest --draft` writes a timeline from the source: up to four abstract sentences and five section leads are marked and highlighted in reading order, the frame scrolls to each lead, and stats count up.
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

## Driving a live doc from another page

A same-origin page that embeds a timed doc in an iframe can take over its clock through `window.__ld`.
`pause()` hands the clock to the host, and `seek(t)` then renders the frame at `t` seconds.
`play()` resumes from the last shown time, `replay()` restarts from zero, and `time()` reads the current time.
The home page of this site pins one doc and scrubs it as the reader scrolls.
The controls exist only on a live page; under reduced motion, in print, and in video capture the doc shows its final state or seeks per frame, so a host should check that `pause` is a function first.

## Accessibility and print

Under `prefers-reduced-motion`, print, or with scripts off, the page shows its final state: everything revealed, counted, and typed, with narrated sentences underlined.
Docs without a timeline ship no runtime.
