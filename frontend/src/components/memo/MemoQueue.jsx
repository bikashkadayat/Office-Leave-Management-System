import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { memoService } from '../../services/memoService';
import { MemoPriorityBadge } from './badges';
import ConfirmModal from '../admin/ConfirmModal';
import Toast from '../admin/Toast';
import { Skeleton, EmptyState, ErrorState } from '../leave-records/States';

/**
 * Shared pending queue for checker (mode="review") and approver (mode="approve").
 * @param {{mode:'review'|'approve', title:string, subtitle:string}} props
 */
const MemoQueue = ({ mode, title, subtitle }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selected, setSelected] = useState(() => new Set());
  const [bulk, setBulk] = useState(null); // 'approve' | 'reject'
  const [toast, setToast] = useState(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['memos', 'queue', mode],
    queryFn: () => memoService.listMemos({}, 1),
    refetchInterval: 30000,
  });

  const queue = useMemo(() => {
    const uid = String(user?.id);
    return (data?.items ?? []).filter((m) => (
      mode === 'review'
        ? m.status === 'submitted' && String(m.current_reviewer?.id) === uid
        : m.status === 'under_review' && String(m.current_approver?.id) === uid
    ));
  }, [data, user, mode]);

  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const run = useMutation({
    mutationFn: async ({ action, comment }) => {
      const ids = [...selected];
      const results = await Promise.allSettled(ids.map((mid) => (
        action === 'approve' ? memoService.approveMemo(mid, { comment }) : memoService.rejectMemo(mid, { comment })
      )));
      return results;
    },
    onSuccess: (results) => {
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      setToast({ message: `${ok}/${results.length} ${bulk}d.`, tone: ok === results.length ? 'success' : 'error' });
      setSelected(new Set()); setBulk(null);
      qc.invalidateQueries({ queryKey: ['memos'] });
    },
    onError: () => setToast({ message: 'Bulk action failed.', tone: 'error' }),
  });

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <div className="lr-page-head">
        <div><h2>{title}</h2><div className="lr-page-sub">{subtitle} · auto-refreshes every 30s</div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          {mode === 'approve' && <button type="button" className="lr-btn lr-btn-primary" disabled={selected.size === 0} onClick={() => setBulk('approve')}>Approve ({selected.size})</button>}
          <button type="button" className="lr-btn lr-btn-danger" disabled={selected.size === 0} onClick={() => setBulk('reject')}>Reject ({selected.size})</button>
        </div>
      </div>

      {isLoading && <Skeleton rows={4} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {!isLoading && !isError && queue.length === 0 && <EmptyState message="Nothing pending your action." ctaTo={undefined} />}

      {!isLoading && !isError && queue.length > 0 && (
        <div className="lr-table-wrap">
          <table className="lr-table">
            <thead><tr>
              <th scope="col"><input type="checkbox" checked={selected.size === queue.length} onChange={() => setSelected(selected.size === queue.length ? new Set() : new Set(queue.map((m) => m.id)))} aria-label="Select all" /></th>
              <th scope="col">Memo #</th><th scope="col">Title</th><th scope="col">Priority</th><th scope="col">By</th><th scope="col">Action</th>
            </tr></thead>
            <tbody>
              {queue.map((m) => (
                <tr key={m.id}>
                  <td><input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} aria-label={`Select ${m.memo_number}`} /></td>
                  <td style={{ fontWeight: 600 }}>{m.memo_number}</td>
                  <td>{m.title}</td>
                  <td><MemoPriorityBadge priority={m.priority} /></td>
                  <td>{m.created_by?.full_name || '—'}</td>
                  <td><button type="button" className="lr-btn lr-btn-ghost" onClick={() => navigate(`/memos/${m.id}`)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bulk && (
        <ConfirmModal
          title={`${bulk === 'approve' ? 'Approve' : 'Reject'} ${selected.size} memo(s)`}
          impact={`This affects ${selected.size} memo(s).`}
          requireReason={bulk === 'reject'} danger={bulk === 'reject'}
          confirmLabel={bulk === 'approve' ? 'Approve all' : 'Reject all'} busy={run.isPending}
          onClose={() => setBulk(null)}
          onConfirm={(reason) => run.mutate({ action: bulk, comment: reason })}
        />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default MemoQueue;
