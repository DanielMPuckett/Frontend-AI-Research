---
agent: project-manager
project: document-management-ui-2026-02-23
request-type: feature
date: 2026-02-23
status: draft
---

# Project Plan: Document Management UI

## Summary
This project builds a fully working, locally hosted personal document management web application from scratch. The app will be a React + Node.js/Express full-stack application backed by a single SQLite database with the FTS5 extension for full-text search. Users will be able to upload any file type (content stored as blobs in the database), organize documents into folders, tag them, search by metadata and full text, and view or edit supported document types directly in the browser. The result should be polished enough for comfortable daily use as a personal productivity tool.

## Phase 1 Agents

| Agent | Required | Reason |
|---|---|---|
| Research Liaison | Yes | Always runs — must research SQLite FTS5, file storage patterns, React document viewers, and full-text search strategies |
| Database Manager | Yes | New project requires a complete SQLite schema design: documents table, folders, tags, FTS5 virtual table, and all indexes |
| Senior Engineer | Yes | Always runs — must define the full architecture for both backend and frontend agents |

## Phase 2 Agents

| Agent | Required | What They Will Build |
|---|---|---|
| Staff Backend Engineer | Yes | Express/Node.js API server: file upload endpoint, CRUD for documents/folders/tags, full-text search endpoint, binary blob storage/retrieval, SQLite migrations via better-sqlite3 |
| Staff Frontend Engineer | Yes | React UI: document list/grid view, folder sidebar, upload interface, tag management, metadata editor, in-browser PDF/image/text viewer, markdown editor, search bar with live results |
| Staff AI Development Engineer | No | No AI/ML features in scope |
| Staff MCP Engineer | No | No MCP tools in scope |
| Staff Model Engineer | No | No model engineering in scope |
| Senior Designer | Yes | New application with no existing design system — must produce layout specs, component selection, visual hierarchy, and accessibility patterns before frontend implementation begins |

## Milestones
1. Phase 1 complete + user approval
2. Phase 2 implementation complete (Senior Designer first, then Backend + Frontend in parallel)
3. Phase 3 verification passed

## Risks
- **SQLite blob storage for large files:** Storing large binary files as BLOBs in SQLite can degrade performance and database size. Mitigation: architect a streaming retrieval endpoint; consider chunked reads for large files. Document the trade-off clearly in architecture.
- **FTS5 content sync:** FTS5 virtual tables require triggers or explicit insert/update/delete hooks to stay in sync with the main documents table. Mitigation: Database Manager must define triggers; Backend Engineer must implement them exactly as specified.
- **In-browser file viewing:** PDF.js, image rendering, and text editing each require different viewer components. Mitigation: Research Liaison must surface the best libraries; Senior Engineer must assign each file-type viewer to a specific component.
- **Extracting text for FTS from binary files:** PDFs and Office documents require text extraction before indexing. Mitigation: scope text extraction to plaintext and markdown only for v1; surface PDF text extraction as a stretch goal.

## Open Questions
None. All questions resolved in the brief.

## Assumptions
- The app will be started via `npm run dev` (or equivalent) and served on localhost — no packaging required.
- File content is stored as binary blobs in SQLite; the database file lives in the project directory.
- "Editing" for non-text files means editing metadata only; content editing is limited to text and markdown files.
- No authentication or session management is needed.
- The design system will be built fresh using shadcn/ui with Tailwind CSS — no existing components to extend.
- Text extraction for FTS is scoped to plaintext/markdown in v1; PDF text extraction is a stretch goal.
- Node.js with better-sqlite3 (synchronous SQLite bindings) is preferred over async drivers for simplicity in a local single-user context.
