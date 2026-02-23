import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { useUIStore } from '@/store/uiStore';

export function AppShell() {
  const isPanelOpen = useUIStore((s) => s.isPanelOpen);
  const selectedDocumentId = useUIStore((s) => s.selectedDocumentId);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          role="main"
          className="flex flex-1 overflow-hidden"
        >
          <div
            className={`overflow-y-auto ${isPanelOpen ? 'flex-1 min-w-0' : 'flex-1'}`}
          >
            <DocumentList />
          </div>
          {isPanelOpen && selectedDocumentId !== null && (
            <div className="w-2/5 shrink-0 overflow-hidden">
              <DocumentViewer documentId={selectedDocumentId} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
