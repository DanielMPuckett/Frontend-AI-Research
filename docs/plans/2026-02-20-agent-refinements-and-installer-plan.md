# Agent Refinements and npx Installer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Wire four superpowers skills and the ux-designer rules directly into agent specs, fix consistency gaps across all 14 agents, and build a Clack-powered npx installer.

**Architecture:** Each agent spec is a targeted markdown edit. The installer is a new Node.js ESM script at `agentic-project-control/installer/install.js` with `@clack/prompts`, registered via a new `agentic-project-control/package.json`.

**Tech Stack:** Node.js ESM, `@clack/prompts` ^0.9.0, bash, existing markdown agent specs

---

### Task 1: Fix stakeholder-liaison memory step numbering + add tier weighting

**Files:**
- Modify: `agentic-project-control/agents/stakeholder-liaison.md`

**Step 1: Read the file**

Confirm current line content around `## Responsibilities`.

**Step 2: Make edit**

In `## Responsibilities`, replace the block that starts with `2. Query memory` and `1. Classify`:

```
2. Query memory for relevant prior context before reading any artifact files:
   - Call `memory_query(agent_name: "stakeholder-liaison", query: "{task description from dispatch prompt}", tier: "global", limit: 5)` — treat results as high-confidence prior context
   - Call `memory_query(agent_name: "stakeholder-liaison", query: "{task description}", tier: "project", project_slug: "{slug}", limit: 5)` — treat results as run-specific decisions to respect
   - If memory returns zero results, proceed normally
1. Classify the request as: `feature | bug | refactor | story`
```

With:

```
1. Query memory for relevant prior context before reading any artifact files:
   - Call `memory_query(agent_name: "stakeholder-liaison", query: "{task description from dispatch prompt}", tier: "global", limit: 5)` — treat results as high-confidence prior context
   - Call `memory_query(agent_name: "stakeholder-liaison", query: "{task description}", tier: "project", project_slug: "{slug}", limit: 5)` — treat results as run-specific decisions to respect
   - If memory returns zero results, proceed normally
   - **Weighting rule:** Global memories are durable cross-project preferences — treat as strong priors. Project memories are decisions made in this run — treat as binding constraints. When they conflict, project memories win.
2. Classify the request as: `feature | bug | refactor | story`
```

**Step 3: Validate**

```bash
bash agentic-project-control/scripts/validate-agents.sh
```
Expected: `All agent specs are valid.`

**Step 4: Commit**

```bash
git add agentic-project-control/agents/stakeholder-liaison.md
git commit -m "fix: correct memory step numbering and add tier weighting in stakeholder-liaison"
```

---

### Task 2: Add memory tier weighting to research-liaison and memory-manager

**Files:**
- Modify: `agentic-project-control/agents/research-liaison.md`
- Modify: `agentic-project-control/agents/memory-manager.md`

**Step 1: Edit research-liaison.md**

In `## Responsibilities`, find the memory query block (lines ending with `- If memory returns zero results, proceed normally`). After that line, add the weighting rule:

```
   - **Weighting rule:** Global memories are durable cross-project preferences — treat as strong priors. Project memories are decisions made in this run — treat as binding constraints. When they conflict, project memories win.
```

**Step 2: Edit memory-manager.md**

In `## Responsibilities`, find `### 4. Write Project-Scoped Memories`. Replace the current text:

```
For observations with category `decision`, `constraint`, or `inter-agent`: also write them with `tier='project'` and `project_slug={slug}`. These capture run-specific context without polluting global memory.
```

With:

```
For observations with category `decision`, `constraint`, or `inter-agent`: also write them with `tier='project'` and `project_slug={slug}`. These capture run-specific context without polluting global memory.

**Tier selection guide:**
- Use `tier='global'` when: the observation would change behavior in a future unrelated project (preferences, rejections, best-practices, repeated-requests)
- Use `tier='project'` when: the observation only matters for this codebase or this run (decisions, constraints, inter-agent notes)
- When uncertain: if the observation includes a project-specific filename, table name, or API — it's project-scoped
```

