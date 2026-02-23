import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

export function isEditableMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return (
    normalized === 'text/plain' ||
    normalized === 'text/markdown' ||
    normalized === 'text/x-markdown' ||
    normalized === 'text/csv' ||
    normalized === 'text/html'
  );
}

export function isViewableMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return (
    normalized === 'application/pdf' ||
    normalized.startsWith('image/') ||
    isEditableMimeType(mimeType)
  );
}

export function getMimeLabel(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  const labels: Record<string, string> = {
    'application/pdf': 'PDF',
    'text/plain': 'Text',
    'text/markdown': 'Markdown',
    'text/x-markdown': 'Markdown',
    'text/csv': 'CSV',
    'text/html': 'HTML',
    'application/json': 'JSON',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WebP',
    'image/svg+xml': 'SVG',
    'video/mp4': 'MP4',
    'audio/mpeg': 'MP3',
    'application/zip': 'ZIP',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  };
  return labels[normalized] ?? normalized.split('/')[1]?.toUpperCase() ?? 'File';
}

export function formatDate(epochSeconds: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(epochSeconds * 1000));
}
