---
name: project
description: Detects project requests — features, bugs, refactors, or stories — from natural language and routes them to the Stakeholder Liaison agent. Use when the user expresses intent to add, fix, refactor, or plan work on a codebase.
---

## Detection Patterns

This skill activates when a user message matches any of these categories:

**Feature requests:**
- "add X", "build X", "implement X", "I need X", "create X", "can you add X", "I want X"

**Bug reports:**
- "fix X", "broken X", "error in X", "X isn't working", "X is failing", "bug in X", "there's a problem with X"

**Refactor requests:**
- "refactor X", "clean up X", "reorganize X", "restructure X", "improve X", "rewrite X"

**Stories:**
- "story:", "as a user", "user story", "acceptance criteria", "given/when/then"

**When in doubt, activate.** The Stakeholder Liaison will clarify the request type.

## Activation

When this skill activates, dispatch the `stakeholder-liaison` sub-agent via the Task tool:

```
subagent_type: stakeholder-liaison
prompt: "User request: {full user message text}"
```

Return the Stakeholder Liaison's output directly to the user.

## Do NOT Activate For

- Pure research or explanation questions: "how does X work?", "what is X?", "explain X"
- Configuration questions: "what is my current X setting?"
- Questions about already-in-progress work in the current session
- Requests to read or look at code without changing it
