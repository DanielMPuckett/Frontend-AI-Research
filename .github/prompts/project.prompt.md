---
mode: ask
tools: ["codebase", "editFiles", "runCommands"]
description: Start or continue an Agentic Project Control request in GitHub Copilot Chat.
---

Use the `agentic-project-control` system for this request:

{{input}}

Requirements:
1. Detect request type (feature, bug, refactor, or story).
2. Act as Stakeholder Liaison first and gather missing requirements.
3. Create/update artifacts in `.agent/projects/{project-slug}/` using the templates in `agentic-project-control/templates/`.
4. Follow sequencing in agent specs under `agentic-project-control/agents/`.
5. Do not start Phase 2 implementation until user approval is captured and `PHASE-1-APPROVED.md` exists.
6. If an agent spec says "dispatch", perform that role directly in this chat session and produce the expected artifact.

Return:
- Current phase status
- Artifact files created/updated
- Next required user action (if any)