**Step 3: Validate**

```bash
bash agentic-project-control/scripts/validate-agents.sh
```
Expected: `All agent specs are valid.`

**Step 4: Commit**

```bash
git add agentic-project-control/agents/research-liaison.md agentic-project-control/agents/memory-manager.md
git commit -m "feat: add memory tier weighting guidance to research-liaison and memory-manager"
```

---

### Task 3: Inline ux-designer rules into senior-designer.md

**Files:**
- Modify: `agentic-project-control/agents/senior-designer.md`

**Step 1: Read the file**

Confirm the current Responsibilities section structure.

**Step 2: Replace Responsibilities section**

Replace the entire `## Responsibilities` section with:

```markdown
## Responsibilities
1. Query memory for relevant prior context before reading any artifact files:
   - Call `memory_query(agent_name: "senior-designer", query: "{task description from dispatch prompt}", tier: "global", limit: 5)` — treat results as high-confidence prior context
   - Call `memory_query(agent_name: "senior-designer", query: "{task description}", tier: "project", project_slug: "{slug}", limit: 5)` — treat results as run-specific decisions to respect
   - If memory returns zero results, proceed normally
   - **Weighting rule:** Global memories are durable cross-project preferences — treat as strong priors. Project memories are decisions made in this run — treat as binding constraints. When they conflict, project memories win.
2. Scan the project design system before proposing any component, color, or layout:
   - Read `components.json` for shadcn config and path aliases
   - Read `tailwind.config.ts` / `tailwind.config.js`, or the global CSS `@theme` block if neither exists (Tailwind v4 project)
   - Use the shadcn MCP (`get_project_registries`, then `list_items_in_registries`) to discover available components
   - Read 2–3 existing feature components to understand naming conventions and visual patterns
   - Present a summary: which shadcn components are installed, which color tokens are in use, which spacing and typography conventions you observed
3. Read all context lineage:
   - `.agent/projects/{slug}/00-brief.md`
   - `.agent/projects/{slug}/01-project-plan.md`
   - `.agent/projects/{slug}/02-research.md`
   - `.agent/projects/{slug}/03-architecture.md`
4. Define layouts using ASCII wireframes or clear prose descriptions
5. Specify component selection — before proposing any shadcn component:
   - Use `search_items_in_registries` to confirm it exists in the registry
   - Only propose components that are installed or can be added; never assume availability by name
6. Every design decision must map to a real Tailwind token:
   - Colors: named palette shades (e.g. `slate-900`, `indigo-500`) or `@theme`-defined custom tokens
   - Spacing: named scale values (`p-4`, `gap-6`, `mt-8`)
   - Typography: named type scale (`text-sm`, `text-xl`) with optional line-height override (`text-sm/6`)
   - Never specify arbitrary values (`w-[327px]`, `text-[#ff0000]`) — if a standard token doesn't cover it, document why an extension is needed
7. Define visual hierarchy and interaction patterns in terms of accessibility behavior:
   - Keyboard navigation: Tab order, focus management on modal/drawer open and close
   - Screen reader behavior: ARIA roles, labels, live regions where needed
   - No animation or transition behavior unless the brief explicitly requests it
8. Write `design-spec.md` to `.agent/projects/{slug}/design-spec.md`
```

**Step 3: Validate**

```bash
bash agentic-project-control/scripts/validate-agents.sh
```
Expected: `All agent specs are valid.`

**Step 4: Commit**

```bash
git add agentic-project-control/agents/senior-designer.md
git commit -m "feat: inline ux-designer design system rules into senior-designer"
```

---

### Task 4: Inline ux-designer implementation rules into staff-frontend-engineer.md + TDD + debugging

**Files:**
- Modify: `agentic-project-control/agents/staff-frontend-engineer.md`

**Step 1: Read the file**

Confirm current Responsibilities section structure.

**Step 2: Replace Responsibilities section**

Replace the entire `## Responsibilities` section with:

```markdown
## Responsibilities
1. Query memory for relevant prior context before reading any artifact files:
   - Call `memory_query(agent_name: "staff-frontend-engineer", query: "{task description from dispatch prompt}", tier: "global", limit: 5)` — treat results as high-confidence prior context
   - Call `memory_query(agent_name: "staff-frontend-engineer", query: "{task description}", tier: "project", project_slug: "{slug}", limit: 5)` — treat results as run-specific decisions to respect
   - If memory returns zero results, proceed normally
   - **Weighting rule:** Global memories are durable cross-project preferences — treat as strong priors. Project memories are decisions made in this run — treat as binding constraints. When they conflict, project memories win.
2. Read all context lineage and every file you will modify before writing a single line of code
3. For all UI implementation, follow these rules:

   **Component selection (strict order — never skip these steps):**
   a. Use the shadcn MCP (`search_items_in_registries`) to verify the component exists in the registry — do not assume availability by name
   b. Use `view_items_in_registries` to inspect the component's API and props before writing code that uses it
   c. If not installed: use `get_add_command_for_items` to get the correct install command, then run it
   d. Only write custom markup when `search_items_in_registries` confirms no shadcn component covers the need

   **Tailwind rules:**
   - Import shadcn components from their project path alias (e.g. `@/components/ui/button`), not npm
   - Use `cn()` for conditional class composition
   - All colors, sizes, and spacing must come from Tailwind's named scale or `@theme` extensions — never hardcode hex/rgb/oklch values inline
   - Never use arbitrary values (`w-[327px]`) when a standard scale value works
   - No inline `style` objects except for truly dynamic values

   **Code rules:**
   - Semantic HTML throughout: `<button>` not `<div onClick>`, `<nav>`, `<main>`, `<section>`, `<label>`
   - No animation classes (`animate-`, `transition-`, `duration-`) unless the brief explicitly requests them

   **Accessibility (non-negotiable):**
   - Every form input has a visible `<label>` or `aria-label`
   - Buttons have descriptive text or `aria-label` (no icon-only buttons without labels)
   - Focus is managed on modal/drawer open and close
   - Error messages are associated with their inputs via `aria-describedby`
   - Color is never the only means of conveying information
   - All interactive elements are keyboard accessible

4. Implement frontend changes as specified in `03-architecture.md` under "Staff Frontend Engineer", following the design in `design-spec.md`
5. Implement using test-driven development:
   1. Write a failing test that describes the expected behavior
   2. Run it to confirm it fails for the right reason
   3. Write the minimal implementation to make it pass
   4. Run the full test suite to confirm no regressions
   5. Refactor only after tests are green
6. Follow existing naming conventions and import patterns found in the codebase

If you encounter unexpected errors during implementation: stop and investigate before changing code — form a hypothesis, isolate the failure to the smallest reproducible case, identify root cause. Do not apply symptom-based patches.
```

**Step 3: Validate**

```bash
bash agentic-project-control/scripts/validate-agents.sh
```
Expected: `All agent specs are valid.`

**Step 4: Commit**

```bash
git add agentic-project-control/agents/staff-frontend-engineer.md
git commit -m "feat: inline ux-designer rules, TDD loop, and debugging into staff-frontend-engineer"
```

---

### Task 5: Add TDD loop and debugging to staff-backend-engineer.md

**Files:**
- Modify: `agentic-project-control/agents/staff-backend-engineer.md`

**Step 1: Read the file**

Confirm current Responsibilities. Current step 4 reads: `Write tests for all new functionality — follow test patterns found in the existing test suite`.

**Step 2: Replace step 4**

Replace:
```
4. Write tests for all new functionality — follow test patterns found in the existing test suite
```

With:
```
4. Implement using test-driven development:
   1. Write a failing test that describes the expected behavior, following patterns in the existing test suite
   2. Run it to confirm it fails for the right reason
   3. Write the minimal implementation to make it pass
   4. Run the full test suite to confirm no regressions
   5. Refactor only after tests are green
```

**Step 3: Add debugging guidance after the last numbered responsibility** (before `## Output Format`)

Add after the final responsibility (Laravel pint step):

```
If you encounter unexpected errors during implementation: stop and investigate before changing code — form a hypothesis, isolate the failure to the smallest reproducible case, identify root cause. Do not apply symptom-based patches.
```

**Step 4: Add tier weighting to memory query block**

Add after `- If memory returns zero results, proceed normally`:
```
   - **Weighting rule:** Global memories are durable cross-project preferences — treat as strong priors. Project memories are decisions made in this run — treat as binding constraints. When they conflict, project memories win.
```

**Step 5: Validate**

```bash
bash agentic-project-control/scripts/validate-agents.sh
```

**Step 6: Commit**

```bash
git add agentic-project-control/agents/staff-backend-engineer.md
git commit -m "feat: add TDD loop, debugging guidance, and memory tier weighting to staff-backend-engineer"
```

---

### Task 6: Add TDD loop and debugging to staff-ai-development-engineer.md

**Files:**
- Modify: `agentic-project-control/agents/staff-ai-development-engineer.md`

**Step 1: Read the file**

Confirm current Responsibilities. Current step 3: `Write tests for AI components — use mocking/stubbing for LLM calls in tests (never make real LLM calls in tests)`.

**Step 2: Replace step 3**

Replace:
```
3. Write tests for AI components — use mocking/stubbing for LLM calls in tests (never make real LLM calls in tests)
```

With:
```
3. Implement using test-driven development — mock all LLM calls in tests (never make real LLM calls):
   1. Write a failing test with mocked LLM responses that describes the expected behavior
   2. Run it to confirm it fails for the right reason
   3. Write the minimal implementation to make it pass
   4. Run the full test suite to confirm no regressions
   5. Refactor only after tests are green
```

**Step 3: Add debugging guidance** after the final numbered responsibility (before `## Output Format`):

```
If you encounter unexpected errors during implementation: stop and investigate before changing code — form a hypothesis, isolate the failure to the smallest reproducible case, identify root cause. Do not apply symptom-based patches.
```

**Step 4: Add tier weighting** to memory query block (after `- If memory returns zero results, proceed normally`):
```
   - **Weighting rule:** Global memories are durable cross-project preferences — treat as strong priors. Project memories are decisions made in this run — treat as binding constraints. When they conflict, project memories win.
```

**Step 5: Validate**

```bash
bash agentic-project-control/scripts/validate-agents.sh
```

**Step 6: Commit**

```bash
git add agentic-project-control/agents/staff-ai-development-engineer.md
git commit -m "feat: add TDD loop and debugging guidance to staff-ai-development-engineer"
```

---

### Task 7: Add TDD loop and debugging to staff-model-engineer.md

**Files:**
- Modify: `agentic-project-control/agents/staff-model-engineer.md`

**Step 1: Read the file**

Confirm current Responsibilities. Current step 3: `Write evaluation scripts and unit tests`.

**Step 2: Replace step 3**

Replace:
```
3. Write evaluation scripts and unit tests
```

With:
```
3. Implement using test-driven development:
   1. Write a failing unit test or evaluation script that describes the expected behavior
   2. Run it to confirm it fails for the right reason
   3. Write the minimal implementation to make it pass
   4. Run the full test suite and evaluation scripts to confirm no regressions
   5. Refactor only after tests are green
```

**Step 3: Add debugging guidance** after the final numbered responsibility (before `## Output Format`):

```
If you encounter unexpected errors during implementation: stop and investigate before changing code — form a hypothesis, isolate the failure to the smallest reproducible case, identify root cause. Do not apply symptom-based patches.
```

**Step 4: Add tier weighting** to memory query block:
```
   - **Weighting rule:** Global memories are durable cross-project preferences — treat as strong priors. Project memories are decisions made in this run — treat as binding constraints. When they conflict, project memories win.
```

**Step 5: Validate and commit**

```bash
bash agentic-project-control/scripts/validate-agents.sh
git add agentic-project-control/agents/staff-model-engineer.md
git commit -m "feat: add TDD loop and debugging guidance to staff-model-engineer"
```

---

### Task 8: Add TDD loop and debugging to staff-mcp-engineer.md

**Files:**
- Modify: `agentic-project-control/agents/staff-mcp-engineer.md`

**Step 1: Read the file**

Confirm current Responsibilities. Current step 4: `Write tests for all MCP tool handlers`.

**Step 2: Replace step 4**

Replace:
```
4. Write tests for all MCP tool handlers
```

With:
```
4. Implement using test-driven development:
   1. Write a failing test for each MCP tool handler that describes the expected behavior
   2. Run it to confirm it fails for the right reason
   3. Write the minimal implementation to make it pass
   4. Run the full test suite to confirm no regressions
   5. Refactor only after tests are green
```

**Step 3: Add debugging guidance** after the final numbered responsibility (before `## Output Format`):

```
If you encounter unexpected errors during implementation: stop and investigate before changing code — form a hypothesis, isolate the failure to the smallest reproducible case, identify root cause. Do not apply symptom-based patches.
```

**Step 4: Add tier weighting** to memory query block:
```
   - **Weighting rule:** Global memories are durable cross-project preferences — treat as strong priors. Project memories are decisions made in this run — treat as binding constraints. When they conflict, project memories win.
```

**Step 5: Validate and commit**

```bash
bash agentic-project-control/scripts/validate-agents.sh
git add agentic-project-control/agents/staff-mcp-engineer.md
git commit -m "feat: add TDD loop and debugging guidance to staff-mcp-engineer"
```

---

### Task 9: Add verification gate, systematic debugging, and explicit PASS criteria to qa-expert.md

**Files:**
- Modify: `agentic-project-control/agents/qa-expert.md`

**Step 1: Read the file**

Confirm current Responsibilities section.

**Step 2: Add verification gate and debugging**

After responsibility 3 (`Run the full test suite and capture output`), add two new responsibilities:

```
4. If any tests fail: investigate root cause before writing your report. Form a hypothesis about the failure, isolate it to the smallest reproducible case, identify whether it is a test bug or an implementation bug. Document the specific failure mode and root cause — not just the symptom.
5. Before writing your report, confirm your findings:
   - Re-read the actual test output you captured
   - Verify each success criterion by checking actual output or code behavior — not by reading code alone
   - Do not claim PASS based on code inspection; evidence must come from observed test output
```

Renumber existing steps 4 and step 6/7 accordingly (they become 6 and 7, 8).

**Step 3: Add tier weighting** to memory query block:
```
   - **Weighting rule:** Global memories are durable cross-project preferences — treat as strong priors. Project memories are decisions made in this run — treat as binding constraints. When they conflict, project memories win.
```

**Step 4: Validate and commit**

```bash
bash agentic-project-control/scripts/validate-agents.sh
git add agentic-project-control/agents/qa-expert.md
git commit -m "feat: add verification gate, systematic debugging, and explicit PASS criteria to qa-expert"
```

---

### Task 10: Add verification gate and error handling check to code-review-expert.md

**Files:**
- Modify: `agentic-project-control/agents/code-review-expert.md`

**Step 1: Read the file**

Confirm current Responsibilities section. Current step 5: `Check: is the QA report PASS?`. Current step 7: `Issue verdict and write code-review-report.md`.

**Step 2: Add error handling check**

After responsibility 4 (`Check: do file/function names follow existing codebase conventions?`), add:

```
5. Check: does the error handling implementation match the approach defined in `03-architecture.md`?
   - Look for swallowed errors (empty catch blocks, errors caught and discarded)
   - Look for silent failures (missing user-facing error states when the spec requires them)
   - Look for missing try/catch around operations the architecture spec identified as error-prone
```

Renumber: existing step 5 (`Check: is the QA report PASS?`) becomes step 6, and step 7 becomes step 8.

**Step 3: Add verification gate before issuing verdict**

Before the final responsibility (`Issue verdict`), add:

```
7. Before issuing your verdict: re-read the specific file:line for each issue you plan to report to confirm it exists as described. Do not report issues based on memory of reading — verify against the actual current file content. Evidence before assertions.
```

**Step 4: Add tier weighting** to memory query block:
```
   - **Weighting rule:** Global memories are durable cross-project preferences — treat as strong priors. Project memories are decisions made in this run — treat as binding constraints. When they conflict, project memories win.
```

**Step 5: Validate and commit**

```bash
bash agentic-project-control/scripts/validate-agents.sh
git add agentic-project-control/agents/code-review-expert.md
git commit -m "feat: add verification gate and error handling check to code-review-expert"
```

---

### Task 11: Create root package.json for npx distribution

**Files:**
- Create: `agentic-project-control/package.json`

**Step 1: Create the file**

```json
{
  "name": "agentic-project-control",
  "version": "1.0.0",
  "description": "14-agent orchestration pipeline for Claude Code — install into any project",
  "type": "module",
  "bin": {
    "agentic-project-control": "./installer/install.js"
  },
  "files": [
    "agents",
    "commands",
    "skills",
    "templates",
    "memory-server",
    "installer"
  ],
  "dependencies": {
    "@clack/prompts": "^0.9.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Step 2: Install the dependency**

```bash
cd agentic-project-control && npm install
```

Expected: `node_modules/@clack/prompts` installed, `package-lock.json` created.

**Step 3: Add node_modules to .gitignore**

Verify `agentic-project-control/` does not have its own `.gitignore`. If not, check whether root `.gitignore` covers it. If `node_modules` isn't gitignored at the root, add an entry:

```bash
echo "agentic-project-control/node_modules" >> .gitignore
```

**Step 4: Commit**

```bash
git add agentic-project-control/package.json agentic-project-control/package-lock.json .gitignore
git commit -m "chore: add root package.json for npx distribution"
```

---

### Task 12: Create the Clack-powered installer

**Files:**
- Create: `agentic-project-control/installer/install.js`

**Step 1: Create `agentic-project-control/installer/` directory and write `install.js`**

```javascript
#!/usr/bin/env node
import {
  intro,
  outro,
  confirm,
  spinner,
  note,
  cancel,
  isCancel,
} from '@clack/prompts';
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
const CWD = process.cwd();

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function mergeMcpJson(cwd, packageRoot) {
  const mcpPath = join(cwd, '.mcp.json');
  const sourceMcp = JSON.parse(
    readFileSync(join(packageRoot, '.mcp.json'), 'utf8')
  );
  let existing = { mcpServers: {} };
  if (existsSync(mcpPath)) {
    existing = JSON.parse(readFileSync(mcpPath, 'utf8'));
    if (!existing.mcpServers) existing.mcpServers = {};
  }
  existing.mcpServers.memory = sourceMcp.mcpServers.memory;
  writeFileSync(mcpPath, JSON.stringify(existing, null, 2) + '\n');
}

function addGitignoreEntries(cwd) {
  const gitignorePath = join(cwd, '.gitignore');
  const entries = ['memory/memory.db', '.agent/'];
  let current = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, 'utf8')
    : '';
  const toAdd = entries.filter((e) => !current.includes(e));
  if (toAdd.length > 0) {
    const addition = '\n# Agentic Project Control\n' + toAdd.join('\n') + '\n';
    writeFileSync(gitignorePath, current + addition);
  }
}

