import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { memoService } from '../../services/memoService';

/**
 * Dropdown to pick a checker/approver, with an optional "Auto-assign" choice.
 * Fetches the active users once and filters client-side (lists are small).
 *
 * @param {{ role:'checker'|'approver', value:string, onChange:(id:string)=>void,
 *           allowAuto?:boolean }} props  value '' means auto-assign.
 */
const UserSelector = ({ role, value, onChange, allowAuto = true }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['memo-assignees', role],
    queryFn: () => (role === 'approver' ? memoService.getAvailableApprovers() : memoService.getAvailableCheckers()),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [users, search]);

  const selected = users.find((u) => String(u.id) === String(value));
  const label = value ? (selected ? `${selected.full_name} (${selected.email})` : 'Selected user')
    : (allowAuto ? 'Auto-assign by department' : 'Select…');

  const pick = (id) => { onChange(id); setOpen(false); setSearch(''); };

  return (
    <div className="lr-userselect">
      <button type="button" className="lr-userselect-trigger" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="lr-userselect-menu" role="listbox">
          <input autoFocus type="search" placeholder={`Search ${role}s…`} value={search}
            onChange={(e) => setSearch(e.target.value)} aria-label={`Search ${role}s`} className="lr-userselect-search" />
          {allowAuto && (
            <button type="button" role="option" aria-selected={!value} className={`lr-userselect-opt ${!value ? 'on' : ''}`} onClick={() => pick('')}>
              <b>Auto-assign by department</b>
            </button>
          )}
          {isLoading && <div className="lr-userselect-empty">Loading…</div>}
          {!isLoading && filtered.length === 0 && <div className="lr-userselect-empty">No active {role}s found.</div>}
          {filtered.map((u) => (
            <button key={u.id} type="button" role="option" aria-selected={String(u.id) === String(value)}
              className={`lr-userselect-opt ${String(u.id) === String(value) ? 'on' : ''}`} onClick={() => pick(String(u.id))}>
              <div>{u.full_name}</div>
              <div className="lr-userselect-sub">{u.email}{u.department ? ` · ${u.department}` : ''}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSelector;
