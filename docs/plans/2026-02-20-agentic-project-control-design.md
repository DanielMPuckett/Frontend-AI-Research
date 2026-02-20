# Agentic Project Control System — Design Document

**Date:** 2026-02-20
**Status:** Approved
**Approach:** Two-Phase Pipeline with Parallel Execution (Approach B)

---

## Executive Summary

A Claude Code sub-agent system that takes any user request — feature, bug, refactor, or story — through a structured planning and execution pipeline. The Stakeholder Liaison gathers requirements from the user, the Project Manager orchestrates all downstream agents, and the system produces a human-approved plan before any code is written.

---

## Table of Contents

1. [File Hierarchy & Artifact Structure](#1-file-hierarchy--artifact-structure)
2. [Agent Roster & Roles](#2-agent-roster--roles)
3. [Orchestration Flow](#3-orchestration-flow)
4. [Agent Communication Standards](#4-agent-communication-standards)
5. [Entry Points & Triggers](#5-entry-points--triggers)
6. [Industry Patterns Referenced](#6-industry-patterns-referenced)

---

## 1. File Hierarchy & Artifact Structure

All project artifacts live under `.agent/projects/{project-slug}/` at the root of the working repository. The slug is kebab-case derived from the request, suffixed with the date (e.g., `add-dark-mode-2026-02-20`).

```
.agent/
  projects/
    {project-slug}/
      00-brief.md              ← Stakeholder Liaison
      01-project-plan.md       ← Project Manager
      02-research.md           ← Research Liaison
      03-architecture.md       ← Senior Engineer
      04-database-schema.md    ← Database Manager (conditional)
      PHASE-1-APPROVED.md      ← Gate file; created by PM on user approval
```

### Lineage Rule

Every agent reads all numbered files below its own before acting. Example:

- **Staff Backend Engineer** reads `00` through `03` (and `04` if present)
- **Staff Frontend Engineer** reads `00` through `03` plus Senior Designer output
- **Q/A Expert** reads all Phase 1 artifacts plus changed source files

`PHASE-1-APPROVED.md` is a hard gate — no Phase 2 agent may start until it exists. It is a copy of `01-project-plan.md` with `status: approved` in its frontmatter.

### Conditional Artifacts

- `04-database-schema.md` is only created if the request involves database work. The PM determines this from `00-brief.md`.
- Senior Designer output is only produced if the request involves UI work.

---

## 2. Agent Roster & Roles

### Phase 1 — Planning Wave *(sequential)*

| Agent | Triggered By | Reads | Produces |
|---|---|---|---|
| **Stakeholder Liaison** | User request | Nothing | `00-brief.md` |
| **Project Manager** | Liaison handoff | `00` | `01-project-plan.md` |
| **Research Liaison** | PM dispatch | `00`, `01` | `02-research.md` |
| **Senior Engineer** | Research complete | `00`–`02` | `03-architecture.md` |
| **Database Manager** | PM dispatch *(conditional)* | `00`–`02` | `04-database-schema.md` |

Research Liaison and Database Manager run in parallel after the PM produces `01-project-plan.md`. The Senior Engineer runs after both complete.

### Phase 2 — Execution Wave *(parallel)*

All agents read the **full Phase 1 artifact directory** before writing any code.

| Agent | Domain | Reads |
|---|---|---|
| **Staff Backend Engineer** | API, controllers, services | `00`–`04` |
| **Staff Frontend Engineer** | React/UI components | `00`–`04` + Senior Designer output |
| **Staff AI Development Engineer** | AI feature integration | `00`–`04` |
| **Staff MCP Engineer** | MCP tools/servers | `00`–`04` |
| **Staff Model Engineer** | ML model work | `00`–`04` |
| **Senior Designer** | Visual design, component specs | `00`–`03` |

The PM decides which Phase 2 agents are applicable based on `01-project-plan.md`. Not every agent runs on every request.

Senior Designer runs first if UI work is involved; Staff Frontend Engineer waits for its output before starting.

### Phase 3 — Verification Wave *(sequential)*

| Agent | Reads | Produces |
|---|---|---|
| **Q/A Expert** | Phase 1 artifacts + changed source files | `qa-report.md` |
| **Code Review Expert** | Phase 1 artifacts + changed files + `qa-report.md` | Review report |

If Code Review issues `REQUIRED FIXES`, the PM re-dispatches the relevant Phase 2 agent(s) and the Phase 3 wave repeats.

---

## 3. Orchestration Flow

### Phase 1 Flow

```
User Request
    │
    ▼
Stakeholder Liaison
  • Asks clarifying questions (one at a time, high-touchpoint mode)
  • Determines request type: feature / bug / refactor / story
  • Writes 00-brief.md
    │
    ▼
Project Manager
  • Reads 00-brief.md
  • Determines which agents are needed
  • Writes 01-project-plan.md
  • Dispatches in parallel: Research Liaison + (conditionally) DB Manager
  • Waits for both to complete
    │
    ├── Research Liaison ──────────→ writes 02-research.md
    └── Database Manager (cond.) ──→ writes 04-database-schema.md
    │
    ▼
Senior Engineer
  • Reads 00–02 (and 04 if present)
  • Writes 03-architecture.md
    │
    ▼
Project Manager (surfaces to user)
  • Presents plan summary with links to all Phase 1 artifacts
  • Asks: "Approve this plan and begin implementation?"
    │
    ▼ (on approval)
  Writes PHASE-1-APPROVED.md → triggers Phase 2
```

### Phase 2 Flow

```
Project Manager
  • Reads 01-project-plan.md to determine applicable Phase 2 agents
  • (If UI work) Dispatches Senior Designer first, waits for output
  • Dispatches all remaining applicable agents IN PARALLEL
    │
    ├── Staff Backend Engineer
    ├── Staff Frontend Engineer   ← waits for Senior Designer if UI work
    ├── Staff AI Development Engineer
    ├── Staff MCP Engineer
    └── Staff Model Engineer
         │
         ▼ (all complete)
Project Manager
  • Collects structured summaries from all agents
  • Dispatches Phase 3
```

### Phase 3 Flow

```
Q/A Expert
  • Runs tests, writes qa-report.md
    │
    ▼
Code Review Expert
  • Reviews code + QA report
  • Issues PASS or REQUIRED FIXES
    │
    ├── PASS ──────────────→ PM notifies user, pipeline closes
    └── REQUIRED FIXES ────→ PM re-dispatches relevant Phase 2 agent(s)
                             └── loops back to Phase 3
```

### Validation Gates

At every handoff point, the PM performs a lightweight validation check on the artifact before dispatching the next agent. If an artifact is malformed, missing required sections, or flagged as incomplete, the PM re-runs the producing agent rather than propagating bad state downstream. This directly addresses the industry finding that specification failures cause 42% of multi-agent breakdowns.

---

## 4. Agent Communication Standards

### Phase 1 Artifact Format

Every Phase 1 artifact uses this frontmatter and structure:

```markdown
---
agent: {agent-name}
project: {project-slug}
request-type: feature | bug | refactor | story
date: YYYY-MM-DD
status: draft | approved
---

# [Document Title]

## Summary
One paragraph. What is being built/fixed and why.

## [Document-specific sections]
...

## Open Questions
Unresolved items that downstream agents must address.

## Assumptions
What this agent assumed when information was missing.
```

### Agent Spec File Structure

Each agent is defined as a `.md` file. Every spec must include all sections below — no exceptions:

```markdown
---
name: {agent-name}
description: [one sentence used by the Task tool dispatch]
tools: [explicit list]
model: sonnet
---

## Role
Who this agent is and what it is expert in.

## Preconditions
What MUST exist before this agent runs.
(e.g., "PHASE-1-APPROVED.md must exist")

## Context Lineage
Which files to read, in which order, before acting.

## Responsibilities
What this agent produces.

## Output Format
Exact structure of what it returns to the PM.

## Prohibited Actions
What this agent must never do.
(e.g., "Never modify files outside src/", "Never skip reading 00-brief.md")
```

### PM Handoff Message Format

When the Project Manager dispatches a sub-agent via the Task tool, every prompt must follow this structure:

```
Project slug: {slug}
Artifact directory: .agent/projects/{slug}/

Context lineage (read in order before acting):
  - .agent/projects/{slug}/00-brief.md
  - .agent/projects/{slug}/01-project-plan.md
  - .agent/projects/{slug}/02-research.md
  - .agent/projects/{slug}/03-architecture.md

Your task:
  {specific task description from 01-project-plan.md}

Return your output in the format specified in your agent spec.
```

This ensures every agent receives its full lineage explicitly rather than by assumption.

### Phase 2 Agent Output Format

Phase 2 agents write code to source files and return a structured summary to the PM:

```markdown
## {Agent Name}: Implementation Complete

### Files Modified
- path/to/file.ts — description of change

### Files Created
- path/to/file.ts — description

### Assumptions Made
- [anything not covered by Phase 1 artifacts]

### Blockers / Follow-up Required
- [anything the PM or other agents need to know]
```

---

## 5. Entry Points & Triggers

### Slash Command

```
/project <request>
```

Explicitly invokes the Stakeholder Liaison with `$ARGUMENTS` as the request.

### Natural Language

A skill monitors incoming messages for patterns indicating a project request:

- Feature requests: `"add X"`, `"build X"`, `"implement X"`, `"I need X"`
- Bug reports: `"fix X"`, `"broken X"`, `"error in X"`, `"X isn't working"`
- Refactor requests: `"refactor X"`, `"clean up X"`, `"reorganize X"`
- Stories: `"story: ..."`, `"as a user..."`, `"user story"`

When matched, the skill routes to the Stakeholder Liaison.

### Request Type Determination

The Stakeholder Liaison classifies the request into one of four types in `00-brief.md`. This classification controls PM behavior:

| Type | Phase 1 Required | Phase 2 Default |
|---|---|---|
| **Feature** | Full wave | All applicable agents |
| **Bug** | Brief + Plan + Architecture | Backend or Frontend only |
| **Refactor** | Full wave | All agents touching affected code |
| **Story** | Full wave | All applicable agents |

---

## 6. Industry Patterns Referenced

This design draws from the following established patterns:

**Manager-Worker (CrewAI/MetaGPT):** Hub-and-spoke topology with a coordinator agent dispatching specialists. CrewAI research shows combining role-based assignment with structured knowledge bases improves delegation accuracy from 33% to 73%.

**Handoff Pattern (AutoGen/Swarm):** Agents pass shared context forward explicitly, not by inference. All prior artifacts are included in every dispatch prompt.

**State Graph (LangGraph):** Artifacts are first-class objects with checksums/status fields, not just text. The `status: approved` frontmatter field implements a lightweight version of LangGraph's immutable state updates.

**Blackboard Architecture:** The `.agent/projects/{slug}/` directory acts as a shared blackboard. All agents read from it; each agent writes exactly one artifact to it. No agent modifies another agent's artifact.

**Validation Gates:** Checkpoints at every handoff boundary prevent cascading errors — identified as a leading cause of multi-agent failures in MASFT research (2025).

---

## Open Questions for Implementation

1. Should the Stakeholder Liaison be a skill (user-invocable) or a pure sub-agent (only dispatched by the system)?
2. Should `.agent/` be gitignored by default, or committed as part of the project audit trail?
3. What is the maximum number of Phase 3 retry loops before the PM escalates to the user?
4. Should the Research Liaison use web search tools, or only search the local codebase?