intro('Agentic Project Control — Installer');

const withMemory = await confirm({
  message:
    'Install memory system? (requires Ollama with mxbai-embed-large running locally)',
  initialValue: false,
});

if (isCancel(withMemory)) {
  cancel('Installation cancelled.');
  process.exit(0);
}

const agentsDir = join(CWD, '.claude', 'agents');
const hasExisting =
  existsSync(agentsDir) && readdirSync(agentsDir).length > 0;

let overwrite = false;
if (hasExisting) {
  overwrite = await confirm({
    message:
      'Files already exist in .claude/agents/. Overwrite existing files?',
    initialValue: false,
  });
  if (isCancel(overwrite)) {
    cancel('Installation cancelled.');
    process.exit(0);
  }
}

const s = spinner();
s.start('Installing agent specs...');

// Create target directories
for (const dir of [
  '.claude/agents',
  '.claude/commands',
  '.claude/skills/project',
]) {
  mkdirSync(join(CWD, dir), { recursive: true });
}

// Copy agents
const agentsSrc = join(PACKAGE_ROOT, 'agents');
for (const file of readdirSync(agentsSrc)) {
  const dest = join(CWD, '.claude', 'agents', file);
  if (!existsSync(dest) || overwrite) {
    copyFileSync(join(agentsSrc, file), dest);
  }
}

