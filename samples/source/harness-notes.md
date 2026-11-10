# Notes on Harness Engineering

A harness is the program written around a model: the loop, the tools, the context management, the safety controls, and the extension surfaces. The model is frozen inside the product; the harness is what changes.

The useful boundary is simple. Everything outside the weights can be rewritten, swapped, or governed, and that is where the design decisions live.

## The seven subsystems

Each subsystem has a minimal implementation and a maximal one.

| Subsystem | Minimal | Maximal |
| --- | --- | --- |
| Loop | One tool at a time | Parallel tools, checkpoints, budgets |
| Tools | Shell and editor | Sandboxes, LSP edits, browser |
| Context | Recent turns | Retrieval, compaction, memory files |
| Safety | Confirm writes | Permission modes, audit trails |
| Orchestration | One task | Subagents, queues, cancellation |
| Extensions | None | MCP, skills, hooks, marketplaces |
| LLM integration | One key | Multi-provider routing |

The gap between the two columns is where most of the source code lives.

## Extensibility standards

Three standards show up across the corpus:

- MCP for the tool boundary
- SKILL.md for the instruction boundary
- ACP for the agent-to-agent boundary

Adoption is uneven: SKILL.md leads MCP nine to eight out of eleven systems, and ACP reaches six.

## From tool to platform

Codex adopts Claude Code's hook vocabulary; OpenHands reads its plugin format. The harness becomes an SDK with a marketplace attached.

> The harness is the product surface; the loop is the discipline.

## A selection procedure

```text
for each harness h:
  score[h] = held-out score of h on the task set
  cost[h] = tokens + wall clock + human approvals
choose h maximizing score[h] subject to the budget
```
