import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TagManager } from './TagManager';
import { useUpdateDocument } from '@/hooks/useDocuments';
import { useFolders } from '@/hooks/useFolders';
import type { DocumentListItem, FolderNode } from '@/types';

interface DocumentMetadataEditorProps {
  document: DocumentListItem;
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

export function DocumentMetadataEditor({
  document,
  open,
  onOpenChange,
}: DocumentMetadataEditorProps) {
  const [name, setName] = useState(document.name);
  const [description, setDescription] = useState(document.description ?? '');
  const [folderId, setFolderId] = useState<string>(
    document.folderId !== null ? String(document.folderId) : 'none'
  );
  const nameInputRef = useRef<HTMLInputElement>(null);
  const updateDocument = useUpdateDocument();
  const { data: folders } = useFolders();
  const flatFolders = flattenFolders(folders);

  useEffect(() => {
    if (open) {
      setName(document.name);
      setDescription(document.description ?? '');
      setFolderId(document.folderId !== null ? String(document.folderId) : 'none');
    }
  }, [open, document]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    updateDocument.mutate(
      {
        id: document.id,
        updates: {
          name: name.trim(),
          description: description.trim() || null,
          folderId: folderId === 'none' ? null : parseInt(folderId, 10),
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-96 overflow-y-auto"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          nameInputRef.current?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>Edit Metadata</SheetTitle>
          <p className="sr-only">Edit document name, description, folder, and tags</p>
        </SheetHeader>

        <form onSubmit={handleSave} className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="doc-name">Name</Label>
            <Input
              id="doc-name"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-describedby={!name.trim() ? 'doc-name-error' : undefined}
            />
            {!name.trim() && (
              <p id="doc-name-error" className="text-sm text-destructive" role="alert">
                Name is required
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-description">Description</Label>
            <Textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-folder">Folder</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger id="doc-folder">
                <SelectValue placeholder="Unfiled" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unfiled</SelectItem>
                {flatFolders.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {'\u00a0\u00a0'.repeat(f.depth)}{f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <TagManager
              documentId={document.id}
              tags={document.tags}
              mode="edit"
            />
          </div>

          {updateDocument.isError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                {updateDocument.error instanceof Error
                  ? updateDocument.error.message
                  : 'Failed to save changes'}
              </AlertDescription>
            </Alert>
          )}

          <SheetFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || updateDocument.isPending}
            >
              {updateDocument.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