// Copy /project command
const cmdDest = join(CWD, '.claude', 'commands', 'project.md');
if (!existsSync(cmdDest) || overwrite) {
  copyFileSync(join(PACKAGE_ROOT, 'commands', 'project.md'), cmdDest);
}

// Copy project skill
const skillDest = join(CWD, '.claude', 'skills', 'project', 'SKILL.md');
if (!existsSync(skillDest) || overwrite) {
  copyFileSync(
    join(PACKAGE_ROOT, 'skills', 'project', 'SKILL.md'),
    skillDest
  );
}

if (withMemory) {
  s.message('Copying memory server...');
  copyDir(
    join(PACKAGE_ROOT, 'memory-server'),
    join(CWD, 'memory-server')
  );

  s.message('Merging .mcp.json...');
  mergeMcpJson(CWD, PACKAGE_ROOT);

  s.message('Updating .gitignore...');
  addGitignoreEntries(CWD);

  s.message('Installing memory-server dependencies (npm install)...');
  execSync('npm install', {
    cwd: join(CWD, 'memory-server'),
    stdio: 'pipe',
  });
}

s.stop('Done.');

const installed = [
  `✓  .claude/agents/        (${readdirSync(join(CWD, '.claude', 'agents')).length} agent specs)`,
  `✓  .claude/commands/      (project.md)`,
  `✓  .claude/skills/        (project/SKILL.md)`,
  withMemory
    ? `✓  memory-server/         (with npm install)`
    : null,
  withMemory ? `✓  .mcp.json              (memory server merged)` : null,
  withMemory ? `✓  .gitignore             (entries added)` : null,
]
  .filter(Boolean)
  .join('\n');

