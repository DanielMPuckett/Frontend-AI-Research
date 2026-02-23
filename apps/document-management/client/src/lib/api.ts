import type {
  DocumentListItem,
  Folder,
  FolderNode,
  TagWithCount,
} from '@/types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Documents

export async function uploadDocument(formData: FormData): Promise<DocumentListItem> {
  return fetchJson('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function listDocuments(opts?: {
  folderId?: number | null;
  tag?: string;
  search?: string;
}): Promise<DocumentListItem[]> {
  const params = new URLSearchParams();
  if (opts?.folderId !== undefined) {
    params.set('folderId', opts.folderId === null ? 'null' : String(opts.folderId));
  }
  if (opts?.tag) params.set('tag', opts.tag);
  if (opts?.search) params.set('search', opts.search);
  const qs = params.toString();
  return fetchJson(`/api/documents${qs ? `?${qs}` : ''}`);
}

export async function getDocument(id: number): Promise<DocumentListItem> {
  return fetchJson(`/api/documents/${id}`);
}

export function getDocumentContentUrl(id: number): string {
  return `/api/documents/${id}/content`;
}

export async function updateDocument(
  id: number,
  updates: { name?: string; description?: string | null; folderId?: number | null }
): Promise<DocumentListItem> {
  return fetchJson(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function updateDocumentTextContent(
  id: number,
  text: string
): Promise<DocumentListItem> {
  return fetchJson(`/api/documents/${id}/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

export async function deleteDocument(id: number): Promise<void> {
  return fetchJson(`/api/documents/${id}`, { method: 'DELETE' });
}

export async function addTag(documentId: number, tag: string): Promise<DocumentListItem> {
  return fetchJson(`/api/documents/${documentId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag }),
  });
}

export async function removeTag(documentId: number, tag: string): Promise<DocumentListItem> {
  return fetchJson(`/api/documents/${documentId}/tags/${encodeURIComponent(tag)}`, {
    method: 'DELETE',
  });
}

// Folders

export async function listFolders(): Promise<FolderNode[]> {
  return fetchJson('/api/folders');
}

export async function createFolder(
  name: string,
  parentId?: number | null
): Promise<Folder> {
  return fetchJson('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId }),
  });
}

export async function renameFolder(id: number, name: string): Promise<Folder> {
  return fetchJson(`/api/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function deleteFolder(id: number): Promise<void> {
  return fetchJson(`/api/folders/${id}`, { method: 'DELETE' });
}

// Tags

export async function listTags(): Promise<TagWithCount[]> {
  return fetchJson('/api/tags');
}
