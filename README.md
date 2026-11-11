# living-docs

[![CI](https://github.com/bytesbybrandon/living-docs/actions/workflows/ci.yml/badge.svg)](https://github.com/bytesbybrandon/living-docs/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Turns a source document into a designed, self-contained HTML doc in one of three styles: an academic paper, dark reading notes, or a telemetry console.
Ships an AXI CLI and a stdio MCP server over the same core.

---

### Key Features

* **Themes:** `paper-light` for papers and reports, `paper-dark` for reading notes and essays, `hud` for repo audits and system snapshots. Curated looks (`field-notes`, `editorial`, `blueprint`) sit on them, and `ingest --draft` designs a look and accent from the source itself.
* **Generated visuals:** diagrams and charts render as inline SVG from a compact spec, and the console hero uses a seeded graph layout.
* **Living timeline:** cues highlight the source's own sentences, light up the figure parts they describe, count numbers, type text, and scroll the video frame. Motion stays inside each block, so figures and text stay flat and legible. Drafted docs get cues automatically. See [Timeline and video](docs/guide/timeline.md).
* **Video export:** `render --format mp4|webm|gif` records the timeline frame by frame, with optional Playwright and ffmpeg.
* **Figure motion:** `draw`, `reveal`, and `steps` animate a generated figure with scoped CSS, then freeze for print and reduced motion. See [Document model](docs/guide/document-model.md).
* **Per-source style tokens:** palette, seed color, type pairing, density, and figure treatment adapt a theme without arbitrary CSS. See [Style tokens](docs/guide/style-tokens.md).
* **One self-contained file:** inline CSS, inline SVG, no network assets, and print rules. See [Guarantees](docs/guide/guarantees.md).
* **Engine and interfaces:** the same core powers the CLI and the MCP server.

### Tech Stack

* **Language:** JavaScript on Node.js 20 or newer, ECMAScript modules.
* **Rendering:** no UI framework and no build step; blocks, SVG, and theme CSS are plain JavaScript.
* **Dependencies:** `@modelcontextprotocol/sdk` for the MCP server and `unpdf` for PDF text extraction. Video export uses the optional `playwright` package and `ffmpeg`.
* **Tests:** the Node.js built-in test runner.

### Table of Contents

1. [Getting Started](#getting-started)
2. [Usage](#usage)
3. [Running Tests](#running-tests)
4. [Project Structure](#project-structure)
5. [Contributing](#contributing)
6. [License](#license)

---

### Getting Started

Install the package globally or run it without installing.

#### Prerequisites

* Node.js 20 or newer.
* npm 10 or newer.

#### Installation

1. **Install from npm:**
   ```bash
   npm install -g living-docs-axi
   ```
2. **Or clone the repository:**
   ```bash
   git clone https://github.com/bytesbybrandon/living-docs.git
   cd living-docs
   ```
3. **Install dependencies for a checkout:**
   ```bash
   npm install
   ```
4. **Environment setup:** none. The engine reads files and URLs only.

---

### Usage

#### Running Locally

Render the bundled samples:

```bash
npm run samples
```

That writes one HTML file per sample model into `docs/`.

#### Code Example

```bash
node bin/living-docs-axi.js ingest samples/source/harness-notes.md --draft --theme paper-dark -o docs/note.model.json
node bin/living-docs-axi.js render docs/note.model.json --theme paper-dark -o docs/note.html
node bin/living-docs-axi.js preview docs
```

With the published package, use `npx -y living-docs-axi` for each command.

Detailed references:

* [Pipeline](docs/guide/pipeline.md)
* [CLI reference](docs/guide/cli.md)
* [Document model](docs/guide/document-model.md)
* [Style tokens](docs/guide/style-tokens.md)
* [MCP server](docs/guide/mcp.md)
* [Reactive workflow](docs/guide/reactive-workflow.md)
* [Guarantees](docs/guide/guarantees.md)
* [Architecture](ARCHITECTURE.md)
* [Decisions](docs/decisions/0001-one-model-three-themes.md)
* [Website](https://bytesbybrandon.github.io/living-docs/), built from this repository with `npm run site`

---

### Running Tests

```bash
npm test
```

The suite covers rendering determinism and self-containment, escaping and link sanitization, schema validation, ingest of Markdown, HTML, and text, CLI behavior and exit codes, an in-memory MCP client round trip, and style token resolution.

---

### Project Structure

```text
living-docs/
  bin/                 CLI and MCP entry points
  src/
    axi/               command parsing, compact output, file writes, preview
    ingest/            Markdown, text, HTML, URL, and PDF intake
    mcp/               stdio MCP server and tool definitions
    model/             document model schema, validator, safe inline Markdown
    render/            block renderers, SVG generators, style resolution, themes
    server/            local preview server
  samples/             sample models and one Markdown source
  scripts/             sample and website build scripts
  site/                landing page template and stylesheet for the website
  tests/               Node test runner suites
  docs/
    decisions/         architecture decision records
    guide/             user and contributor guides
```

---

### Contributing

Contributions are welcome.
Read [CONTRIBUTING.md](.github/CONTRIBUTING.md) for the fork, branch, test, and pull request workflow.
Repository agent rules live in [AGENTS.md](AGENTS.md), and module boundaries live in [ARCHITECTURE.md](ARCHITECTURE.md).

---

### License

Released under the MIT License.
See [LICENSE](LICENSE).