note(installed, 'Installed');

outro(
  withMemory
    ? 'Ready. Make sure Ollama is running: ollama run mxbai-embed-large\nThen start a project: /project or describe a feature in natural language.'
    : 'Ready. Start a project: /project or describe a feature in natural language.'
);
```

**Step 2: Make the file executable**

```bash
chmod +x agentic-project-control/installer/install.js
```

**Step 3: Smoke-test the installer locally**

Run from a temp directory to verify it doesn't crash on startup:

```bash
mkdir -p /tmp/test-install && cd /tmp/test-install && node /path/to/agentic-project-control/installer/install.js --help || true
```

Expected: Clack intro line appears, then prompts or exits cleanly. No `require is not defined` or import errors.

Actually, test more directly:
```bash
cd /tmp && mkdir apc-test && cd apc-test && node "/Users/danielpuckett/Documents/Frontend AI Research/agentic-project-control/installer/install.js"
```

Expected: Clack intro renders, first prompt appears. Answer `n` to memory, `n` to overwrite if prompted. Verify `.claude/agents/` is created with 14 files.

**Step 4: Commit**

```bash
git add agentic-project-control/installer/install.js
git commit -m "feat: add Clack-powered npx installer"
```

---

### Task 13: Final validation — run the agent validator

**Step 1: Run validator**

```bash
bash agentic-project-control/scripts/validate-agents.sh
```

Expected output:
```
Checking code-review-expert.md...
  ✓ ## Role
  ✓ ## Preconditions
  ✓ ## Context Lineage
  ✓ ## Responsibilities
  ✓ ## Output Format
  ✓ ## Prohibited Actions
[... same for all 14 agents]

All agent specs are valid.
```

**Step 2:** If any agent fails validation, fix the missing section before proceeding.

**Step 3: Final commit if any loose changes**

```bash
git status
# If clean, nothing to do. If dirty:
git add -p
git commit -m "fix: address final validation issues"
```
