# 0002: Timeline cues and video export

Status: accepted

## Context

Docs read as still pages, while the source they come from has an order: a claim, then the figure that shows it.
Short videos that highlight a paper sentence and light up its figure travel well, and readers asked for docs that feel alive.
Decision 0001 kept motion theme owned and the paper themes static.

## Decision and alternatives

Add an optional `timeline` to the model.
Cues target real anchors: sentence marks (`[[mark:id|text]]`), block ids, and parts inside a block.
One inlined runtime applies every cue as a pure function of time, and the same runtime drives theme canvases and CSS figure motion through one clock.
The live page plays the timeline and defers a block's cues until the block scrolls into view; video export renders a fixed stage, seeks each frame in headless Chromium, and encodes with ffmpeg.
The draft path writes cues from the source so new docs move without hand authoring.

Paper themes may now animate, but only when a doc carries a timeline.

Alternatives rejected:

- Real-time screen recording: drops frames and cannot reproduce a render.
- Free-form keyframes in the model: unsafe and unvalidated, the same objection as free CSS in 0001.
- A video-only path: two clocks would drift from the live page.

## Consequences and revisit conditions

Docs without a timeline keep their bytes and ship no runtime.
Print, reduced motion, and no script show the final state.
Playwright and ffmpeg stay optional; video features report typed errors when either is missing.
Frames match across runs on one machine; encoded bytes may differ across machines and ffmpeg builds.
Revisit if cue authoring needs scroll-driven playback, sound, or per-theme stage compositions.
