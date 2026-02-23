import { useRef, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function SearchBar() {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const [localValue, setLocalValue] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value when store is cleared externally
  useEffect(() => {
    if (searchQuery === '') setLocalValue('');
  }, [searchQuery]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setLocalValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(val);
    }, 300);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setLocalValue('');
      setSearchQuery('');
      inputRef.current?.blur();
    }
  }

  function handleClear() {
    setLocalValue('');
    setSearchQuery('');
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full max-w-md">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search documents..."
        aria-label="Search documents"
        className={cn('pl-9', localValue ? 'pr-8' : '')}
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
