---
agent: code-review-expert
project: document-management-ui-2026-02-23
date: 2026-02-23
status: complete
---

# Code Review Report: Document Management UI

## Result: PASS

## Issues
None blocking.

## Architecture Compliance

All files match `03-architecture.md` specifications:

- **Backend:** `server/src/index.ts` correctly mounts all three routers at `/api/documents`, `/api/folders`, `/api/tags`. Error handler middleware dispatches `ValidationError` → 400, `NotFoundError` → 404, unexpected → 500 with no stack trace leak. `runMigrations()` called before `app.listen()`.
- **Database:** `schema.sql` exactly matches `04-database-schema.md`: 4 base tables, FTS5 virtual table with `tokenize='unicode61'`, 5 indexes, 5 triggers (3 FTS sync + 2 tag_string denormalization). `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON` set at init.
- **Services:** All functions (`documentService`, `folderService`, `tagService`, `textExtractor`) match the interfaces defined in the architecture doc. Parameterized queries used throughout — no string interpolation of user input into SQL.
- **Frontend:** All 12 components implemented as specified. TanStack Query keys match the pattern `['documents', opts]`, `['folders']`, `['tags']`. Zustand store matches the `UIState` interface from the spec. shadcn components used throughout (Button, Input, Sheet, Dialog, Badge, Card, etc.).
- **FTS search:** `snippet(documents_fts, 2, '<mark>', '</mark>', '...', 10)` correctly indexes column 2 (`extracted_text`). Search parameter escaped with `replace(/"/g, '""')` before FTS phrase query to prevent query injection.

## Security Review

**SQL injection:** All database queries use `better-sqlite3` prepared statements with `?` parameterization. No user input is interpolated into SQL strings. The FTS MATCH query wraps user input in a phrase query with escaped double-quotes — correct mitigation for FTS injection.

**XSS — dangerouslySetInnerHTML (non-blocking):**
- File: `client/src/components/documents/DocumentList.tsx:63`
- The `snippet` field from the server contains `<mark>` tags injected by SQLite's `snippet()` function around document content. This is rendered via `dangerouslySetInnerHTML`.
- **Assessment:** For a single-user local application where the user uploads their own documents, this is acceptable. An attacker would need to craft a document containing `</p><script>` content, upload it, and then search for it — and they are the only user. Not a real attack surface in this deployment model. Non-blocking.

**No secrets exposed:** No API keys, credentials, or sensitive config in any committed file.

**CORS:** Restricted to `http://localhost:3000` — correct for local use.

**No eval, no prototype pollution, no dangerous deserialization.**

## Error Handling Verification

- All route handlers use `try/catch` and pass errors to `next(err)` — verified in `routes/documents.ts`, `routes/folders.ts`, `routes/tags.ts`.
- `textExtractor.ts`: both `pdf-parse` and `mammoth` calls are wrapped in individual `try/catch` blocks that return `null` on failure — this is correct, extraction failures should not block uploads.
- `connection.ts`: DB init is not wrapped in try/catch — this is acceptable; a DB initialization failure at startup is fatal and should crash the process.
- Frontend: TanStack Query error states are displayed inline via `<Alert variant="destructive">` in `DocumentList` and `DocumentViewer`. Upload errors shown per-file in `DocumentUploadZone`. This matches the architecture spec.

## Spec Deviations — None Blocking

1. **`codemirror` package installed alongside `@codemirror/*` packages** — The implementation imports `EditorView` and `basicSetup` from `codemirror` (the meta-package) rather than individual `@codemirror/view` packages. This is valid — `codemirror` re-exports all sub-packages and is the recommended import path.

2. **`multer` upgraded to v2** — Architecture spec referenced `multer@^1.4.5-lts.1` but implementation uses v2 (which resolves a known vulnerability in multer 1.x). This is an acceptable upgrade that improves security.

3. **`@types/pdf-parse` added as a devDependency** — Not in the architecture spec's package.json but required for TypeScript compilation. Correct addition.

4. **`parseInt(req.params.id)` without NaN guard** — Route handler IDs parsed with `parseInt` without a `isNaN()` check. With `better-sqlite3`, passing `NaN` to a `?` binding results in SQLite treating it as 0 (no row found → 404). Not exploitable, but slightly imprecise. Non-blocking for a personal local tool.

## Non-blocking Notes
- The `act()` React testing warnings in the frontend test suite are cosmetic — they indicate async state updates that Testing Library should wrap, but do not cause test failures. All 11 frontend tests pass.
- `pdf.worker.min.js` copied from `pdfjs-dist` to `client/public/` — correct setup for `react-pdf` v7.
- TypeScript strict mode enabled on both client and server; `tsc --noEmit` passes clean on both.
- No animation classes used anywhere in the frontend — compliant with the design spec rule prohibiting animations unless explicitly requested.
- Accessibility: all form inputs have `<Label>` associations, all icon-only buttons have `aria-label`, focus management implemented for Sheet and Dialog.
