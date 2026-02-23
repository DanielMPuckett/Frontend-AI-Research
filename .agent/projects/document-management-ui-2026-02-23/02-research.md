---
agent: research-liaison
project: document-management-ui-2026-02-23
date: 2026-02-23
status: draft
---

# Research: Document Management UI

## Summary
This is a new application built from scratch. The working directory is an agentic-project-control meta-system with no existing app patterns to inherit. The recommended stack — React + Vite + Node.js/Express + SQLite via better-sqlite3 — is well-validated for local single-user tools. SQLite FTS5 is the right choice for full-text search given its zero-configuration nature and tight integration with the main document store. Key risks are: (1) FTS5 virtual table synchronization requiring explicit triggers, (2) binary BLOB retrieval needing streaming to avoid loading entire files into memory, and (3) in-browser PDF viewing requiring @react-pdf-viewer or react-pdf (both are PDF.js wrappers). Text/markdown editing is best handled with CodeMirror 6, which is lightweight and embeddable. The Senior Engineer must decide between a monorepo (Vite frontend + Express backend as separate packages) and a Next.js full-stack approach — both are viable; trade-offs are documented below.

## Codebase Findings
The working directory (`/Users/danielpuckett/Documents/Frontend AI Research`) contains:
- `agentic-project-control/` — the agent pipeline system (not relevant to the app)
- `ux-designer/` — a separate UX tooling project (agents, skills, plans — not relevant)
- `docs/` — documentation for the agentic system
- `package.json` — only contains `shadcn` as a devDependency (version ^3.8.5)
- `.mcp.json` — MCP servers: `memory`, `shadcn`, `playwright`, `a11y`

No existing application code, components, API routes, database schema, or test patterns exist. The application must be built entirely from scratch in a new subdirectory.

Relevant observation: The `shadcn` MCP is available at version ^3.8.5 — this is the modern CLI-based shadcn (not the legacy `shadcn-ui` package). The Staff Frontend Engineer must use `npx shadcn@latest` for component installation and the shadcn MCP for component discovery.

## External Research

### SQLite FTS5
- FTS5 (Full Text Search version 5) is included in SQLite 3.9.0+ (2015). Node.js `better-sqlite3` and `@databases/sqlite` ship with FTS5 enabled.
- A FTS5 virtual table is created with: `CREATE VIRTUAL TABLE documents_fts USING fts5(content, title, tags, content='documents', content_rowid='id')`
- The `content=` option creates a "content table" relationship — FTS5 stores only the index, not the actual data. This requires explicit `INSERT`/`UPDATE`/`DELETE` triggers on the source table to keep the index in sync.
- Querying: `SELECT * FROM documents JOIN documents_fts ON documents.id = documents_fts.rowid WHERE documents_fts MATCH 'search term'`
- FTS5 supports phrase queries (`"exact phrase"`), prefix queries (`term*`), boolean operators (`AND`, `OR`, `NOT`), and column filters (`title:word`).
- Snippet function: `snippet(documents_fts, 0, '<b>', '</b>', '...', 10)` returns highlighted excerpt.
- Rebuild after schema changes: `INSERT INTO documents_fts(documents_fts) VALUES('rebuild')`.
- **Trigger pattern for content sync:**
  ```sql
  CREATE TRIGGER docs_fts_insert AFTER INSERT ON documents BEGIN
    INSERT INTO documents_fts(rowid, content, title, tags) VALUES (new.id, new.extracted_text, new.name, new.tag_string);
  END;
  CREATE TRIGGER docs_fts_update AFTER UPDATE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, content, title, tags) VALUES('delete', old.id, old.extracted_text, old.name, old.tag_string);
    INSERT INTO documents_fts(rowid, content, title, tags) VALUES (new.id, new.extracted_text, new.name, new.tag_string);
  END;
  CREATE TRIGGER docs_fts_delete AFTER DELETE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, content, title, tags) VALUES('delete', old.id, old.extracted_text, old.name, old.tag_string);
  END;
  ```

### Binary BLOB Storage in SQLite with better-sqlite3
- `better-sqlite3` is synchronous, which is ideal for a local single-user server — no async complexity.
- BLOBs are stored as `BLOB` columns and retrieved as `Buffer` objects in Node.js.
- For large files, reading the entire blob into memory before streaming to the client is the simplest approach for v1 (acceptable for personal use with typically smaller files).
- For production-scale: `better-sqlite3` does not support streaming blob reads natively — the entire row is read into memory. For files > ~100MB this may be slow. Mitigation: store actual files on disk and only store the path + extracted metadata in the DB. The brief explicitly requires DB storage, so BLOBs are correct; document the memory trade-off.
- Recommended column: `content BLOB NOT NULL` in the documents table. File metadata (size, mime_type) stored separately as integers/text.

### React In-Browser Document Viewers
**PDF viewing:**
- `react-pdf` (npm: `react-pdf`, uses PDF.js under the hood) — component-based, well-maintained, 12k+ GitHub stars. Renders PDF pages as Canvas or SVG. Requires `pdf.worker.js` copy to public dir or CDN config.
- `@react-pdf-viewer/core` — more feature-rich viewer with toolbar, zoom, page navigation. Heavier bundle.
- **Recommendation:** `react-pdf` for simplicity in a personal app.

**Image viewing:**
- Native `<img>` tag with `src` pointing to a blob URL (`URL.createObjectURL(blob)`) or a data URL from the API response. No library needed.

