---
agent: senior-designer
project: document-management-ui-2026-02-23
date: 2026-02-23
status: draft
---

# Design Spec: Document Management UI

## Design System Baseline

This is a brand new application with no existing components to match. The design uses:
- **shadcn/ui** components (latest registry)
- **Tailwind CSS v4** (via `@import "tailwindcss"`)
- **Lucide React** icons (bundled with shadcn)

### shadcn Components Required
The following components must be installed via `npx shadcn@latest add <name>`:

| Component | Usage |
|---|---|
| `button` | All action buttons throughout the app |
| `input` | SearchBar, folder name input, tag input, metadata name field |
| `textarea` | Document description field in MetadataEditor |
| `dialog` | UploadZone dialog, FolderCreateDialog |
| `sheet` | DocumentMetadataEditor side panel |
| `badge` | Tag chips (display and edit mode) |
| `card` | DocumentCard (grid view) |
| `separator` | Sidebar sections divider |
| `dropdown-menu` | FolderTree context menu (Rename, Delete) |
| `select` | Folder selector in MetadataEditor |
| `skeleton` | Loading states in DocumentList |
| `toggle-group` | List/Grid view mode switcher in TopBar |
| `scroll-area` | Sidebar scrollable region, document list |
| `alert` | Error states (inline, not toast) |
| `tooltip` | Icon button labels |

Note: The `toast` (Sonner) component is NOT used — per architecture, errors are inline.

### Color Tokens

All colors come from Tailwind's named palette. The app uses the default shadcn CSS variable theme (`:root` variables injected by `npx shadcn@latest init`). Design tokens map as follows:

| Role | Tailwind/CSS Variable | Notes |
|---|---|---|
| Page background | `bg-background` | White in light mode |
| Sidebar background | `bg-muted` | Slightly off-white / light gray |
| Sidebar active item | `bg-accent` | Highlighted folder/tag row |
| Primary text | `text-foreground` | Near-black |
| Secondary/muted text | `text-muted-foreground` | Gray — for metadata labels, dates, file sizes |
| Border | `border` / `border-border` | Subtle dividers |
| Primary button | `bg-primary text-primary-foreground` | shadcn default (black/white) |
| Destructive action | `bg-destructive text-destructive-foreground` | Delete actions |
| Card background | `bg-card` | Document cards in grid view |
| Tag badge | `variant="secondary"` on Badge | Muted background, readable text |

No custom color tokens are needed for v1. The shadcn default theme is sufficient.

### Typography

All typography uses Tailwind's named type scale:

| Role | Classes |
|---|---|
| App title ("Documents") | `text-lg font-semibold` |
| Section headers (sidebar "Folders", "Tags") | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Document name (list row) | `text-sm font-medium` |
| Document name (grid card title) | `text-sm font-semibold` |
| Metadata labels (file size, date) | `text-xs text-muted-foreground` |
| Search result snippet | `text-xs text-muted-foreground` |
| Tag badge text | `text-xs` (inherits from Badge) |
| Folder tree items | `text-sm` |
| MetadataEditor field labels | `text-sm font-medium` |
| Error messages | `text-sm text-destructive` |

Body font: system font stack (shadcn default — no custom font import for v1).

### Spacing and Density

Comfortable density — document management is data-dense but not a dashboard:
- Sidebar width: `w-60` (240px)
- Sidebar padding: `px-3 py-4`
- Sidebar item padding: `px-3 py-1.5`
- TopBar height: `h-14` with `px-4` horizontal padding
- Document list row height: ~`py-3 px-4` per row
- Document card: `p-4` inner padding
- MetadataEditor Sheet width: `w-96` (384px)
- Content area padding: `p-6`

---

## Layout Wireframes

