---
agent: database-manager
project: {project-slug}
date: YYYY-MM-DD
status: draft
---

# Database Schema: {project-name}

## Summary
[One paragraph of schema changes]

## New Tables

### {table_name}
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | bigint | No | auto | Primary key |
| created_at | timestamp | No | now() | |
| updated_at | timestamp | No | now() | |

## Modified Tables

### {table_name}
**Add columns:**
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|

**Remove columns:**
- `column_name` — [reason safe to remove]

## Indexes
- `{table}.{column}` — [reason for index]

## Foreign Keys
- `{table}.{column}` → `{other_table}.id` — [cascade behavior]

## Migrations Required
- `YYYY_MM_DD_HHMMSS_create_{table}_table.php` (or equivalent for non-Laravel)
- `YYYY_MM_DD_HHMMSS_add_{column}_to_{table}_table.php`

## Data Access Patterns
[Key queries this schema must support efficiently]

## Open Questions
[Unresolved items — empty if none]

## Assumptions
[What was assumed when information was missing]
