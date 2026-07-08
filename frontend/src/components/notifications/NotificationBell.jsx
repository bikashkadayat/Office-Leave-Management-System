import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

const NotificationBell = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Poll the unread count every 30s.
  const { data: unread = 0 } = useQuery({
    queryKey: ['notif-unread'],
    queryFn: notificationService.unreadCount,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: recent = [] } = useQuery({
    queryKey: ['notif-recent'],
    queryFn: () => notificationService.list({ page_size: 5 }),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-unread'] });
      qc.invalidateQueries({ queryKey: ['notif-recent'] });
    },
  });

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openItem = (n) => {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    if (n.action_url) navigate(n.action_url);
  };

  return (
    <div className="lr-bell" ref={ref}>
      <button
        type="button" className="lr-bell-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} />
        {unread > 0 && <span className="lr-bell-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="lr-bell-menu" role="menu" aria-label="Recent notifications">
          <div className="lr-bell-head">Notifications</div>
          {recent.length === 0 ? (
            <div className="lr-bell-empty">You're all caught up.</div>
          ) : recent.slice(0, 5).map((n) => (
            <button
              key={n.id} type="button" role="menuitem"
              className={`lr-bell-item ${n.is_read ? '' : 'unread'}`} onClick={() => openItem(n)}
            >
              <div className="lr-bell-title">{n.title}</div>
              {n.body && <div className="lr-bell-body">{n.body}</div>}
              <div className="lr-bell-time">{new Date(n.created_at).toLocaleString()}</div>
            </button>
          ))}
          <button type="button" className="lr-bell-all" onClick={() => { setOpen(false); navigate('/notifications'); }}>
            See all notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
