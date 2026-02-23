import { useUIStore } from '@/store/uiStore';
import { useDocuments } from '@/hooks/useDocuments';
import { DocumentCard, FileIcon } from './DocumentCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatBytes, formatDate } from '@/lib/utils';
import type { DocumentListItem } from '@/types';

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading documents">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function EmptyState({ isSearch }: { isSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
      <p className="text-sm">
        {isSearch ? 'No documents match your search.' : 'No documents here yet.'}
      </p>
      {!isSearch && (
        <p className="text-xs">Upload a file using the Upload button above.</p>
      )}
    </div>
  );
}

interface DocumentListRowProps {
  document: DocumentListItem;
  isSelected: boolean;
  onClick: () => void;
}

function DocumentListRow({ document, isSelected, onClick }: DocumentListRowProps) {
  return (
    <li>
      <div
        className={`flex items-center gap-3 px-4 py-3 hover:bg-accent cursor-pointer rounded-md ${
          isSelected ? 'bg-accent' : ''
        }`}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected}
      >
        <FileIcon mimeType={document.mimeType} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{document.name}</p>
          {document.snippet ? (
            <p
              className="text-xs text-muted-foreground line-clamp-2 italic"
              dangerouslySetInnerHTML={{ __html: document.snippet }}
            />
          ) : document.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {document.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">{formatBytes(document.fileSize)}</p>
          <p className="text-xs text-muted-foreground">{formatDate(document.createdAt)}</p>
        </div>
      </div>
    </li>
  );
}

export function DocumentList() {
  const selectedFolderId = useUIStore((s) => s.selectedFolderId);
  const selectedTag = useUIStore((s) => s.selectedTag);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const selectedDocumentId = useUIStore((s) => s.selectedDocumentId);
  const viewMode = useUIStore((s) => s.viewMode);
  const openPanel = useUIStore((s) => s.openPanel);

  const queryOpts = searchQuery
    ? { search: searchQuery }
    : selectedTag
    ? { tag: selectedTag }
    : { folderId: selectedFolderId };

  const { data: documents, isLoading, isError } = useDocuments(queryOpts);

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <div className="p-4">
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            Failed to load documents.{' '}
            <button
              className="underline font-medium"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return <EmptyState isSearch={!!searchQuery} />;
  }

  if (viewMode === 'grid') {
    return (
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-6"
        id="document-list"
        aria-label="Documents"
      >
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            isSelected={doc.id === selectedDocumentId}
            onClick={() => openPanel(doc.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <ul
      role="list"
      id="document-list"
      aria-label="Documents"
      className="space-y-0.5 p-2"
    >
      {documents.map((doc) => (
        <DocumentListRow
          key={doc.id}
          document={doc}
          isSelected={doc.id === selectedDocumentId}
          onClick={() => openPanel(doc.id)}
        />
      ))}
    </ul>
  );
}
