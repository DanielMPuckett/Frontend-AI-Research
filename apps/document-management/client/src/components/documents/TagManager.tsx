import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAddTag, useRemoveTag } from '@/hooks/useTags';
import { cn } from '@/lib/utils';

interface TagManagerProps {
  documentId: number;
  tags: string[];
  mode: 'edit' | 'display';
  onTagClick?: (tag: string) => void;
}

export function TagManager({ documentId, tags, mode, onTagClick }: TagManagerProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const addTag = useAddTag();
  const removeTag = useRemoveTag();

  function handleAddTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/,/g, '');
    if (!tag || tags.includes(tag)) return;
    addTag.mutate({ documentId, tag });
    setInputValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  }

  function handleRemoveTag(tag: string) {
    removeTag.mutate({ documentId, tag });
  }

  if (mode === 'display') {
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className={cn(onTagClick && 'cursor-pointer hover:bg-accent')}
            onClick={() => onTagClick?.(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 min-h-8">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => handleRemoveTag(tag)}
              className="rounded-full hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) handleAddTag(inputValue);
        }}
        placeholder="Add tag..."
        aria-label="Add tag — press Enter or comma to add"
        className="text-sm"
      />
    </div>
  );
}