### AppShell — Full Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  TOPBAR (h-14, full width, border-b)                             │
│  [SearchBar ~400px]          [List|Grid Toggle]  [Upload Button] │
├────────────┬─────────────────────────────────────────────────────┤
│            │                                                      │
│  SIDEBAR   │   MAIN CONTENT AREA                                 │
│  w-60      │   flex-1, overflow-y-auto                           │
│  border-r  │                                                      │
│            │   When no document selected:                        │
│  App title │     DocumentList (list or grid)                     │
│  ─────     │                                                      │
│  All Docs  │   When document selected (isPanelOpen):             │
│  Folders   │     Split: DocumentList (left) | DocumentViewer     │
│   └ Work   │     (right, ~40% width)                             │
│   └ Home   │                                                      │
│  ─────     │                                                      │
│  TAGS      │                                                      │
│   invoice  │                                                      │
│   recipe   │                                                      │
│  ─────     │                                                      │
│  + New     │                                                      │
│   Folder   │                                                      │
└────────────┴─────────────────────────────────────────────────────┘
```

Implementation: `<div className="flex flex-col h-screen">` at root, then `<div className="flex flex-1 overflow-hidden">` containing sidebar + main.

### Sidebar — Detailed

```
┌────────────────────────┐
│ p-4                    │
│ Documents              │  ← text-lg font-semibold
│                        │
│ ─ All Documents ───    │  ← active = bg-accent rounded-md
│                        │
│ FOLDERS                │  ← section label style
│  ▶ Work                │  ← folder row, indent 0
│    └ Reports           │  ← indent pl-4, folder row
│  ▶ Home                │
│                        │
│ ─────────────          │  ← <Separator />
│ TAGS                   │
│  invoice  (3)          │  ← Badge + count, clickable
│  recipe   (1)          │
│                        │
│ ─────────────          │
│ + New Folder           │  ← Button variant="ghost" size="sm"
└────────────────────────┘
```

Active state (selected folder or tag): `bg-accent text-accent-foreground rounded-md` on the row.

### TopBar — Detailed

```
┌──────────────────────────────────────────────────────────────────┐
│ px-4, h-14, flex items-center gap-4, border-b bg-background      │
│                                                                   │
│ [🔍 Search documents...          ] [≡][⊞]  [↑ Upload]           │
│  Input w-full max-w-md            ToggleGroup  Button            │
└──────────────────────────────────────────────────────────────────┘
```

- SearchBar: `<Input>` with a `Search` Lucide icon inside a relative wrapper, `pl-9` on the input, icon positioned `absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground`
- ToggleGroup: two items with `List` and `LayoutGrid` Lucide icons; each item has a `Tooltip` with "List view" / "Grid view"
- Upload button: `<Button>` with `Upload` Lucide icon + "Upload" text label

### DocumentList — List View

```
┌──────────────────────────────────────────────────────────────────┐
│ All Documents (12)                                                │
├────┬───────────────────────────────────┬───────────┬────────────┤
│ 📄 │ Budget Report 2025.pdf             │ 2.3 MB    │ Feb 20     │
│    │ invoice finance                    │           │            │
├────┼───────────────────────────────────┼───────────┼────────────┤
│ 🖼 │ Team Photo.jpg                     │ 890 KB    │ Feb 18     │
│    │ photos                             │           │            │
├────┼───────────────────────────────────┼───────────┼────────────┤
│ 📝 │ Meeting Notes.md                   │ 4 KB      │ Feb 15     │
│    │ work notes                         │           │            │
└────┴───────────────────────────────────┴───────────┴────────────┘
```

Each row:
- `flex items-center gap-3 px-4 py-3 hover:bg-accent cursor-pointer rounded-md`
- Left: file type icon (Lucide, `text-muted-foreground`, 18px)
- Center: `<div className="flex-1 min-w-0">` — name on top line, tags on second line
- Right: file size + date (right-aligned, `text-xs text-muted-foreground`)
- When selected: `bg-accent`
- Search mode: snippet shown below name as `text-xs text-muted-foreground italic`, truncated at 2 lines

Loading skeleton: 5 rows of `<Skeleton className="h-12 w-full" />` with slight delays.

### DocumentList — Grid View

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│          │ │          │ │          │ │          │
│   📄     │ │   🖼     │ │   📝     │ │   📊     │
│          │ │          │ │          │ │          │
│ Budget   │ │ Team     │ │ Meeting  │ │ Data.csv │
│ Report   │ │ Photo    │ │ Notes    │ │          │
│          │ │          │ │          │ │          │
│ invoice  │ │ photos   │ │ work     │ │ finance  │
│ 2.3 MB   │ │ 890 KB   │ │ 4 KB     │ │ 12 KB    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

Grid: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-6`

