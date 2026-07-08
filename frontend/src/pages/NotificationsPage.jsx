import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Trash2 } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { Skeleton, EmptyState, ErrorState } from '../components/leave-records/States';

const CATEGORIES = [
  ['', 'All'],
  ['MEMO_ASSIGNED_TO_REVIEW', 'Memo review'],
  ['MEMO_APPROVED', 'Memo approved'],
  ['MEMO_REJECTED', 'Memo rejected'],
  ['MEMO_RETURNED', 'Memo returned'],
  ['LEAVE_SUBMITTED', 'Leave submitted'],
  ['LEAVE_APPROVED', 'Leave approved'],
  ['LEAVE_REJECTED', 'Leave rejected'],
  ['LEAVE_BALANCE_LOW', 'Balance low'],
  ['POLICY_UPDATED', 'Policy updated'],
  ['SYSTEM_ANNOUNCEMENT', 'Announcement'],
];

const PreferencesPanel = () => {
  const qc = useQueryClient();
  const { data: prefs = [], isLoading } = useQuery({ queryKey: ['notif-prefs'], queryFn: notificationService.getPreferences });
  const save = useMutation({
    mutationFn: (payload) => notificationService.setPreference(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-prefs'] }),
  });

  const toggle = (pref, key) => save.mutate({ ...pref, [key]: !pref[key] });

  if (isLoading) return <Skeleton rows={2} />;
  return (
    <div className="lr-table-wrap">
      <table className="lr-table">
        <thead><tr><th scope="col">Category</th><th scope="col">In-app</th><th scope="col">Email</th></tr></thead>
        <tbody>
          {prefs.map((p) => (
            <tr key={p.category}>
              <td>{p.category_label}</td>
              <td><input type="checkbox" checked={p.in_app_enabled} onChange={() => toggle(p, 'in_app_enabled')} aria-label={`In-app ${p.category_label}`} /></td>
              <td><input type="checkbox" checked={p.email_enabled} onChange={() => toggle(p, 'email_enabled')} aria-label={`Email ${p.category_label}`} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [category, setCategory] = useState('');
  const [tab, setTab] = useState('inbox');

  const { data: items = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications', category],
    queryFn: () => notificationService.list(category ? { category } : {}),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notif-unread'] });
  };
  const markRead = useMutation({ mutationFn: (id) => notificationService.markRead(id), onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: () => notificationService.markAllRead(), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id) => notificationService.remove(id), onSuccess: invalidate });

  const openItem = (n) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.action_url) navigate(n.action_url);
  };

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <div className="lr-page-head">
        <div><h2>Notifications</h2><div className="lr-page-sub">Your alerts for memos, leaves and system events</div></div>
        {tab === 'inbox' && <button type="button" className="lr-btn lr-btn-ghost" onClick={() => markAll.mutate()}><Check size={14} /> Mark all read</button>}
      </div>

      <div className="lr-tabs" style={{ marginBottom: 16 }}>
        <button type="button" role="tab" aria-selected={tab === 'inbox'} className={`lr-tab ${tab === 'inbox' ? 'on' : ''}`} onClick={() => setTab('inbox')}>Inbox</button>
        <button type="button" role="tab" aria-selected={tab === 'prefs'} className={`lr-tab ${tab === 'prefs' ? 'on' : ''}`} onClick={() => setTab('prefs')}>Preferences</button>
      </div>

      {tab === 'prefs' ? <PreferencesPanel /> : (
        <>
          <div className="lr-filter-bar">
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
              {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {isLoading && <Skeleton rows={4} />}
          {isError && <ErrorState error={error} onRetry={refetch} />}
          {!isLoading && !isError && items.length === 0 && <EmptyState message="No notifications." ctaTo={undefined} />}

          {!isLoading && !isError && items.length > 0 && (
            <div className="lr-notif-list">
              {items.map((n) => (
                <div key={n.id} className={`lr-notif-row ${n.is_read ? '' : 'unread'}`}>
                  <button type="button" className="lr-notif-main" onClick={() => openItem(n)}>
                    <div className="lr-notif-cat">{n.category_label}</div>
                    <div className="lr-notif-title">{n.title}</div>
                    {n.body && <div className="lr-notif-body">{n.body}</div>}
                    <div className="lr-notif-time">{new Date(n.created_at).toLocaleString()}</div>
                  </button>
                  <div className="lr-notif-actions">
                    {!n.is_read && <button type="button" className="lr-btn lr-btn-ghost" onClick={() => markRead.mutate(n.id)} aria-label="Mark read"><Check size={14} /></button>}
                    <button type="button" className="lr-btn lr-btn-ghost" onClick={() => remove.mutate(n.id)} aria-label="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;
