# MCP server

The package ships a stdio MCP server over the same core as the CLI.

## Published package

```json
{
  "mcpServers": {
    "living-docs": {
      "command": "npx",
      "args": ["-y", "-p", "living-docs-axi", "living-docs-mcp"]
    }
  }
}
```

## Local checkout

```json
{
  "mcpServers": {
    "living-docs": {
      "command": "node",
      "args": ["<absolute-checkout>/bin/living-docs-mcp.js"]
    }
  }
}
```

## Tools

| Tool | Purpose |
| --- | --- |
| `living_docs_themes` | list the themes (three structural bases plus curated looks) and what each is best for |
| `living_docs_schema` | block fields, or one block in detail |
| `living_docs_ingest` | outline a source, optionally draft a model with timeline cues (`static` skips them) |
| `living_docs_render` | validate and write HTML, or `format` mp4, webm, or gif, from a model, a model path, or a source |
| `living_docs_preview` | serve built docs and return the URL |

`living_docs_render` accepts a model object, a model path, or a source to draft from.
Tools return compact text, and errors are marked with `isError`.

## See also

- [CLI reference](cli.md)
- [Document model](document-model.md)