Each `<Card>`:
- `p-4 cursor-pointer hover:bg-accent`
- Top: centered file icon (32px, `text-muted-foreground`)
- Middle: document name (`text-sm font-semibold line-clamp-2 mt-2`)
- Bottom: tags (Badge chips, truncated if many), then `text-xs text-muted-foreground` for size

### DocumentViewer Panel

The main content area splits when a document is selected:
```
┌────────────────────────┬─────────────────────────────────────┐
│                        │ DOCUMENT VIEWER                      │
│  DocumentList          │ border-l bg-background               │
│  (flex-1, min-w-0)     │ w-2/5 (or ~40%)                     │
│                        │                                       │
│                        │ ┌──────────────────────────────────┐ │
│                        │ │ Budget Report 2025              × │ │
│                        │ │ ─────────────────────────────── │ │
│                        │ │ [Edit Metadata]  [Download]      │ │
│                        │ ├──────────────────────────────────┤ │
│                        │ │                                  │ │
│                        │ │   [PDF viewer / image / editor]  │ │
│                        │ │                                  │ │
│                        │ │   PDF: page 1 of 4               │ │
│                        │ │   [< Prev]          [Next >]     │ │
│                        │ └──────────────────────────────────┘ │
└────────────────────────┴─────────────────────────────────────┘
```

Viewer panel header:
- `flex items-center justify-between px-4 py-3 border-b`
- Left: document name (`text-sm font-semibold truncate`)
- Right: close button (`Button variant="ghost" size="icon"` with `X` icon, `aria-label="Close document viewer"`)
- Below header: action bar with "Edit Metadata" (`Button variant="outline" size="sm"`) and "Download" (`Button variant="ghost" size="sm"`)

PDF viewer area: `flex-1 overflow-auto p-4` — react-pdf `<Document>` + `<Page>` centered, with pagination controls below.

Image viewer: `flex-1 overflow-auto p-4 flex items-center justify-center` — `<img className="max-w-full max-h-full object-contain" />`

Text/Markdown editor: `flex-1 overflow-hidden` — CodeMirror fills the container. Editor toolbar (optional for v1): just a "Save" button in the action bar.

Unsupported type: `flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground` — `FileX2` Lucide icon (48px), "This file type cannot be previewed." text, Download button.

### DocumentMetadataEditor — Sheet

```
┌──────────────────────────────────────┐
│ Edit Metadata                      × │
│ ──────────────────────────────────── │
│                                      │
│ Name                                 │
│ [Budget Report 2025           ]      │
│                                      │
│ Description                          │
│ [Quarterly budget summary...  ]      │
│ [                             ]      │
│                                      │
│ Folder                               │
│ [Work                      ▼ ]      │
│                                      │
│ Tags                                 │
│ [invoice ×] [finance ×]             │
│ [Add tag...               ]          │
│                                      │
│ ──────────────────────────────────── │
│              [Cancel]  [Save Changes]│
└──────────────────────────────────────┘
```

