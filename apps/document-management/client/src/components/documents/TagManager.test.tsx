import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TagManager } from './TagManager';

vi.mock('@/lib/api', () => ({
  addTag: vi.fn().mockResolvedValue({ id: 1, name: 'Test Doc', tags: ['recipe', 'new-tag'], originalFilename: 'test.txt', mimeType: 'text/plain', fileSize: 10, folderId: null, description: null, createdAt: 0, updatedAt: 0 }),
  removeTag: vi.fn().mockResolvedValue({ id: 1, name: 'Test Doc', tags: [], originalFilename: 'test.txt', mimeType: 'text/plain', fileSize: 10, folderId: null, description: null, createdAt: 0, updatedAt: 0 }),
  listTags: vi.fn().mockResolvedValue([]),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TagManager', () => {
  it('renders existing tags in edit mode', () => {
    render(
      <TagManager documentId={1} tags={['recipe', 'finance']} mode="edit" />,
      { wrapper }
    );
    expect(screen.getByText('recipe')).toBeInTheDocument();
    expect(screen.getByText('finance')).toBeInTheDocument();
  });

  it('renders remove buttons for each tag in edit mode', () => {
    render(
      <TagManager documentId={1} tags={['recipe', 'finance']} mode="edit" />,
      { wrapper }
    );
    expect(screen.getByLabelText('Remove tag recipe')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove tag finance')).toBeInTheDocument();
  });

  it('calls removeTag when × button is clicked', async () => {
    const user = userEvent.setup();
    const { addTag, removeTag } = await import('@/lib/api');

    render(
      <TagManager documentId={1} tags={['recipe']} mode="edit" />,
      { wrapper }
    );

    await user.click(screen.getByLabelText('Remove tag recipe'));
    expect(removeTag).toHaveBeenCalledWith(1, 'recipe');
  });

  it('calls addTag when Enter is pressed in the input', async () => {
    const user = userEvent.setup();
    const { addTag } = await import('@/lib/api');

    render(
      <TagManager documentId={1} tags={[]} mode="edit" />,
      { wrapper }
    );

    const input = screen.getByLabelText(/Add tag/i);
    await user.type(input, 'new-tag{Enter}');
    expect(addTag).toHaveBeenCalledWith(1, 'new-tag');
  });

  it('renders tags as non-interactive badges in display mode', () => {
    render(
      <TagManager documentId={1} tags={['recipe', 'finance']} mode="display" />,
      { wrapper }
    );
    expect(screen.getByText('recipe')).toBeInTheDocument();
    expect(screen.getByText('finance')).toBeInTheDocument();
    // No remove buttons in display mode
    expect(screen.queryByLabelText(/Remove tag/i)).not.toBeInTheDocument();
  });
});
