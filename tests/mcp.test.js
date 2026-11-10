import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/mcp/server.js';

async function connect() {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'living-docs-test', version: '0.0.0' }, { capabilities: {} });
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport)
  ]);
  return { client, server };
}

test('lists the five tools with JSON schemas', async () => {
  const { client, server } = await connect();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), [
    'living_docs_ingest',
    'living_docs_preview',
    'living_docs_render',
    'living_docs_schema',
    'living_docs_themes'
  ]);
  for (const tool of tools) {
    assert.equal(tool.inputSchema.type, 'object');
    assert.ok(tool.description.length > 10);
  }
  await client.close();
  await server.close();
});

test('ingests a source and renders a model through tool calls', async () => {
  const { client, server } = await connect();

  const outline = await client.callTool({
    name: 'living_docs_ingest',
    arguments: { path: path.resolve('samples/source/harness-notes.md') }
  });
  assert.match(outline.content[0].text, /sections: 4/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'living-docs-mcp-'));
  const out = path.join(dir, 'doc.html');
  const rendered = await client.callTool({
    name: 'living_docs_render',
    arguments: {
      source: path.resolve('samples/source/harness-notes.md'),
      theme: 'hud',
      out
    }
  });
  assert.equal(rendered.isError, undefined);
  assert.match(rendered.content[0].text, /ok: true/);
  assert.match(rendered.content[0].text, /theme: hud/);
  const html = fs.readFileSync(out, 'utf8');
  assert.match(html, /theme-hud/);

  const invalid = await client.callTool({ name: 'living_docs_schema', arguments: { block: 'ghost' } });
  assert.equal(invalid.isError, true);
  fs.rmSync(dir, { recursive: true, force: true });
  await client.close();
  await server.close();
});
