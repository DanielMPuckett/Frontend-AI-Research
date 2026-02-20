# Agent Refinements and npx Installer — Design Document

**Date:** 2026-02-20
**Status:** Approved

---

## Executive Summary

Three parallel workstreams: (1) wire available superpowers skills and the ux-designer skill directly into the relevant agent specs, (2) fix consistency gaps across all 14 agents, and (3) build a Clack-powered npx installer so any developer in the organization can bootstrap the full system into their project via `npx github:your-org/agentic-project-control`.

---

## Table of Contents

1. [Skill Integration](#1-skill-integration)
2. [Agent Prompt Consistency Improvements](#2-agent-prompt-consistency-improvements)
3. [npx Installer](#3-npx-installer)

---

## 1. Skill Integration

### Skills to Wire In

| Skill | Target Agents | Integration Style |
|---|---|---|
| `superpowers:test-driven-development` | staff-backend-engineer, staff-frontend-engineer, staff-ai-development-engineer, staff-model-engineer, staff-mcp-engineer | Replace generic "write tests" step with explicit TDD loop in Responsibilities |
| `superpowers:systematic-debugging` | All 5 implementation agents, qa-expert | Add as conditional step: triggered when unexpected errors or test failures occur |
| `superpowers:verification-before-completion` | qa-expert, code-review-expert | Hard gate before writing report — must run commands and confirm output |
| `frontend-design:frontend-design` | senior-designer, staff-frontend-engineer | Add to Responsibilities as available sub-skill for complex UI sections |
| `ux-designer` (inlined) | senior-designer, staff-frontend-engineer | **Do NOT reference as a skill invocation.** Read the ux-designer skill content and inline its key instructions directly into the agent spec Responsibilities. This eliminates context overhead from skill loading and keeps each agent self-contained. |

### TDD Loop Language (standard across all 5 implementation agents)

Replace the current "write tests" responsibility with:

```
Follow test-driven development for all implementation work:
1. Write a failing test that describes the expected behavior
2. Run it to confirm it fails for the right reason
3. Write the minimal implementation to make it pass
4. Run the full test suite to confirm no regressions
5. Refactor only after tests are green
```

### Systematic Debugging Trigger Language (standard)

```
If you encounter unexpected errors or test failures during implementation,
follow systematic debugging: form a hypothesis, isolate the failure to the
smallest reproducible case, identify root cause before changing any code.
Do not apply symptom-based patches.
```

### Verification Gate Language (QA Expert and Code Review Expert)

```
Before writing your report, you must run the full verification:
- Run the test suite and capture the output
- Confirm the output matches what you are about to claim
- Do not mark PASS based on reading code alone — evidence before assertions
```

---

## 2. Agent Prompt Consistency Improvements

### Changes by Agent

**stakeholder-liaison.md**
- Fix memory query step numbering: currently listed as step 2, must be step 1

**research-liaison.md** + **memory-manager.md**
- Add guidance on how to weight global vs project memories when they conflict:
  - Global tier = durable cross-project preferences; treat as strong prior
  - Project tier = decisions made in this run; treat as binding constraints
  - When they conflict, project tier wins (it is more specific and current)

**senior-designer.md**
- Inline ux-designer skill content into Responsibilities
- Add `frontend-design:frontend-design` as an option for full-page design work

**staff-frontend-engineer.md**
- Inline ux-designer skill content into Responsibilities
- Add `frontend-design:frontend-design` as an option for full-page or complex component work
- Add TDD loop (replacing existing "write tests" step)
- Add systematic-debugging trigger

**staff-backend-engineer.md**, **staff-ai-development-engineer.md**, **staff-model-engineer.md**, **staff-mcp-engineer.md**
- Replace "write tests" step with TDD loop
- Add systematic-debugging trigger

**qa-expert.md**
- Add `superpowers:verification-before-completion` as a hard gate before writing report
- Add `superpowers:systematic-debugging` for test failure investigation
- Add explicit PASS criteria: all success criteria from `00-brief.md` must be verified, test suite must be green, no critical edge cases uncovered

**code-review-expert.md**
- Add `superpowers:verification-before-completion` as a hard gate before marking PASS
- Add explicit error handling compliance check: verify error handling in implementation matches the error handling approach defined in `03-architecture.md`

---

## 3. npx Installer

### Distribution Method

`npx github:your-org/agentic-project-control`

npx fetches the repo directly from GitHub and executes the `bin` entry. No registry configuration needed. Requires read access to the GitHub repo.

### Package Structure

```
installer/
  package.json    (name, version, bin: "./install.js", type: "module")
  install.js      (main CLI entry point, ESM)
```

The `package.json` `bin` field points to `./install.js`. npx reads `package.json` at the repo root to find the bin — the `installer/` subdirectory approach means we need to check how npx resolves the `bin` field. **Important:** npx runs the `bin` from the root `package.json`, so the root `package.json` (currently the memory-server one) must be updated — or a new root-level `package.json` must be created that delegates to `installer/install.js`.

**Resolved approach:** Create a root-level `package.json` with:
```json
{
  "name": "agentic-project-control",
  "version": "1.0.0",
  "type": "module",
  "bin": { "agentic-project-control": "./installer/install.js" },
  "dependencies": { "@clack/prompts": "^0.9.0" }
}
```

The existing `memory-server/package.json` stays as-is (it manages its own deps).

### Install Flow

```
◆  Agentic Project Control — Installer
│
◇  Install memory system? (requires Ollama with mxbai-embed-large running locally)
│  ● Yes   ○ No
│
◇  Files already exist in .claude/agents/. How should we handle conflicts?
│  ● Skip existing files (safe)   ○ Overwrite all
│
◆  Installing...
│  ✓  .claude/agents/        (14 agent specs)
│  ✓  .claude/commands/      (project.md)
│  ✓  .claude/skills/        (project/SKILL.md)
│  ✓  memory-server/         (copied + npm install)
│  ✓  .mcp.json              (merged)
│  ✓  .gitignore             (entries added)
│
◆  Done.
```

### Files Installed (base, no memory)

| Source | Destination |
|---|---|
| `agents/*.md` (14 files) | `.claude/agents/` |
| `commands/project.md` | `.claude/commands/project.md` |
| `skills/project/SKILL.md` | `.claude/skills/project/SKILL.md` |

### Files Installed (with memory)

| Source | Destination |
|---|---|
| `memory-server/` (full dir) | `memory-server/` |
| `.mcp.json` (memory entry) | `.mcp.json` (merged with existing, or created) |
| `.gitignore` additions | `.gitignore` (`memory/memory.db`, `.agent/`) |

### Conflict Handling

- Default: skip any file that already exists at the destination
- If user selects "overwrite": only files that come from this installer are overwritten — nothing else in `.claude/` is touched
- `.mcp.json` merge: add the `"memory"` server entry. If `mcpServers` key already exists, add to it. Never remove existing entries.
- `.gitignore` merge: append new lines only if not already present

### `.mcp.json` Merge Logic

```js
// Read existing .mcp.json if present, else start with {}
const existing = readMcpJson() ?? { mcpServers: {} };
existing.mcpServers.memory = {
  command: "node",
  args: ["memory-server/index.js"],
  env: {
    OLLAMA_HOST: "${OLLAMA_HOST:-http://localhost:11434}",
    OLLAMA_EMBED_MODEL: "${OLLAMA_EMBED_MODEL:-mxbai-embed-large}"
  }
};
writeMcpJson(existing);
```

### No CLI Flags

All configuration goes through Clack prompts. No `--force` or `--with-memory` flags — the interactive prompts are the interface.

---

## Open Questions for Implementation

1. Does the root-level `package.json` need a `"files"` field to avoid npx downloading test files and node_modules from memory-server? (Answer: yes — add `"files": ["agents", "commands", "skills", "installer", "templates", "memory-server"]`)
2. Should the installer `npm install` the memory-server deps synchronously (blocking) or stream the output? (Answer: stream with a spinner, don't hide it — users need to see if it fails)
