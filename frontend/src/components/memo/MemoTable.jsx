import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MemoStatusBadge, MemoPriorityBadge, MemoTypeBadge } from './badges';

/** Shared memo list table. @param {{items:Object[]}} props */
const MemoTable = ({ items }) => {
  const navigate = useNavigate();
  return (
    <div className="lr-table-wrap">
      <table className="lr-table">
        <thead>
          <tr>
            <th scope="col">Memo #</th><th scope="col">Title</th><th scope="col">Type</th>
            <th scope="col">Priority</th><th scope="col">Status</th>
            <th scope="col">Created by</th><th scope="col">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id} className="lr-month-row" tabIndex={0}
              onClick={() => navigate(`/memos/${m.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/memos/${m.id}`); }}>
              <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{m.memo_number}</td>
              <td>{m.title}</td>
              <td><MemoTypeBadge memo_type={m.memo_type} /></td>
              <td><MemoPriorityBadge priority={m.priority} /></td>
              <td><MemoStatusBadge status={m.status} /></td>
              <td>{m.created_by?.full_name || '—'}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MemoTable;
