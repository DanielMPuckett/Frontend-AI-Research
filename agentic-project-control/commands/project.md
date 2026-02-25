---
description: Start a new project request — feature, bug report, refactor, or story. Invokes the Stakeholder Liaison to gather requirements and begin the pipeline.
argument-hint: Describe what you want to build, fix, or change (e.g. "add dark mode to the settings page")
---

# Project Request

You have received a project request via the `/project` command.

User request: $ARGUMENTS

Dispatch the `stakeholder-liaison` sub-agent using the Task tool with this prompt:

```
User request: $ARGUMENTS

You are the first agent in the Agentic Project Control pipeline. Gather requirements from the user and produce a project brief.
```

Return the Stakeholder Liaison's output directly to the user without modification.


## Copilot Chat Compatibility

If you are running in GitHub Copilot Chat (VS Code) and the `Task` tool is unavailable, emulate dispatch manually:

1. Read `agentic-project-control/agents/stakeholder-liaison.md` and follow it as the active role.
2. Produce the same artifact/output that the Stakeholder Liaison would return.
3. Continue with `project-manager.md` orchestration rules for subsequent phases.

