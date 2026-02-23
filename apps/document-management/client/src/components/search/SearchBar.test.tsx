import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SearchBar } from './SearchBar';
import { useUIStore } from '@/store/uiStore';

beforeEach(() => {
  useUIStore.setState({ searchQuery: '' });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  useUIStore.setState({ searchQuery: '' });
});

describe('SearchBar', () => {
  it('renders the search input', () => {
    render(<SearchBar />);
    expect(screen.getByRole('textbox', { name: /search documents/i })).toBeInTheDocument();
  });

  it('debounces search query updates (300ms)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);

    const input = screen.getByRole('textbox', { name: /search documents/i });
    await user.type(input, 'budget');

    // Before debounce fires, store should not have updated
    expect(useUIStore.getState().searchQuery).toBe('');

    // After 300ms debounce
    act(() => vi.advanceTimersByTime(300));
    expect(useUIStore.getState().searchQuery).toBe('budget');
  });

  it('clears search query on Escape key', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);

    const input = screen.getByRole('textbox', { name: /search documents/i });
    await user.type(input, 'test');
    act(() => vi.advanceTimersByTime(300));
    expect(useUIStore.getState().searchQuery).toBe('test');

    await user.keyboard('{Escape}');
    expect(useUIStore.getState().searchQuery).toBe('');
  });
});
