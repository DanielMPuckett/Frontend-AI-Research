import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentList } from './DocumentList';
import type { DocumentListItem } from '@/types';

// Mock the API module
vi.mock('@/lib/api', () => ({
  listDocuments: vi.fn(),
}));

import * as api from '@/lib/api';

const mockDocuments: DocumentListItem[] = [
  {
    id: 1,
    name: 'Budget Report 2025.pdf',
    originalFilename: 'budget.pdf',
    mimeType: 'application/pdf',
    fileSize: 2400000,
    folderId: null,
    description: null,
    tags: ['finance', 'invoice'],
    createdAt: 1708704000,
    updatedAt: 1708704000,
  },
  {
    id: 2,
    name: 'Team Photo.jpg',
    originalFilename: 'photo.jpg',
    mimeType: 'image/jpeg',
    fileSize: 890000,
    folderId: null,
    description: null,
    tags: ['photos'],
    createdAt: 1708617600,
    updatedAt: 1708617600,
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DocumentList', () => {
  it('renders document names when documents are loaded', async () => {
    vi.mocked(api.listDocuments).mockResolvedValue(mockDocuments);

    render(<DocumentList />, { wrapper });

    // Documents appear after data loads
    expect(await screen.findByText('Budget Report 2025.pdf')).toBeInTheDocument();
    expect(screen.getByText('Team Photo.jpg')).toBeInTheDocument();
  });

  it('renders empty state when no documents exist', async () => {
    vi.mocked(api.listDocuments).mockResolvedValue([]);

    render(<DocumentList />, { wrapper });

    expect(await screen.findByText(/No documents here yet/i)).toBeInTheDocument();
  });

  it('renders search empty state when search returns no results', async () => {
    vi.mocked(api.listDocuments).mockResolvedValue([]);

    // Set search query in the store
    const { useUIStore } = await import('@/store/uiStore');
    useUIStore.setState({ searchQuery: 'zzz_no_match' });

    render(<DocumentList />, { wrapper });

    expect(await screen.findByText(/No documents match your search/i)).toBeInTheDocument();

    // Reset store
    useUIStore.setState({ searchQuery: '' });
  });
});
