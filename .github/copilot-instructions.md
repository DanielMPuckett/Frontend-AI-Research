# Agentic Project Control — GitHub Copilot Chat Instructions

Use these instructions when working in VS Code with GitHub Copilot Chat so the existing `agentic-project-control` pipeline can run without Claude-specific tooling.

## Goals
- Preserve the same phase-based workflow used by `agentic-project-control`.
- Keep artifacts in `.agent/projects/{project-slug}/`.
- Treat `PHASE-1-APPROVED.md` as a hard gate before any implementation.

## Workflow
1. If a request is to build/fix/refactor/plan, start with the Stakeholder Liaison behavior in `agentic-project-control/agents/stakeholder-liaison.md`.
2. Generate `00-brief.md`, then follow `project-manager.md` to produce `01-project-plan.md`.
3. Complete Phase 1 artifacts (`02-research.md`, `03-architecture.md`, and conditional `04-database-schema.md`).
4. Ask the user for explicit approval before Phase 2.
5. After approval, run only the required implementation agents.
6. Run QA + code review artifacts before final completion.

## Copilot-Specific Rules
- GitHub Copilot Chat does not provide a `Task` tool for sub-agent dispatch. Simulate dispatch by explicitly switching roles in chat prompts and following each agent file's responsibilities.
- When a prompt says "dispatch X agent", treat that as: "adopt X agent spec, read required context files, and produce its artifact/output format".
- Keep all generated artifacts deterministic and file-based so any IDE/chat tool can continue the flow.

## Prompting Pattern for Copilot Chat
When running an agent manually, use this format:

```
Act as: {agent-name}
Project slug: {slug}
Artifact directory: .agent/projects/{slug}/
Read first (in order):
- ...
Task:
- ...
Output format:
- Follow {agent-spec-file}
```

## Source of Truth
Agent specs and templates under `agentic-project-control/` remain authoritative. If these instructions conflict with an agent spec, follow the agent spec.
