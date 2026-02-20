# Agent Memory System — Design Document

**Date:** 2026-02-20
**Status:** Approved
**Approach:** Memory Manager as Dedicated 15th Agent (Approach A)

---

## Executive Summary

Each agent in the Agentic Project Control pipeline has a two-tier vector memory backed by a single sqlite-vec database. Agents query their memory before acting and append structured observations to their output. A dedicated Memory Manager agent runs after every pipeline completion to curate, reinforce, contradict, and prune memory records. A custom MCP server exposes all memory operations as tools available to every agent.

---

## Table of Contents

1. [Memory Architecture](#1-memory-architecture)
2. [Memory MCP Server](#2-memory-mcp-server)
3. [Agent Integration](#3-agent-integration)
4. [Memory Manager Agent](#4-memory-manager-agent)

---

## 1. Memory Architecture

### Two-Tier Structure

**Tier 1 — Global Memory** (persists across all projects and pipeline runs)

Stores durable knowledge that should influence every future run:

| Category | Example |
|---|---|
| `preference` | "User's codebase uses repository pattern — avoid direct model queries" |
| `rejection` | "User rejected REST twice in favor of tRPC — default to tRPC" |
| `best-practice` | "shadcn Dialog requires focus management on close or QA fails" |
| `repeated-request` | "User always asks for strict TypeScript — add to architecture spec proactively" |

**Tier 2 — Project Memory** (scoped to a single pipeline run, keyed by `project_slug`)

Stores decisions made in the current run to prevent cross-agent contradiction:

| Category | Example |
|---|---|
| `decision` | "Chose optimistic UI pattern for this feature" |
| `constraint` | "Found existing auth middleware — Staff Backend must not reimplement" |
| `inter-agent` | "Backend used snake_case for API response keys — Frontend must match" |

### Database

Single file: `agentic-project-control/memory/memory.db`

**Schema:**

```sql
CREATE TABLE memories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name    TEXT NOT NULL,
  tier          TEXT NOT NULL CHECK(tier IN ('global', 'project')),
  project_slug  TEXT,              -- NULL for global tier
  content       TEXT NOT NULL,
  category      TEXT NOT NULL CHECK(category IN (
                  'preference', 'rejection', 'best-practice',
                  'repeated-request', 'decision', 'constraint', 'inter-agent'
                )),
  confidence    REAL NOT NULL DEFAULT 0.5 CHECK(confidence BETWEEN 0.0 AND 1.0),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE memory_embeddings USING vec0(
  memory_id INTEGER PRIMARY KEY,
  embedding FLOAT[1024]
);
```

### Retrieval

At runtime, agents call `memory_query` with their current task description as the query string. The MCP server:
1. Embeds the query using the Voyage embedding API
2. Performs a cosine similarity search via sqlite-vec
3. Returns the top-5 most semantically similar records filtered to that agent and tier

---

## 2. Memory MCP Server

**Location:** `agentic-project-control/memory-server/index.js`

**Runtime:** Node.js, registered in `.mcp.json` as `"memory"`

**Embedding model:** `voyage-3` via Anthropic API — key read from `VOYAGE_API_KEY` environment variable

### Tools

| Tool | Arguments | Description |
|---|---|---|
| `memory_query` | `agent_name`, `query`, `tier`, `project_slug?`, `limit? (default 5)` | Embeds query, returns top-K semantically similar records for that agent |
| `memory_write` | `agent_name`, `tier`, `content`, `category`, `confidence`, `project_slug?` | Embeds and stores a new memory record |
| `memory_update` | `id`, `confidence?`, `content?` | Updates confidence score or content of an existing record |
| `memory_prune` | `agent_name`, `below_confidence` | Deletes all records for an agent below the confidence threshold |

### .mcp.json Entry

```json
{
  "memory": {
    "command": "node",
    "args": ["agentic-project-control/memory-server/index.js"]
  }
}
```

### Confidence Scoring Rules

| Event | Confidence Change |
|---|---|
| New observation (auto) | Set to observation's stated value (0.3–0.9) |
| Explicit user preference | Set to 0.9 |
| Pattern observed again | +0.1 (max 1.0) |
| Pattern contradicted | -0.2 |
| Below 0.1 threshold | Pruned on next Memory Manager run |

---

## 3. Agent Integration

Two additions are made to every agent spec:

### Addition 1: Memory Query Step (first step in Responsibilities)

Before reading context lineage files, every agent calls `memory_query` twice:

```
# Query global memory for durable preferences
memory_query(agent_name: "{agent}", query: "{task description}", tier: "global", limit: 5)

# Query project memory for decisions made in this run
memory_query(agent_name: "{agent}", query: "{task description}", tier: "project", project_slug: "{slug}", limit: 5)
```

Returned memories are treated as high-confidence prior context. They do not override the architecture spec but act as strong signals — especially rejections and preferences.

### Addition 2: Observations Section (appended to every Output Format)

Every agent appends this block to its completion summary:

```markdown
## Observations
- category: preference | rejection | best-practice | repeated-request | decision | constraint | inter-agent
  content: [one specific, factual sentence about what was observed]
  confidence: [0.3–0.9]
```

**Rules for writing observations:**
- One observation per bullet — never combine multiple facts
- Be specific: "user prefers X" not "user has preferences"
- Only state what was actually observed in this run — no speculation
- Confidence guide: 0.3–0.4 (single weak signal), 0.5–0.6 (moderate signal), 0.7–0.9 (strong or repeated signal)

**Example output:**
```markdown
## Observations
- category: preference
  content: Codebase uses repository pattern for all data access — direct model queries not present anywhere
  confidence: 0.8
- category: rejection
  content: REST endpoints in spec but existing codebase is fully tRPC — aligned to tRPC instead
  confidence: 0.7
- category: inter-agent
  content: API response keys use snake_case — Staff Frontend Engineer must match
  confidence: 0.9
```

---

## 4. Memory Manager Agent

The Memory Manager is the **15th agent** in the system. It runs once after Phase 3 completes on every pipeline run, regardless of PASS or REQUIRED FIXES outcome.

### Trigger

Dispatched by the Project Manager immediately after `code-review-report.md` is written.

### Responsibilities

1. Collect all `## Observations` blocks from every agent completion summary in the current run
2. For each observation:
   - Query global memory for semantically similar existing records (`similarity > 0.85`)
   - **Match found:** call `memory_update` to increment confidence (+0.1) and refine content if clearer
   - **No match:** call `memory_write` to create new record at the observation's stated confidence
   - **Contradiction found:** call `memory_update` to decrement confidence (-0.2), update content to note the contradiction
3. Scan the user's messages in the pipeline run for explicit preferences ("always...", "never...", "I prefer...", "stop doing...") — write these at `confidence: 0.9`
4. Call `memory_prune` for each agent to remove records below `0.1` confidence
5. Write project-scoped memories (decisions, constraints, inter-agent notes) using `tier: "project"` so they do not pollute global memory

### Output Format

```markdown
## Memory Manager: Update Complete

### Records Written
- [agent_name]: [content] (confidence: 0.X)

### Records Reinforced
- [agent_name]: [content] (confidence: 0.X → 0.X)

### Records Pruned
- [N] records removed below 0.1 confidence threshold

### Explicit User Preferences Captured
- [content at confidence 0.9] — or "none"
```

### Prohibited Actions
- Never modify source files or Phase 1 artifacts
- Never write speculative memories — only record what was explicitly observed or stated
- Never skip pruning — run `memory_prune` for every agent that had observations in this run
- Never store inter-agent notes as global tier — these are always project-scoped

---

## Agent Spec Changes Required

Every existing agent spec requires two additions:

1. **Preconditions:** Add `memory-server MCP tool must be available`
2. **Responsibilities:** Add memory query step as the **first** responsibility (before reading context lineage)
3. **Output Format:** Add `## Observations` section as the **last** section

The Project Manager spec requires one addition:
- **Phase 3 Orchestration:** After Code Review Expert completes, dispatch Memory Manager before closing the pipeline

---

## Open Questions for Implementation

1. Should the memory DB be committed to git, or gitignored (like `.agent/projects/`)?
2. What happens on first run when memory is empty — should agents skip the query step or run it and get zero results gracefully?
3. Should the Memory Manager have a dry-run mode that shows proposed writes/updates without committing them?
