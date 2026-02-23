import { useState } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderTree } from '@/components/folders/FolderTree';
import { FolderCreateDialog } from '@/components/folders/FolderCreateDialog';
import { useTags } from '@/hooks/useTags';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const selectedFolderId = useUIStore((s) => s.selectedFolderId);
  const selectedTag = useUIStore((s) => s.selectedTag);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSelectedFolder = useUIStore((s) => s.setSelectedFolder);
  const setSelectedTag = useUIStore((s) => s.setSelectedTag);
  const { data: tags } = useTags();

  const isAllDocsActive = !searchQuery && selectedTag === null && selectedFolderId === undefined as unknown as null;

  return (
    <nav
      aria-label="Navigation"
      className="w-60 border-r bg-background flex flex-col shrink-0 h-full"
    >
      <div className="px-4 py-4 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          <h1 className="text-lg font-semibold">Documents</h1>
        </div>

        <button
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm hover:bg-accent text-left',
            isAllDocsActive && 'bg-accent text-accent-foreground'
          )}
          onClick={() => setSelectedFolder(null)}
          aria-pressed={isAllDocsActive}
        >
          All Documents
        </button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-2 mb-1.5">
            Folders
          </p>
          <FolderTree />
        </div>

        {tags && tags.length > 0 && (
          <div className="pb-4">
            <Separator className="mb-3" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-2 mb-1.5">
              Tags
            </p>
            <div className="space-y-0.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent text-left',
                    selectedTag === tag.name && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() =>
                    setSelectedTag(selectedTag === tag.name ? null : tag.name)
                  }
                  aria-pressed={selectedTag === tag.name}
                >
                  <Badge
                    variant={selectedTag === tag.name ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {tag.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{tag.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      <div className="px-3 py-3 border-t shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setFolderDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          New Folder
        </Button>
      </div>

      <FolderCreateDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
      />
    </nav>
  );
}
