import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../services/memoService', () => ({
  memoService: {
    getAvailableCheckers: vi.fn(() => Promise.resolve([
      { id: 'c1', full_name: 'Chandra Checker', email: 'chandra@nif.test', department: 'ENG', role: 'checker' },
      { id: 'c2', full_name: 'Other Checker', email: 'other@nif.test', department: 'HR', role: 'checker' },
    ])),
    getAvailableApprovers: vi.fn(() => Promise.resolve([])),
  },
}));

import UserSelector from './UserSelector';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

describe('UserSelector', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the Auto-assign option when allowAuto', async () => {
    wrap(<UserSelector role="checker" value="" onChange={() => {}} allowAuto />);
    fireEvent.click(screen.getByRole('button', { name: /Auto-assign|Select/ }));
    // The trigger label and the menu option both read "Auto-assign…"; assert the option.
    expect(await screen.findByRole('option', { name: /Auto-assign by department/ })).toBeInTheDocument();
  });

  it('filters the list by search', async () => {
    wrap(<UserSelector role="checker" value="" onChange={() => {}} allowAuto />);
    fireEvent.click(screen.getByRole('button'));
    await screen.findByText('Chandra Checker');
    fireEvent.change(screen.getByLabelText('Search checkers'), { target: { value: 'other' } });
    await waitFor(() => expect(screen.queryByText('Chandra Checker')).not.toBeInTheDocument());
    expect(screen.getByText('Other Checker')).toBeInTheDocument();
  });

  it('calls onChange with the picked user id', async () => {
    const onChange = vi.fn();
    wrap(<UserSelector role="checker" value="" onChange={onChange} allowAuto />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(await screen.findByText('Chandra Checker'));
    expect(onChange).toHaveBeenCalledWith('c1');
  });
});
