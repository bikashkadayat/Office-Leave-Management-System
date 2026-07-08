import React from 'react';

/** Small colored pill. Colour + text label (never colour alone). */
const Pill = ({ label, bg, fg, border }) => (
  <span className="lr-memo-pill" style={{ background: bg, color: fg, borderColor: border || bg }}>
    {label}
  </span>
);

const STATUS = {
  draft: ['#e5e7eb', '#374151'],
  submitted: ['#dbeafe', '#1e40af'],
  under_review: ['#fef3c7', '#92400e'],
  approved: ['#d1fae5', '#065f46'],
  rejected: ['#fee2e2', '#991b1b'],
  cancelled: ['#d1d5db', '#1f2937'],
};
const STATUS_LABEL = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
  approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled',
};

/** @param {{status:string}} props */
export const MemoStatusBadge = ({ status }) => {
  const [bg, fg] = STATUS[status] || STATUS.draft;
  return <Pill label={STATUS_LABEL[status] || status} bg={bg} fg={fg} />;
};

const PRIORITY = {
  low: ['#f1f5f9', '#475569'],
  normal: ['#dbeafe', '#1e40af'],
  high: ['#ffedd5', '#9a3412'],
  urgent: ['#fee2e2', '#991b1b'],
};

/** @param {{priority:string}} props */
export const MemoPriorityBadge = ({ priority }) => {
  const [bg, fg] = PRIORITY[priority] || PRIORITY.normal;
  const label = (priority || 'normal').charAt(0).toUpperCase() + (priority || 'normal').slice(1);
  return <Pill label={label} bg={bg} fg={fg} />;
};

const TYPE = {
  general: ['#f1f5f9', '#334155'],
  hr: ['#ede9fe', '#5b21b6'],
  financial: ['#d1fae5', '#065f46'],
  internal: ['#dbeafe', '#1e40af'],
  external: ['#ccfbf1', '#115e59'],
};

/** @param {{memo_type:string}} props */
export const MemoTypeBadge = ({ memo_type }) => {
  const [bg, fg] = TYPE[memo_type] || TYPE.general;
  const label = (memo_type || 'general').toUpperCase();
  return <Pill label={label} bg={bg} fg={fg} />;
};
