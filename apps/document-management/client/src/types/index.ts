export interface DocumentListItem {
  id: number;
  name: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  folderId: number | null;
  description: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  snippet?: string;
}

export interface DocumentDetail extends DocumentListItem {}

export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface FolderNode extends Folder {
  children: FolderNode[];
}

export interface TagWithCount {
  id: number;
  name: string;
  count: number;
}
