import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ApprovalTimeline from './ApprovalTimeline';

const steps = [
  { id: '1', action: 'submitted', actor: { full_name: 'Maya Maker' }, acted_at: new Date().toISOString(), comment: '' },
  { id: '2', action: 'reviewed', actor: { full_name: 'Chandra Checker' }, acted_at: new Date().toISOString(), comment: 'Looks good' },
  { id: '3', action: 'approved', actor: { full_name: 'Anil Approver' }, acted_at: new Date().toISOString(), comment: '' },
];

describe('ApprovalTimeline', () => {
  it('renders each step in order with actor + action', () => {
    render(<ApprovalTimeline steps={steps} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('Maya Maker')).toBeInTheDocument();
    expect(within(items[0]).getByText('Submitted')).toBeInTheDocument();
    expect(within(items[1]).getByText('Reviewed')).toBeInTheDocument();
    expect(within(items[2]).getByText('Approved')).toBeInTheDocument();
  });

  it('shows a comment when present', () => {
    render(<ApprovalTimeline steps={steps} />);
    expect(screen.getByText(/Looks good/)).toBeInTheDocument();
  });

  it('shows empty state with no steps', () => {
    render(<ApprovalTimeline steps={[]} />);
    expect(screen.getByText(/No workflow activity/i)).toBeInTheDocument();
  });
});
