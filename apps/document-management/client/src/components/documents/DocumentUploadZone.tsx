import { useState, useRef } from 'react';
import { Upload, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUploadDocument } from '@/hooks/useDocuments';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

interface FileUploadState {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface DocumentUploadZoneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentUploadZone({ open, onOpenChange }: DocumentUploadZoneProps) {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const uploadDocument = useUploadDocument();
  const selectedFolderId = useUIStore((s) => s.selectedFolderId);

  async function uploadFile(file: File) {
    setFiles((prev) =>
      prev.map((f) => (f.file === file ? { ...f, status: 'uploading' } : f))
    );

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    if (selectedFolderId !== null && selectedFolderId !== undefined) {
      formData.append('folderId', String(selectedFolderId));
    }

    try {
      await uploadDocument.mutateAsync(formData);
      setFiles((prev) =>
        prev.map((f) => (f.file === file ? { ...f, status: 'done' } : f))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, status: 'error', error: message } : f
        )
      );
    }
  }

  function handleFiles(fileList: FileList | File[]) {
    const newFiles = Array.from(fileList).map((file) => ({
      file,
      status: 'pending' as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => uploadFile(f.file));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleClose() {
    setFiles([]);
    setIsDragOver(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <div
          ref={dropZoneRef}
          role="region"
          aria-label="File drop zone — drag and drop files here or click to browse"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer',
            isDragOver
              ? 'border-primary bg-accent'
              : 'border-border hover:bg-muted'
          )}
        >
          <Upload
            className="h-10 w-10 mx-auto text-muted-foreground mb-4"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground mb-3">
            Drop files here or
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            aria-label="Choose files to upload"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="mt-2 space-y-2" aria-label="Upload status">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">{f.file.name}</span>
                {f.status === 'uploading' && (
                  <Loader2
                    className="h-4 w-4 animate-spin text-muted-foreground"
                    aria-label="Uploading"
                  />
                )}
                {f.status === 'done' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Uploaded" />
                )}
                {f.status === 'error' && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs">{f.error}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
