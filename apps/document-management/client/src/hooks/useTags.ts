import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTags, addTag, removeTag } from '@/lib/api';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  });
}

export function useAddTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, tag }: { documentId: number; tag: string }) =>
      addTag(documentId, tag),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.setQueryData(['document', doc.id], doc);
    },
  });
}

export function useRemoveTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, tag }: { documentId: number; tag: string }) =>
      removeTag(documentId, tag),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.setQueryData(['document', doc.id], doc);
    },
  });
}
