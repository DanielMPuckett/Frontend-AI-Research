import {
  FileText,
  Image,
  FileCode,
  Table2,
  Globe,
  Archive,
  Video,
  Music,
  File,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBytes, formatDate } from '@/lib/utils';
import type { DocumentListItem } from '@/types';

function FileIcon({ mimeType, size = 'md' }: { mimeType: string; size?: 'sm' | 'md' }) {
  const className = size === 'sm' ? 'h-5 w-5 text-muted-foreground shrink-0' : 'h-8 w-8 text-muted-foreground';
  const normalized = mimeType.toLowerCase().split(';')[0].trim();

  if (normalized === 'application/pdf' || normalized === 'text/plain' ||
      normalized.includes('word') || normalized === 'text/html') {
    return <FileText className={className} aria-hidden="true" />;
  }
  if (normalized.startsWith('image/')) return <Image className={className} aria-hidden="true" />;
  if (normalized === 'text/markdown' || normalized === 'text/x-markdown' ||
      normalized === 'application/json' || normalized === 'text/javascript') {
    return <FileCode className={className} aria-hidden="true" />;
  }
  if (normalized === 'text/csv' || normalized.includes('spreadsheet')) {
    return <Table2 className={className} aria-hidden="true" />;
  }
  if (normalized === 'text/html') return <Globe className={className} aria-hidden="true" />;
  if (normalized.includes('zip') || normalized.includes('archive')) {
    return <Archive className={className} aria-hidden="true" />;
  }
  if (normalized.startsWith('video/')) return <Video className={className} aria-hidden="true" />;
  if (normalized.startsWith('audio/')) return <Music className={className} aria-hidden="true" />;
  return <File className={className} aria-hidden="true" />;
}

export { FileIcon };

interface DocumentCardProps {
  document: DocumentListItem;
  onClick: () => void;
  isSelected?: boolean;
}

export function DocumentCard({ document, onClick, isSelected }: DocumentCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:bg-accent ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-2 mb-3">
          <FileIcon mimeType={document.mimeType} size="md" />
        </div>
        <p className="text-sm font-semibold line-clamp-2 text-center mb-2">
          {document.name}
        </p>
        {document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mb-2">
            {document.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {document.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{document.tags.length - 3}</span>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center">
          {formatBytes(document.fileSize)}
        </p>
      </CardContent>
    </Card>
  );
}
