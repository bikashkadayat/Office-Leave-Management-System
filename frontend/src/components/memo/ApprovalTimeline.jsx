import React from 'react';
import { CheckCircle, XCircle, Send, Eye, CornerUpLeft, Slash, MessageSquare } from 'lucide-react';

const ACTION = {
  submitted: { label: 'Submitted', color: '#2563EB', Icon: Send },
  reviewed: { label: 'Reviewed', color: '#F59E0B', Icon: Eye },
  approved: { label: 'Approved', color: '#10B981', Icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#EF4444', Icon: XCircle },
  returned: { label: 'Returned', color: '#6366F1', Icon: CornerUpLeft },
  cancelled: { label: 'Cancelled', color: '#6B7280', Icon: Slash },
  commented: { label: 'Commented', color: '#6B7280', Icon: MessageSquare },
};

const relativeTime = (iso) => {
  const then = new Date(iso).getTime();
  const diff = Math.round((Date.now() - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const initials = (name) => (name || '?').split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase();

/** @param {{ steps: Object[] }} props ordered MemoApprovalStep list */
const ApprovalTimeline = ({ steps = [] }) => {
  if (!steps.length) {
    return <p className="lr-page-sub">No workflow activity yet.</p>;
  }
  return (
    <ol className="lr-timeline" aria-label="Approval trail">
      {steps.map((s) => {
        const meta = ACTION[s.action] || ACTION.commented;
        const actorName = s.actor?.full_name || 'System';
        const Icon = meta.Icon;
        return (
          <li key={s.id} className="lr-timeline-item" style={{ '--tl-color': meta.color }}>
            <span className="lr-timeline-dot" style={{ background: meta.color }}><Icon size={13} color="#fff" /></span>
            <div className="lr-timeline-body">
              <div className="lr-timeline-head">
                <span className="lr-timeline-avatar" aria-hidden="true">{initials(actorName)}</span>
                <b>{actorName}</b>
                <span className="lr-timeline-action" style={{ color: meta.color }}>{meta.label}</span>
                <time className="lr-timeline-time" title={new Date(s.acted_at).toLocaleString()}>{relativeTime(s.acted_at)}</time>
              </div>
              {s.comment && <div className="lr-timeline-comment">“{s.comment}”</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default ApprovalTimeline;
