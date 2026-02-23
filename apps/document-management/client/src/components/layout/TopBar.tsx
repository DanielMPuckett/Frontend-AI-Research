import { useState } from 'react';
import { Upload, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchBar } from '@/components/search/SearchBar';
import { DocumentUploadZone } from '@/components/documents/DocumentUploadZone';
import { useUIStore } from '@/store/uiStore';

export function TopBar() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  return (
    <header className="h-14 flex items-center gap-4 px-4 border-b bg-background shrink-0">
      <SearchBar />

      <div className="flex items-center gap-2 ml-auto shrink-0">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}
          aria-label="View mode"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>List view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Grid view</TooltipContent>
          </Tooltip>
        </ToggleGroup>

        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
          Upload
        </Button>
      </div>

      <DocumentUploadZone open={uploadOpen} onOpenChange={setUploadOpen} />
    </header>
  );
}
