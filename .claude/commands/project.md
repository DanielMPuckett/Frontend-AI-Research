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
