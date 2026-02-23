import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listDocuments,
  getDocument,
  uploadDocument,
  updateDocument,
  updateDocumentTextContent,
  deleteDocument,
  getDocumentContentUrl,
} from '@/lib/api';

export function useDocuments(opts?: {
  folderId?: number | null;
  tag?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['documents', opts],
    queryFn: () => listDocuments(opts),
  });
}

export function useDocument(id: number | null) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => getDocument(id!),
    enabled: id !== null,
  });
}

export function useDocumentContentUrl(id: number | null): string | null {
  if (id === null) return null;
  return getDocumentContentUrl(id);
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => uploadDocument(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: { name?: string; description?: string | null; folderId?: number | null };
    }) => updateDocument(id, updates),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.setQueryData(['document', doc.id], doc);
    },
  });
}

export function useUpdateDocumentContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) =>
      updateDocumentTextContent(id, text),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.setQueryData(['document', doc.id], doc);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
