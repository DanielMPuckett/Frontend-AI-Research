# Using Agentic Project Control with GitHub Copilot in VS Code

This guide maps the existing Agentic Project Control system to GitHub Copilot Chat.

## 1) One-time setup

1. Open this repository in VS Code.
2. Ensure GitHub Copilot and GitHub Copilot Chat extensions are installed and authenticated.
3. Keep these files in place:
   - `.github/copilot-instructions.md`
   - `.github/prompts/project.prompt.md`

## 2) Start a project request

In Copilot Chat, run the `project` prompt file (or paste its text), then describe your request.

Example request:

```text
Use the project prompt: add dark mode support to the document list and filters UI.
```

## 3) How orchestration works in Copilot

Copilot does not support Claude-style sub-agent dispatch with a `Task` tool, so dispatch is simulated by role switching:

- "Act as stakeholder-liaison" → produce `00-brief.md`
- "Act as project-manager" → produce `01-project-plan.md`
- Continue through all required agents in order, writing artifacts to `.agent/projects/{slug}/`

The agent specs in `agentic-project-control/agents/*.md` are still the source of truth for:
- Preconditions
- Context lineage
- Responsibilities
- Output format

## 4) Approval gate

Before any implementation work:
- Present the Phase 1 summary to the user.
- Wait for explicit approval.
- Create `PHASE-1-APPROVED.md`.

## 5) Recommended prompt pattern

Use this snippet whenever manually running an agent:

```text
Act as: {agent-name}
Project slug: {slug}
Artifact directory: .agent/projects/{slug}/
Read first (in order):
- {context files}
Task:
- {agent assignment}
Output format:
- Follow agentic-project-control/agents/{agent-name}.md
```

## 6) Optional: memory server

If you want memory features, start the memory MCP server described in `agentic-project-control/.mcp.json`. If unavailable, proceed without memory and keep all decisions in artifact files.