- shadcn `Sheet` with `side="right"`, `className="w-96"`
- `SheetHeader` with `SheetTitle` = "Edit Metadata" and `SheetDescription` (sr-only) = "Edit document name, description, folder, and tags"
- Each field: `<Label>` above `<Input>` / `<Textarea>` / `<Select>` — with `htmlFor` association
- Tags section: tag chips as `<Badge variant="secondary">` with a `×` `<button>` inside (`aria-label="Remove tag {name}"`)
- Tag input: plain `<Input placeholder="Add tag..." />` — Enter or comma triggers add
- Footer: `SheetFooter` with Cancel (`Button variant="outline"`) and Save Changes (`Button`)
- Focus management: on Sheet open, focus moves to Name input; on close, focus returns to "Edit Metadata" button

### DocumentUploadZone — Dialog

```
┌──────────────────────────────────────────┐
│ Upload Documents                       × │
│ ────────────────────────────────────── │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │                                  │   │
│  │   ↑  Drop files here             │   │
│  │      or                          │   │
│  │   [Browse Files]                 │   │
│  │                                  │   │
│  └──────────────────────────────────┘   │
│  border-2 border-dashed rounded-lg p-12 │
│  bg-muted (hover: bg-accent)            │
│                                          │
│  budget-report.pdf       ✓ Uploaded     │
│  photo.jpg               ⟳ Uploading…  │
│  notes.md                ✗ Failed       │
│                                          │
└──────────────────────────────────────────┘
```

- shadcn `Dialog` with `DialogTitle` = "Upload Documents"
- Drop zone: `div` with drag event handlers, `border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer`
- Drag-over state: `border-primary bg-accent`
- `<input type="file" multiple className="sr-only" />` triggered by the Browse button
- File list below drop zone: `mt-4 space-y-2`
- Each file row: filename + status icon (`CheckCircle2` green, `Loader2 animate-spin`, `XCircle` red)
- Focus management: Dialog open moves focus to the drop zone div (with `tabIndex={0}`, `role="region"`, `aria-label="File drop zone"`); Dialog close returns focus to Upload button in TopBar

### SearchBar

```
┌─────────────────────────────────────┐
│ 🔍 Search documents...              │
└─────────────────────────────────────┘
```

- `relative` wrapper `<div>`
- `<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />`
- `<Input className="pl-9 w-full max-w-md" placeholder="Search documents..." aria-label="Search documents" />`
- When search is active (query non-empty): show `<Button variant="ghost" size="icon">` with `X` icon at right edge to clear, `aria-label="Clear search"`

### FolderTree — Item Detail

Each folder row:
```
  [▶/▼] [📁] Folder Name                [⋮]
```
- `flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent`
- Chevron: `ChevronRight` / `ChevronDown` Lucide (toggles child folders), `h-3 w-3`
- Folder icon: `Folder` / `FolderOpen` Lucide, `h-4 w-4 text-muted-foreground`
- Name: `text-sm flex-1 truncate`
- Actions: `<DropdownMenu>` trigger with `MoreHorizontal` icon (`h-4 w-4`), visible on `hover:opacity-100 opacity-0` (always visible on mobile)
- DropdownMenu items: "Rename" (with `Pencil` icon), "Delete" (with `Trash2` icon, `text-destructive`)
- Nested folders: `pl-4` indent per level

### FolderCreateDialog

- shadcn `Dialog` with `DialogTitle` = "New Folder"
- Single `<Input>` field with `<Label>` = "Folder name", autofocused on open
- Optional `<Select>` for parent folder (default: "No parent — root level")
- Footer: Cancel + Create buttons
- Enter submits the form

---

## File Type Icon Strategy

Use Lucide React icons mapped to MIME type groups. All icons at `h-5 w-5 text-muted-foreground` in list view, `h-8 w-8` in grid view.

| MIME type pattern | Lucide Icon | Notes |
|---|---|---|
| `application/pdf` | `FileText` | PDF files |
| `image/*` | `Image` | All image types |
| `text/plain` | `FileText` | Plain text |
| `text/markdown` | `FileCode` | Markdown |
| `text/csv` | `Sheet` (or `Table2`) | CSV/spreadsheet-like |
| `text/html` | `Globe` | HTML files |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `FileText` | DOCX |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `Table2` | XLSX |
| `application/zip` / `application/x-zip-compressed` | `Archive` | ZIP files |
| `video/*` | `Video` | Video files |
| `audio/*` | `Music` | Audio files |
| `application/json` | `FileCode` | JSON |
| default (unknown) | `File` | Fallback |

