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
  const current = existsSync(gitignorePath)
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

const agentCount = readdirSync(join(CWD, '.claude', 'agents')).length;

const installed = [
  `✓  .claude/agents/        (${agentCount} agent specs)`,
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