**Text / Markdown editing:**
- `CodeMirror 6` (`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-markdown`) — highly configurable, accessible, 26k+ stars, actively maintained. Renders markdown with syntax highlighting.
- `Monaco Editor` (VS Code's editor, `@monaco-editor/react`) — much heavier (~4MB), better suited to code editing than document management.
- `TipTap` (rich text WYSIWYG with markdown support) — heavier but better end-user UX for markdown documents.
- **Recommendation:** CodeMirror 6 for text/markdown content editing (lightweight, keyboard-accessible). TipTap is a viable alternative if WYSIWYG is preferred.

### File Upload — Node.js/Express
- `multer` — the standard Express middleware for multipart/form-data file uploads. Stores files in memory (`memoryStorage`) or disk. For SQLite BLOB storage, use `memoryStorage()` to get a `Buffer` directly.
- `busboy` — lower-level streaming parser, better for very large files. More complex API.
- **Recommendation:** `multer` with `memoryStorage()`. Configuring `limits.fileSize` to `Infinity` (or removing the limit) satisfies the "no size restriction" requirement. Note: very large files will consume significant RAM; document this trade-off.

### Text Extraction for FTS
- **Plaintext (.txt, .md, .csv):** Read buffer as UTF-8 string directly — trivial.
- **PDF text extraction:** `pdf-parse` (npm) extracts text from PDF buffers synchronously. ~2MB dependency, well-maintained. Returns `{ text, numpages, info }`.
- **Office documents (.docx):** `mammoth` extracts text from DOCX. No `.doc` (binary) support.
- **Other binary types (images, zip, executables):** No text extraction possible — store empty string in FTS.
- **Recommendation for v1:** Extract text from .txt, .md, .csv, .pdf (via pdf-parse), .docx (via mammoth). All other types get an empty `extracted_text` field — they are searchable by metadata (name, tags, description) but not content.

## MCP Tools Used
- `shadcn` MCP: available in `.mcp.json`. The Staff Frontend Engineer should use `search_items_in_registries` and `view_items_in_registries` for component discovery.
- `playwright` MCP: available — useful for QA/E2E testing in Phase 3.
- `a11y` MCP: available — useful for accessibility validation in Phase 3.
- No `laravel-boost` or `context7` detected.

## Competing Approaches

### Approach 1: Vite (React) + Express (separate processes) — RECOMMENDED
- **Frontend:** Vite dev server on port 3000 with HMR
- **Backend:** Express on port 3001, `better-sqlite3` for DB
- **Pros:** Clear separation, mature tooling, easy to debug each layer independently, no framework lock-in
- **Cons:** Two processes to start (`npm run dev` can use `concurrently`), requires CORS or a Vite proxy config
- **Dev UX:** `package.json` at root with `concurrently` running both; or a monorepo with workspace packages

### Approach 2: Next.js Full-Stack (App Router)
- **Frontend + Backend:** Single Next.js app with API routes (Route Handlers in App Router)
- **Database:** `better-sqlite3` in API route handlers (works only in Node.js runtime, not Edge)
- **Pros:** Single process, no CORS, Next.js handles routing
- **Cons:** Next.js App Router adds complexity (server components, client components, streaming) that is unnecessary for a personal local tool; SQLite with server components has subtle gotchas (singleton DB connection management across hot reloads)
- **Verdict:** Overkill for a local personal tool

### Approach 3: Electron App
- **Pros:** Native app experience, file system access, no browser security restrictions
- **Cons:** Much larger bundle, more complex setup, out of scope per brief ("started via npm run dev")
- **Verdict:** Out of scope

## Known Pitfalls

1. **FTS5 content table triggers:** If triggers are missing or malformed, the FTS index will silently fall out of sync with the documents table. The Database Manager must define all three triggers (INSERT, UPDATE, DELETE) precisely. The Staff Backend Engineer must run the trigger SQL at DB init time.

2. **multer memoryStorage + large files:** `memoryStorage()` loads the entire file into RAM. A 2GB video file will crash the Node process. For v1 (personal use), this is acceptable but should be documented. Consider adding a soft warning in the UI for files over a configurable threshold.

3. **better-sqlite3 singleton:** In development with hot module reload (e.g. Next.js — reason to avoid it), the DB connection can be opened multiple times, causing "database is locked" errors. With Vite+Express, the Express server doesn't hot-reload by default (`nodemon` does restart the process cleanly), so this is not an issue.

4. **react-pdf worker:** `react-pdf` requires copying `pdf.worker.min.js` to the public directory or configuring a Vite plugin to serve it. Forgetting this results in a silent failure where PDFs don't render.

5. **BLOB retrieval Content-Type headers:** When serving file blobs from the API, the correct `Content-Type` header must be set from the stored `mime_type` column. Without it, browsers may refuse to render PDFs or display images inline.

6. **SQLite WAL mode:** For a single-user local app, WAL (Write-Ahead Logging) mode improves write concurrency and reduces lock contention: `PRAGMA journal_mode=WAL`. Should be set at DB initialization.

7. **FTS5 and Unicode:** FTS5's default tokenizer handles ASCII well but may miss matches in documents with accented characters or non-Latin scripts. The `unicode61` tokenizer handles this: `USING fts5(content, tokenize='unicode61')`.

8. **Tag storage:** Tags as a comma-separated string in the documents table for FTS indexing, but normalized in a separate `tags` / `document_tags` junction table for structured filtering. Both are needed.

## Open Questions
None. All resolved.

## Assumptions
- Node.js 20+ is available on the local machine (required for `better-sqlite3` prebuilt binaries).
- The app directory will be at `/Users/danielpuckett/Documents/Frontend AI Research/apps/document-management/` or similar — Senior Engineer to decide the exact location.
- `concurrently` will be used to start both Vite and Express with a single `npm run dev` command.
- Text extraction for FTS is limited to .txt, .md, .csv, .pdf, .docx in v1.
- No file size restriction is enforced on the server (as per brief), but the memory constraint with multer/memoryStorage is documented.