---

## Tag Chip Visual Style

Tags use shadcn `<Badge variant="secondary">`:
- Background: `bg-secondary` (muted gray)
- Text: `text-secondary-foreground` (dark gray)
- Size: default Badge size (`text-xs px-2 py-0.5`)
- In display mode: read-only, non-interactive (no cursor-pointer unless clicking to filter)
- In sidebar (tag filter): `cursor-pointer hover:bg-accent` wrapping the Badge
- In edit mode (MetadataEditor): Badge + `×` button inside:
  ```
  <Badge variant="secondary" className="gap-1">
    recipe
    <button aria-label="Remove tag recipe" className="hover:text-foreground">
      <X className="h-3 w-3" />
    </button>
  </Badge>
  ```
- Active/selected tag filter in sidebar: `variant="default"` (dark background)

---

## Accessibility Behavior

### Keyboard Navigation

| Surface | Tab order | Special keys |
|---|---|---|
| AppShell | Sidebar → TopBar → Main content | F6 (optional region navigation) |
| Sidebar | App title → All Documents → Folder items → Tags → New Folder | Enter to activate item |
| FolderTree | Each folder row is focusable | Arrow keys navigate tree items; Enter expands/selects; Space selects |
| TopBar | SearchBar → ToggleGroup → Upload button | |
| SearchBar | Focus moves into Input | Escape clears query and returns focus to input |
| DocumentList rows | Each row in tab order | Enter or Space opens viewer |
| DocumentViewer | Close × → Edit Metadata → Download → viewer content | Escape closes panel |
| UploadZone Dialog | Drop zone div → Browse Files button → file list | Escape closes dialog |
| MetadataEditor Sheet | Name → Description → Folder Select → tag chips → tag input → Cancel → Save | Escape closes sheet |

### Focus Management

**Document viewer panel opens:**
- Focus moves to the viewer panel's close button (`×`)
- When closed (via × or Escape), focus returns to the list row that triggered it

**MetadataEditor Sheet opens:**
- Focus moves to the Name `<Input>` field
- When closed (Save, Cancel, or Escape), focus returns to the "Edit Metadata" button

**UploadZone Dialog opens:**
- Focus moves to the drop zone `<div tabIndex={0}>`
- When closed, focus returns to the Upload button in TopBar

### ARIA

- AppShell main region: `<main role="main">`
- Sidebar: `<nav aria-label="Navigation">`
- Document list: `<ul role="list">` with each row as `<li>`
- FolderTree: `<ul role="tree">` with `role="treeitem"` on each item
- Search input: `aria-label="Search documents"`, `aria-controls="document-list"` (optional live region)
- DocumentList: `id="document-list"`, `aria-live="polite"` on search results count
- DocumentViewer close: `aria-label="Close document viewer"`
- Upload drop zone: `role="region"`, `aria-label="File drop zone"`, `aria-describedby` pointing to helper text
- Error messages: `role="alert"` for API errors
- Loading states: `aria-busy="true"` on the list container while fetching
- Tag remove buttons: `aria-label="Remove tag {name}"`

---

## Consistency Notes

- No animation or transition classes are used anywhere (per agent spec rules and brief — no explicit animation request)
- All interactive elements have visible focus rings (shadcn default `focus-visible:ring-2` styles)
- Color is never the only means of conveying information (error states use both red color and an icon/text label)
- Minimum touch/click target size: 44px × 44px for all interactive elements (enforced by shadcn Button and input defaults)
- The design intentionally avoids dark mode complexity for v1 — the shadcn default light theme is used; dark mode can be added later by toggling the `dark` class on `<html>`
