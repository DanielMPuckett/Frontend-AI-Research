import { useState, useEffect, useRef } from 'react';
import { X, Download, Pencil, FileX2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentMetadataEditor } from './DocumentMetadataEditor';
import { useDocument, useUpdateDocumentContent, useDeleteDocument } from '@/hooks/useDocuments';
import { useUIStore } from '@/store/uiStore';
import { isEditableMimeType } from '@/lib/utils';
import type { DocumentListItem } from '@/types';

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface DocumentViewerProps {
  documentId: number;
}

function CodeMirrorEditor({
  initialValue,
  mimeType,
  onSave,
  isSaving,
}: {
  initialValue: string;
  mimeType: string;
  onSave: (text: string) => void;
  isSaving: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const extensions = [basicSetup];
    if (mimeType.includes('markdown') || mimeType === 'text/x-markdown') {
      extensions.push(markdown());
    }
    const view = new EditorView({
      doc: initialValue,
      extensions,
      parent: editorRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div ref={editorRef} className="flex-1 overflow-auto text-sm" />
      <div className="border-t p-2 flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            if (viewRef.current) {
              onSave(viewRef.current.state.doc.toString());
            }
          }}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);

  return (
    <div className="flex flex-col h-full items-center overflow-auto p-4 gap-4">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={(err) => console.error('PDF load error:', err)}
      >
        <Page pageNumber={pageNumber} width={400} />
      </Document>
      {numPages > 1 && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            Page {pageNumber} of {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function TextContentViewer({
  doc,
  contentUrl,
  updateContent,
}: {
  doc: DocumentListItem;
  contentUrl: string;
  updateContent: ReturnType<typeof useUpdateDocumentContent>;
}) {
  const [text, setText] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setText(null);
    setLoadError(false);
    fetch(contentUrl)
      .then((r) => r.text())
      .then(setText)
      .catch(() => setLoadError(true));
  }, [contentUrl]);

  if (loadError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>Failed to load file content.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (text === null) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <CodeMirrorEditor
      initialValue={text}
      mimeType={doc.mimeType}
      onSave={(newText) => updateContent.mutate({ id: doc.id, text: newText })}
      isSaving={updateContent.isPending}
    />
  );
}

function renderContent(
  doc: DocumentListItem,
  contentUrl: string,
  updateContent: ReturnType<typeof useUpdateDocumentContent>
) {
  const { mimeType } = doc;

  if (mimeType === 'application/pdf') {
    return <PdfViewer url={contentUrl} />;
  }

  if (mimeType.startsWith('image/')) {
    return (
      <div className="flex items-center justify-center h-full overflow-auto p-4">
        <img
          src={contentUrl}
          alt={doc.name}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  if (isEditableMimeType(mimeType)) {
    return (
      <TextContentViewer
        doc={doc}
        contentUrl={contentUrl}
        updateContent={updateContent}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-4">
      <FileX2 className="h-12 w-12" aria-hidden="true" />
      <p className="text-sm text-center">
        This file type cannot be previewed in the browser.
      </p>
      <a href={contentUrl} download={doc.originalFilename}>
        <Button variant="outline" size="sm">
          <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Download to view
        </Button>
      </a>
    </div>
  );
}

export function DocumentViewer({ documentId }: DocumentViewerProps) {
  const { data: doc, isLoading, isError } = useDocument(documentId);
  const [metaEditorOpen, setMetaEditorOpen] = useState(false);
  const closePanel = useUIStore((s) => s.closePanel);
  const updateContent = useUpdateDocumentContent();
  const deleteDocument = useDeleteDocument();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, [documentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>Failed to load document.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const contentUrl = `/api/documents/${doc.id}/content`;

  function handleDelete() {
    if (!confirm(`Delete "${doc!.name}"? This cannot be undone.`)) return;
    deleteDocument.mutate(doc!.id, { onSuccess: closePanel });
  }

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <span className="text-sm font-semibold flex-1 truncate" title={doc.name}>
          {doc.name}
        </span>
        <Button
          ref={closeBtnRef}
          variant="ghost"
          size="icon"
          onClick={closePanel}
          aria-label="Close document viewer"
          className="h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMetaEditorOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Edit Metadata
        </Button>
        <a href={contentUrl} download={doc.originalFilename}>
          <Button variant="ghost" size="sm">
            <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Download
          </Button>
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive ml-auto"
          onClick={handleDelete}
          disabled={deleteDocument.isPending}
        >
          Delete
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderContent(doc, contentUrl, updateContent)}
      </div>

      {metaEditorOpen && (
        <DocumentMetadataEditor
          document={doc}
          open={metaEditorOpen}
          onOpenChange={setMetaEditorOpen}
        />
      )}
    </div>
  );
}
