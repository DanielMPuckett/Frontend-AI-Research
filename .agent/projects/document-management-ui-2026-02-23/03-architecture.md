---
agent: senior-engineer
project: document-management-ui-2026-02-23
date: 2026-02-23
status: draft
---

# Architecture: Document Management UI

## Summary
The application is a monorepo with two packages: a Vite + React frontend (`client/`) and a Node.js + Express backend (`server/`). Both are started with a single `npm run dev` command at the root using `concurrently`. The backend uses `better-sqlite3` with the FTS5-enabled SQLite bundled by that package, serving a REST API on port 3001. The frontend runs on Vite's dev server at port 3000 with a proxy rule forwarding `/api/*` to port 3001, eliminating CORS. All document content is stored as BLOB in SQLite. The UI is built with React + shadcn/ui + Tailwind CSS v4.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (localhost:3000)                 │
│                                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Sidebar  │  │ Document List│  │     Document Viewer/      │  │
│  │(Folders/ │  │ /Grid View   │  │     Editor Panel          │  │
│  │ Tags)    │  │              │  │  (PDF / Image / Text)     │  │
│  └──────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              React State (TanStack Query + Zustand)        │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │ fetch /api/* (Vite proxy)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Express Server (localhost:3001)                 │
│                                                                   │
│  POST   /api/documents/upload        (multer memoryStorage)      │
│  GET    /api/documents               (list, filter, search)      │
│  GET    /api/documents/:id           (metadata only)             │
│  GET    /api/documents/:id/content   (binary stream)             │
│  PUT    /api/documents/:id           (update metadata)           │
│  PUT    /api/documents/:id/content   (update text content)       │
│  DELETE /api/documents/:id                                        │
│                                                                   │
│  GET    /api/folders                 (full tree)                 │
│  POST   /api/folders                 (create)                    │
│  PUT    /api/folders/:id             (rename)                    │
│  DELETE /api/folders/:id                                          │
│                                                                   │
│  GET    /api/tags                    (all tags + counts)         │
│  POST   /api/documents/:id/tags      (add tag)                   │
│  DELETE /api/documents/:id/tags/:tag (remove tag)                │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              better-sqlite3 (SQLite + FTS5)              │   │
│  │  documents | folders | tags | document_tags | docs_fts   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Project Directory Structure

```
/Users/danielpuckett/Documents/Frontend AI Research/apps/document-management/
├── package.json                  # root — scripts: dev, build
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── tailwind.config.ts        # (or postcss if using Tailwind v4 inline)
│   ├── components.json           # shadcn config
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ui/               # shadcn components (auto-generated)
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   ├── documents/
│   │   │   │   ├── DocumentList.tsx
│   │   │   │   ├── DocumentCard.tsx
│   │   │   │   ├── DocumentUploadZone.tsx
│   │   │   │   ├── DocumentViewer.tsx
│   │   │   │   ├── DocumentMetadataEditor.tsx
│   │   │   │   └── TagManager.tsx
│   │   │   ├── search/
│   │   │   │   └── SearchBar.tsx
│   │   │   └── folders/
│   │   │       ├── FolderTree.tsx
│   │   │       └── FolderCreateDialog.tsx
│   │   ├── hooks/
│   │   │   ├── useDocuments.ts
│   │   │   ├── useFolders.ts
│   │   │   ├── useTags.ts
│   │   │   └── useSearch.ts
│   │   ├── lib/
│   │   │   ├── api.ts            # typed fetch wrappers
│   │   │   └── utils.ts          # cn(), formatBytes(), etc.
│   │   ├── store/
│   │   │   └── uiStore.ts        # Zustand: selected folder, selected doc, view mode
│   │   └── types/
│   │       └── index.ts          # shared TypeScript types
│   └── public/
│       └── pdf.worker.min.js     # copied from pdfjs-dist
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts              # Express app entry point
    │   ├── db/
    │   │   ├── connection.ts     # singleton better-sqlite3 instance
    │   │   ├── schema.sql        # initialization SQL (all tables, triggers)
    │   │   └── migrate.ts        # reads schema.sql and runs it at startup
    │   ├── routes/
    │   │   ├── documents.ts      # /api/documents routes
    │   │   ├── folders.ts        # /api/folders routes
    │   │   └── tags.ts           # /api/tags routes
    │   ├── services/
    │   │   ├── documentService.ts
    │   │   ├── folderService.ts
    │   │   ├── tagService.ts
    │   │   └── textExtractor.ts  # pdf-parse + mammoth + plaintext
    │   ├── middleware/
    │   │   └── upload.ts         # multer configuration
    │   └── types/
    │       └── index.ts
    └── tests/
        ├── documents.test.ts
        ├── folders.test.ts
        ├── search.test.ts
        └── textExtractor.test.ts
```

## Phase 2 Agent Assignments

---

### Staff Backend Engineer

#### Files to Create

**`apps/document-management/package.json`** — Root package.json
```json
{
  "name": "document-management",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "build": "npm run build --prefix client && npm run build --prefix server"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

**`apps/document-management/server/package.json`**
```json
{
  "name": "document-management-server",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "better-sqlite3": "^9.0.0",
    "busboy": "^1.6.0",
    "cors": "^2.8.5",
    "express": "^4.18.0",
    "mammoth": "^1.6.0",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/express": "^4.17.0",
    "@types/multer": "^1.4.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**`apps/document-management/server/src/index.ts`** — Express entry point
- Imports: express, cors, routes, db/migrate
- Calls `runMigrations()` before app.listen
- Mounts routes: `/api/documents`, `/api/folders`, `/api/tags`
- JSON body parser: `express.json({ limit: '10mb' })` for metadata updates
- Listens on port 3001
- Error handler middleware: catches errors, returns `{ error: message }` with appropriate status

**`apps/document-management/server/src/db/connection.ts`** — DB singleton
```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'documents.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
```

**`apps/document-management/server/src/db/schema.sql`** — Full initialization SQL
- Content: exactly the SQL from `04-database-schema.md` initialization script
- All `CREATE TABLE IF NOT EXISTS`, indexes, FTS virtual table, all 5 triggers

**`apps/document-management/server/src/db/migrate.ts`**
```typescript
import { getDb } from './connection';
import fs from 'fs';
import path from 'path';

export function runMigrations(): void {
  const db = getDb();
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(sql);
}
```
Also creates `data/` directory if it doesn't exist before opening the DB.

**`apps/document-management/server/src/middleware/upload.ts`**
```typescript
import multer from 'multer';
export const upload = multer({ storage: multer.memoryStorage() });
// No file size limit — per brief requirement
```

**`apps/document-management/server/src/services/textExtractor.ts`**

Function signature:
```typescript
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string | null>
```

Extraction logic:
- `text/plain`, `text/markdown`, `text/csv`, `text/html`: `buffer.toString('utf8')`
- `application/pdf`: `(await pdfParse(buffer)).text`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx): `(await mammoth.extractRawText({ buffer })).value`
- All other MIME types: return `null`

**`apps/document-management/server/src/services/documentService.ts`**

Exported functions:
```typescript
// List documents — optionally filter by folder, tag, or search query
export function listDocuments(opts: {
  folderId?: number | null;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): DocumentListItem[]

// Get document metadata (no content blob)
export function getDocument(id: number): DocumentDetail | null

// Get document binary content
export function getDocumentContent(id: number): { content: Buffer; mimeType: string } | null

// Create document (upload)
export function createDocument(input: {
  name: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  content: Buffer;
  extractedText: string | null;
  folderId?: number | null;
  description?: string;
}): DocumentDetail

// Update document metadata
export function updateDocument(id: number, updates: {
  name?: string;
  description?: string;
  folderId?: number | null;
}): DocumentDetail | null

// Update document text content (for editable file types)
export function updateDocumentContent(id: number, input: {
  content: Buffer;
  extractedText: string | null;
  fileSize: number;
}): DocumentDetail | null

// Delete document
export function deleteDocument(id: number): boolean
```

**`apps/document-management/server/src/services/folderService.ts`**

```typescript
export function listFolders(): FolderNode[]   // returns flat list ordered for tree building
export function createFolder(name: string, parentId?: number | null): Folder
export function renameFolder(id: number, name: string): Folder | null
export function deleteFolder(id: number): boolean  // children's parent_id set to NULL by DB trigger
```

**`apps/document-management/server/src/services/tagService.ts`**

```typescript
export function listTags(): TagWithCount[]   // { id, name, count }
export function addTagToDocument(documentId: number, tagName: string): void
  // upsert tag (INSERT OR IGNORE INTO tags), then INSERT OR IGNORE INTO document_tags
export function removeTagFromDocument(documentId: number, tagName: string): void
```

**`apps/document-management/server/src/routes/documents.ts`**

Routes implemented (using Express Router):
```
POST   /                   — upload (multer middleware, call textExtractor, call createDocument)
GET    /                   — list (query params: folderId, tag, search, limit, offset)
GET    /:id                — metadata (no content blob)
GET    /:id/content        — stream binary: set Content-Type from mime_type, pipe buffer
PUT    /:id                — update metadata (name, description, folderId)
PUT    /:id/content        — update text content (body: { text: string })
DELETE /:id                — delete
POST   /:id/tags           — add tag (body: { tag: string })
DELETE /:id/tags/:tag      — remove tag
```

**`apps/document-management/server/src/routes/folders.ts`**
```
GET    /         — list all folders
POST   /         — create folder (body: { name, parentId? })
PUT    /:id      — rename folder (body: { name })
DELETE /:id      — delete folder
```

**`apps/document-management/server/src/routes/tags.ts`**
```
GET    /         — list all tags with document counts
```

**`apps/document-management/server/src/types/index.ts`**

TypeScript interfaces:
```typescript
interface DocumentListItem {
  id: number;
  name: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  folderId: number | null;
  description: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  snippet?: string; // only present in search results
}

interface DocumentDetail extends DocumentListItem {
  // same as DocumentListItem — content blob is never included in metadata responses
}

interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: number;
  updatedAt: number;
}

interface FolderNode extends Folder {
  children: FolderNode[];
}

interface TagWithCount {
  id: number;
  name: string;
  count: number;
}
```

**Test files:**

`apps/document-management/server/tests/documents.test.ts`
- Uses Vitest + an in-memory SQLite database (pass `:memory:` to `better-sqlite3` in test setup)
- Tests: upload creates document, list returns documents, list with folderId filter, search returns matching documents, delete removes document

`apps/document-management/server/tests/search.test.ts`
- Tests: FTS match on document name, FTS match on extracted_text, FTS match on tag_string, search with no results returns empty array, snippet is included in search results

`apps/document-management/server/tests/textExtractor.test.ts`
- Tests: plaintext extraction, markdown extraction, null for image/binary types

---

### Staff Frontend Engineer

#### Files to Create

**`apps/document-management/client/package.json`**
```json
{
  "name": "document-management-client",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "@codemirror/lang-markdown": "^6.0.0",
    "@codemirror/state": "^6.0.0",
    "@codemirror/view": "^6.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-pdf": "^7.0.0",
    "zustand": "^4.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**`apps/document-management/client/vite.config.ts`**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true }
    }
  }
});
```

**`apps/document-management/client/src/types/index.ts`**
Mirrors server types (copy the DocumentListItem, Folder, FolderNode, TagWithCount interfaces).

**`apps/document-management/client/src/lib/api.ts`** — API client

Functions (all return typed Promise):
```typescript
// Documents
export async function uploadDocument(formData: FormData): Promise<DocumentListItem>
export async function listDocuments(opts?: {
  folderId?: number | null; tag?: string; search?: string;
}): Promise<DocumentListItem[]>
export async function getDocument(id: number): Promise<DocumentListItem>
export async function getDocumentContentUrl(id: number): string  // returns /api/documents/:id/content
export async function updateDocument(id: number, updates: Partial<DocumentListItem>): Promise<DocumentListItem>
export async function updateDocumentTextContent(id: number, text: string): Promise<DocumentListItem>
export async function deleteDocument(id: number): Promise<void>
export async function addTag(documentId: number, tag: string): Promise<void>
export async function removeTag(documentId: number, tag: string): Promise<void>

// Folders
export async function listFolders(): Promise<FolderNode[]>
export async function createFolder(name: string, parentId?: number | null): Promise<Folder>
export async function renameFolder(id: number, name: string): Promise<Folder>
export async function deleteFolder(id: number): Promise<void>

// Tags
export async function listTags(): Promise<TagWithCount[]>
```

**`apps/document-management/client/src/lib/utils.ts`**
```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatBytes(bytes: number): string // e.g. "2.3 MB"
export function getMimeIcon(mimeType: string): string // returns icon name for file type
export function isEditableMimeType(mimeType: string): boolean
  // returns true for: text/plain, text/markdown, text/csv, text/html
export function isViewableMimeType(mimeType: string): boolean
  // returns true for: application/pdf, image/*, text types
```

**`apps/document-management/client/src/store/uiStore.ts`** — Zustand store
```typescript
interface UIState {
  selectedFolderId: number | null;  // null = "All Documents"
  selectedDocumentId: number | null;
  viewMode: 'list' | 'grid';
  searchQuery: string;
  selectedTag: string | null;
  isPanelOpen: boolean;   // document detail panel
  setSelectedFolder: (id: number | null) => void;
  setSelectedDocument: (id: number | null) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  setSearchQuery: (q: string) => void;
  setSelectedTag: (tag: string | null) => void;
  openPanel: (documentId: number) => void;
  closePanel: () => void;
}
```

**`apps/document-management/client/src/hooks/useDocuments.ts`**
- Uses `@tanstack/react-query` `useQuery` with key `['documents', { folderId, tag, search }]`
- Calls `listDocuments()` from api.ts
- Also exports `useUploadDocument` (useMutation), `useUpdateDocument` (useMutation), `useDeleteDocument` (useMutation), `useDocumentContent` (returns content URL string)

**`apps/document-management/client/src/hooks/useFolders.ts`**
- `useQuery(['folders'])` calling `listFolders()`
- Exports `useCreateFolder`, `useRenameFolder`, `useDeleteFolder` mutations

**`apps/document-management/client/src/hooks/useTags.ts`**
- `useQuery(['tags'])` calling `listTags()`
- Exports `useAddTag`, `useRemoveTag` mutations

**`apps/document-management/client/src/App.tsx`**
```typescript
// Wraps everything in QueryClientProvider and renders <AppShell />
```

**`apps/document-management/client/src/components/layout/AppShell.tsx`**
Layout: two-column CSS Grid — `Sidebar` (fixed left, ~240px wide) + main content area.
Main area: `TopBar` above, then either `DocumentList` or document viewer depending on state.

**`apps/document-management/client/src/components/layout/Sidebar.tsx`**
Contains:
- App title ("Documents")
- "All Documents" link (selects `folderId: null`)
- `FolderTree` component
- Separator
- Tags list (`TagManager` in sidebar mode — clickable tag chips with counts)
- "New Folder" button at bottom

**`apps/document-management/client/src/components/layout/TopBar.tsx`**
Contains:
- `SearchBar` component (left)
- View mode toggle (List / Grid) using shadcn `ToggleGroup`
- Upload button (opens `DocumentUploadZone` dialog)

**`apps/document-management/client/src/components/documents/DocumentList.tsx`**
- Renders documents from `useDocuments` hook
- Switches between list view (table-like rows) and grid view (cards) based on `viewMode` from store
- Empty state when no documents
- Loading skeleton while fetching
- Each item is clickable — clicking opens the document detail panel (`openPanel(id)`)

**`apps/document-management/client/src/components/documents/DocumentCard.tsx`**
- Used in grid view mode
- Shows: file type icon, document name, tags, date, file size
- Uses shadcn `Card` component

**`apps/document-management/client/src/components/documents/DocumentUploadZone.tsx`**
- Drag-and-drop file upload area using HTML5 drag events (no library needed for basic DnD)
- Also has a "Browse Files" button (`<input type="file" multiple>`)
- On drop/select: calls `useUploadDocument` mutation for each file
- Shows per-file upload progress (optimistic update: file appears in list immediately with "uploading" state)
- Displayed inside a shadcn `Dialog` triggered from TopBar

**`apps/document-management/client/src/components/documents/DocumentViewer.tsx`**
- Shown in the right panel when a document is selected
- Reads selected document from store, calls `useDocumentContent`
- Renders based on `mimeType`:
  - `application/pdf`: `<Document>` from `react-pdf` with page navigation
  - `image/*`: `<img>` with `src` pointing to `/api/documents/:id/content`
  - `text/plain`, `text/markdown`, `text/csv`: If `isEditableMimeType()`, show `<CodeMirrorEditor>` in edit mode; otherwise show in read-only mode
  - All other types: "This file type cannot be previewed. Download to view." with a download link
- Header shows document name + Edit Metadata button

**`apps/document-management/client/src/components/documents/DocumentMetadataEditor.tsx`**
- Shown in a shadcn `Sheet` (side panel) when "Edit Metadata" is clicked
- Fields: Name (Input), Description (Textarea), Folder (Select), Tags (TagManager in edit mode)
- On save: calls `useUpdateDocument` mutation
- Close button and keyboard Escape close the Sheet; focus returns to trigger button

**`apps/document-management/client/src/components/documents/TagManager.tsx`**
Props: `{ documentId: number; tags: string[]; mode: 'edit' | 'display' }`
- In `display` mode: renders tag chips (shadcn `Badge`) — used in sidebar and document list
- In `edit` mode (inside MetadataEditor): renders tag chips with remove (×) buttons + an input to add new tags
  - On Enter or comma: calls `useAddTag` mutation
  - × on tag: calls `useRemoveTag` mutation

**`apps/document-management/client/src/components/search/SearchBar.tsx`**
- shadcn `Input` with search icon
- Debounced (300ms) — sets `searchQuery` in Zustand store on change
- When query is non-empty, `DocumentList` switches to search mode (FTS results with snippets)
- Clears search on Escape key

**`apps/document-management/client/src/components/folders/FolderTree.tsx`**
- Renders folder hierarchy from `useFolders` hook
- Each folder item: clickable to set `selectedFolderId` in store
- Active folder is visually highlighted
- Right-click or hover context menu: Rename, Delete (shadcn `DropdownMenu`)

**`apps/document-management/client/src/components/folders/FolderCreateDialog.tsx`**
- shadcn `Dialog` with a form: Name input + optional parent folder selector
- Called from the "New Folder" button in Sidebar

**Test files:**

`apps/document-management/client/src/components/documents/DocumentList.test.tsx`
- Renders list with mock documents, verifies document names appear
- Verifies empty state renders when no documents

`apps/document-management/client/src/components/search/SearchBar.test.tsx`
- Typing in the search bar updates store searchQuery (debounced)
- Pressing Escape clears the search query

`apps/document-management/client/src/components/documents/TagManager.test.tsx`
- In edit mode: renders existing tags, allows adding new tag, allows removing tag

---

### Senior Designer
The Senior Designer must produce `design-spec.md` covering:
1. Color scheme and Tailwind tokens (use `neutral` scale for backgrounds, `zinc` for sidebar, accent color for interactive elements)
2. Layout wireframes for: AppShell, Sidebar, DocumentList (list + grid modes), DocumentViewer panel, MetadataEditor Sheet, UploadZone dialog, SearchBar
3. shadcn component selection for each UI surface (confirm via shadcn MCP before specifying)
4. Typography: heading sizes, body text, metadata labels
5. Density: comfortable padding for a document management tool (not too tight, not too spacious)
6. File type icon strategy (use shadcn/lucide icons mapped to MIME types)
7. Tag chip visual style (shadcn `Badge` variant)
8. Focus management spec for: Document detail panel open, MetadataEditor Sheet open/close, UploadZone dialog open/close

## Data Flow

**Upload flow:**
1. User drops file(s) onto `DocumentUploadZone`
2. Frontend sends `POST /api/documents/upload` with `multipart/form-data` (file + optional name, folderId)
3. `multer` middleware puts `Buffer` in `req.file.buffer`
4. `textExtractor.extractText(buffer, mimeType)` extracts text if possible
5. `documentService.createDocument(...)` writes to SQLite — triggers insert FTS entry
6. Response: `DocumentListItem` (no content blob)
7. TanStack Query invalidates `['documents']` key — list re-fetches

**View/Download flow:**
1. User clicks document in `DocumentList`
2. `uiStore.openPanel(id)` sets `selectedDocumentId`
3. `DocumentViewer` renders — for binary content, `<img src>` or `react-pdf Document` points to `/api/documents/:id/content`
4. `/api/documents/:id/content` returns the raw BLOB with correct `Content-Type` header

**Search flow:**
1. User types in `SearchBar`
2. After 300ms debounce, `searchQuery` is set in Zustand store
3. `useDocuments` hook's query key changes to `['documents', { search: query }]`
4. TanStack Query calls `GET /api/documents?search=query`
5. Server runs FTS5 MATCH query, returns results with `snippet` field
6. `DocumentList` renders results; snippets shown below document names

**Metadata edit flow:**
1. User clicks "Edit Metadata" in `DocumentViewer`
2. `DocumentMetadataEditor` Sheet opens; focus moves to first input
3. User edits fields, clicks Save
4. `PUT /api/documents/:id` called with updated fields
5. TanStack Query invalidates `['documents']` and `['document', id]` — list + viewer update
6. Sheet closes; focus returns to "Edit Metadata" button

## Error Handling Approach

**Backend:**
- All route handlers wrapped in `try/catch`
- Service functions throw typed errors (e.g., `NotFoundError`, `ValidationError`)
- Express error handler middleware converts to JSON responses:
  - 400 for validation errors
  - 404 for not found
  - 500 for unexpected errors (with generic message in response, full error in console)
- Never expose stack traces to the client

**Frontend:**
- TanStack Query error states displayed inline (not toast) — error message shown in the component that failed
- Upload errors shown per-file in the UploadZone
- Form validation errors shown below fields with `aria-describedby` association
- Network errors: display "Failed to load — click to retry" with a retry button

## Testing Requirements

**Backend (Vitest):**
- All service functions tested with an in-memory SQLite database (`:memory:` path)
- Test setup: run `runMigrations()` on the in-memory DB before each test suite
- Test teardown: close the DB connection after each suite
- Test file locations: `server/tests/*.test.ts`
- No HTTP layer testing in service tests — services are called directly
- Route-level tests using `supertest` for the upload and search endpoints

**Frontend (Vitest + Testing Library):**
- Component tests use `@testing-library/react` + jsdom
- Tests mock API calls (mock `src/lib/api.ts` module with `vi.mock`)
- TanStack Query wrapped in test providers with `new QueryClient({ defaultOptions: { queries: { retry: false } } })`
- Test file locations: co-located with components (`*.test.tsx`)
- Do not test implementation details — test what the user sees and does

## Open Questions
None.

## Assumptions
- App lives at: `apps/document-management/` relative to the project root (`/Users/danielpuckett/Documents/Frontend AI Research/`)
- Node.js 20+ available on the machine
- `better-sqlite3` will be installed fresh — no existing SQLite database exists
- The `data/` directory (containing `documents.db`) will be created by the server on first run
- shadcn/ui will be initialized fresh in the `client/` directory; `components.json` will be generated by `npx shadcn@latest init`
- Tailwind CSS v4 is used (inline `@import "tailwindcss"` approach, no `tailwind.config.ts` needed unless custom tokens are required)
- `react-pdf` v7 requires `pdfjs-dist` peer dependency; `pdf.worker.min.js` must be copied to `client/public/`
- All timestamps stored as Unix epoch integers (seconds) — frontend formats them with `Intl.DateTimeFormat`
