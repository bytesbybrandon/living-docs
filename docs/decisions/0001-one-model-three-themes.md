# 0001: One model, three themes, curated style tokens

Status: accepted

## Context

The engine must render the same source as an academic paper, dark reading notes, or a telemetry console without maintaining three document pipelines.
The source varies widely, so a fixed palette cannot fit every subject, but arbitrary CSS would break determinism, printability, and escaping guarantees.

## Decision and alternatives

Use one validated document model with theme-specific presentation.
Themes share block markup and numbering, and differ in CSS, masthead, palette, and which visuals they emphasize.
Per-source adaptation is limited to curated tokens: palette preset, hex seed, type pairing, density, and figure treatment.
Seed colors derive an accent palette, and lightness is corrected until contrast clears a fixed threshold.

Alternatives rejected:

- Per-theme document models: three validators, three escaping paths, duplicated tests.
- Free CSS from the model: unsafe, non-deterministic, and impossible to guarantee for print.
- Fixed palettes only: safe but unable to reflect the source at all.

## Consequences and revisit conditions

Every theme must implement the same block set and keep deterministic output.
New tokens require schema, validator, CSS, tests, and sample coverage, which deliberately makes the token set grow slowly.
Revisit if a source needs a visual form the block model cannot express, or if accessibility checks demand a different contrast rule.
