# Style tokens

`meta.style` adapts a theme to its source without accepting arbitrary CSS.
Every choice is curated and validated, so the page stays coherent, printable, and deterministic.

| Token | Values | Effect |
| --- | --- | --- |
| `palette` | `default`, `ember`, `ocean`, `moss`, `graphite`, `ink`, `plum` | curated accent family |
| `seed` | hex color, for example `#2f6f8f` | derives the accent, tinted surfaces, and figure fills; lightness is corrected until the accent clears WCAG contrast against the page |
| `type` | papers: `classic`, `editorial`, `technical`; console: `mono`, `hybrid`, `terminal` | curated font stacks, no web fonts |
| `density` | `compact`, `normal`, `roomy` | body size, leading, figure margins, panel height |
| `figure` | `outline`, `solid`, `minimal` | diagram fill and stroke; `minimal` also drops chart gridlines |

`meta.accent` remains available as a direct accent override.
Invalid tokens fail validation at `meta.style`.

## Motion

Motion has two layers.

`figure.motion` animates one generated figure with `draw`, `reveal`, or `steps`.
It is scoped CSS on the SVG, freezes for print, and disables under `prefers-reduced-motion`.
The content stays visible while the animation runs.

The console theme also animates its graph, pulse, and clock.
Those animations are theme owned, not tokens.

## Example

```json
{
  "meta": {
    "title": "Example",
    "style": {
      "seed": "#2f6f8f",
      "type": "editorial",
      "density": "roomy",
      "figure": "minimal"
    }
  }
}
```

## See also

- [Document model](document-model.md)
- [Guarantees](guarantees.md)
