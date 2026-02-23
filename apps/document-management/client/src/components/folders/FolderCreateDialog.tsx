import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFolders, useCreateFolder } from '@/hooks/useFolders';
import type { FolderNode } from '@/types';

interface FolderCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function flattenFolders(
  nodes: FolderNode[] | undefined,
  depth = 0
): { id: number; name: string; depth: number }[] {
  if (!nodes) return [];
  const result: { id: number; name: string; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    result.push(...flattenFolders(node.children, depth + 1));
  }
  return result;
}

export function FolderCreateDialog({ open, onOpenChange }: FolderCreateDialogProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('none');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: folders } = useFolders();
  const createFolder = useCreateFolder();

  const flatFolders = flattenFolders(folders);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createFolder.mutate(
      {
        name: name.trim(),
        parentId: parentId === 'none' ? null : parseInt(parentId, 10),
      },
      {
        onSuccess: () => {
          setName('');
          setParentId('none');
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work, Personal, Archives"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="folder-parent">Parent folder (optional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger id="folder-parent">
                <SelectValue placeholder="No parent — root level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent — root level</SelectItem>
                {flatFolders.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {'\u00a0\u00a0'.repeat(f.depth)}{f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createFolder.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
