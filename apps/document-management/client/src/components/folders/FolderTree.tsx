import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFolders, useRenameFolder, useDeleteFolder } from '@/hooks/useFolders';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import type { FolderNode } from '@/types';

interface FolderTreeItemProps {
  folder: FolderNode;
  depth: number;
}

function FolderTreeItem({ folder, depth }: FolderTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const selectedFolderId = useUIStore((s) => s.selectedFolderId);
  const setSelectedFolder = useUIStore((s) => s.setSelectedFolder);
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();

  const isActive = selectedFolderId === folder.id;
  const hasChildren = folder.children.length > 0;

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!renameValue.trim()) return;
    renameFolder.mutate(
      { id: folder.id, name: renameValue.trim() },
      { onSuccess: () => setRenaming(false) }
    );
  }

  if (renaming) {
    return (
      <form onSubmit={handleRenameSubmit} className="px-2 py-1">
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={() => setRenaming(false)}
          onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}
          autoFocus
          className="h-7 text-sm"
          aria-label={`Rename folder ${folder.name}`}
        />
      </form>
    );
  }

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent',
          isActive && 'bg-accent text-accent-foreground'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          setSelectedFolder(folder.id);
          if (hasChildren) setExpanded((e) => !e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedFolder(folder.id);
          }
          if (e.key === 'ArrowRight') setExpanded(true);
          if (e.key === 'ArrowLeft') setExpanded(false);
        }}
        tabIndex={0}
        role="button"
        aria-pressed={isActive}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
            className="text-muted-foreground"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-3" aria-hidden="true" />
        )}

        {isActive ? (
          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        )}

        <span className="text-sm flex-1 truncate">{folder.name}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
              aria-label={`More actions for ${folder.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setRenameValue(folder.name);
                setRenaming(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                deleteFolder.mutate(folder.id);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && expanded && (
        <ul role="group">
          {folder.children.map((child) => (
            <FolderTreeItem key={child.id} folder={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FolderTree() {
  const { data: folders, isLoading } = useFolders();

  if (isLoading) return null;
  if (!folders || folders.length === 0) return null;

  return (
    <ul role="tree" aria-label="Folders" className="space-y-0.5">
      {folders.map((folder) => (
        <FolderTreeItem key={folder.id} folder={folder} depth={0} />
      ))}
    </ul>
  );
}
