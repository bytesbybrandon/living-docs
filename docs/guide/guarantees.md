# Guarantees

## One file per document

CSS, SVG, and the console runtime are inlined.
No CDN, fonts, or remote images are loaded.

## Deterministic output

Identical model and theme produce identical bytes, including generated SVG ids, graph layout, and derived palette values.

## Curated styling

`meta.style` only accepts known palettes, type pairings, densities, and figure treatments.
Accent colors are contrast corrected.
No arbitrary CSS is injected.

## Escaped content

Document text is HTML escaped.
Only `http(s)`, `mailto:`, `#`, and relative URLs survive as links.

## Print ready

Paper themes ship `@page` rules and keep figures, tables, algorithms, and callouts unbroken across pages.

## Known limits

PDF ingestion depends on the optional `unpdf` package and reports a typed error when it is unavailable.
There is no visual regression suite and no per-theme versioning.
