import * as paperLight from './paper-light.js';
import * as paperDark from './paper-dark.js';

// A curated look is a base theme plus its own palette and a short CSS layer.
// Blocks, figures, and the timeline all come from the base, so every look stays flat and printable.
function variant(base, palette, css) {
  return {
    ...base,
    palette: { ...base.palette, ...palette },
    document: args => base.document(args).replace('</head>', () => `<style>${css}</style>\n</head>`)
  };
}

export const VARIANTS = {
  'field-notes': variant(paperLight, {
    bg: '#f7f1e1', surface: '#f1e9d3', ink: '#25261c', muted: '#5c5a46', hair: '#d9cfb2', rule: '#33401f',
    accent: '#486a1f', accentSoft: '#e5ebcf', box: '#f0e8d1', boxStroke: '#8f8a6a'
  }, `
html,body{background:#e6dcc0}
.sheet{border-left:7px solid var(--ld-accent)}
.doc-title{font-style:italic;font-weight:600}
h2.sec-head{border-color:var(--ld-accent)}
.abstract{border-color:var(--ld-accent)}`),

  editorial: variant(paperLight, {
    bg: '#fbf8f2', surface: '#f4efe5', ink: '#131313', muted: '#555048', hair: '#dcd5c8', rule: '#131313',
    accent: '#b3122b', accentSoft: '#f7e0e1', box: '#f4efe5', boxStroke: '#8c857a'
  }, `
html,body{background:#ece7dd}
.masthead{text-align:left;max-width:none;border-bottom:5px solid var(--ld-ink);padding-bottom:20px;margin-bottom:26px}
.doc-title{font-size:clamp(38px,7vw,76px);line-height:.98;letter-spacing:-.034em}
.doc-subtitle{margin-left:0;font-style:italic}
h2.sec-head{border-top-width:3px}`),

  blueprint: variant(paperDark, {
    bg: '#0b1f3a', surface: '#102a4c', ink: '#e6f0ff', muted: '#9db8dd', hair: '#254a7c', rule: '#5b8fd0',
    accent: '#7fe0ff', accentSoft: '#10335a', box: '#0f2745', boxStroke: '#4a79b5'
  }, `
html,body{background:#081729}
body{background-image:linear-gradient(rgba(127,224,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(127,224,255,.06) 1px,transparent 1px);background-size:32px 32px}
.doc-title{letter-spacing:.01em}
@media print{body{background-image:none}}`)
};
