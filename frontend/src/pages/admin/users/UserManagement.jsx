import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userMgmtService } from '../../../services/userMgmtService';
import ConfirmModal from '../../../components/admin/ConfirmModal';
import Toast from '../../../components/admin/Toast';
import { Skeleton, EmptyState, ErrorState } from '../../../components/leave-records/States';

const ROLES = ['maker', 'checker', 'approver', 'admin'];
const emptyCreate = { full_name: '', email: '', role: 'maker', department: '', designation: '', phone: '', date_of_joining: '', password: '' };

const CreateUserModal = ({ busy, onClose, onSubmit }) => {
  const [form, setForm] = useState(emptyCreate);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.full_name.trim() && /.+@.+\..+/.test(form.email);
  const submit = () => {
    const [first, ...rest] = form.full_name.trim().split(' ');
    onSubmit({
      email: form.email, first_name: first, last_name: rest.join(' '),
      role: form.role, department: form.department || null, designation: form.designation || null,
      phone: form.phone || null, date_of_joining: form.date_of_joining || null,
      ...(form.password ? { password: form.password } : {}),
    });
  };
  return (
    <div className="lr-modal-overlay" role="dialog" aria-modal="true" aria-label="Create employee" onClick={onClose}>
      <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lr-modal-head"><h3>Create employee</h3><button type="button" className="lr-modal-close" aria-label="Close" onClick={onClose}>×</button></div>
        <label className="lr-field"><span>Full name</span><input value={form.full_name} onChange={set('full_name')} aria-label="Full name" /></label>
        <label className="lr-field"><span>Email</span><input type="email" value={form.email} onChange={set('email')} aria-label="Email" /></label>
        <label className="lr-field"><span>Role</span>
          <select value={form.role} onChange={set('role')} aria-label="Role">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
        </label>
        <label className="lr-field"><span>Department (code or name)</span><input value={form.department} onChange={set('department')} aria-label="Department" /></label>
        <label className="lr-field"><span>Designation</span><input value={form.designation} onChange={set('designation')} aria-label="Designation" /></label>
        <label className="lr-field"><span>Phone</span><input value={form.phone} onChange={set('phone')} aria-label="Phone" /></label>
        <label className="lr-field"><span>Date of joining</span><input type="date" value={form.date_of_joining} onChange={set('date_of_joining')} aria-label="Date of joining" /></label>
        <label className="lr-field"><span>Password (blank = auto-generate)</span><input value={form.password} onChange={set('password')} aria-label="Password" /></label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
          <button type="button" className="lr-btn lr-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="lr-btn lr-btn-primary" disabled={!valid || busy} onClick={submit}>Create</button>
        </div>
      </div>
    </div>
  );
};

const CredentialsModal = ({ email, password, onClose }) => (
  <div className="lr-modal-overlay" role="dialog" aria-modal="true" aria-label="Account credentials" onClick={onClose}>
    <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
      <div className="lr-modal-head"><h3>Account created</h3><button type="button" className="lr-modal-close" aria-label="Close" onClick={onClose}>×</button></div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Share these credentials with the employee. They must change the password on first login.</p>
      <dl className="lr-modal-grid">
        <div><dt>Email</dt><dd>{email}</dd></div>
        <div><dt>Temporary password</dt><dd><code>{password}</code></dd></div>
      </dl>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button type="button" className="lr-btn lr-btn-primary" onClick={onClose}>Done</button>
      </div>
    </div>
  </div>
);

const UserManagement = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [confirm, setConfirm] = useState(null); // {type,user}
  const [toast, setToast] = useState(null);

  const params = {};
  if (search) params.search = search;
  if (roleFilter) params.role = roleFilter;

  const { data: users = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-users-mgmt', search, roleFilter],
    queryFn: () => userMgmtService.list(params),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users-mgmt'] });

  const create = useMutation({
    mutationFn: (payload) => userMgmtService.create(payload),
    onSuccess: (u) => { invalidate(); setCreating(false); setCredentials({ email: u.email, password: u.generated_password }); },
    onError: (e) => setToast({ message: e?.response?.data?.email?.[0] || 'Create failed.', tone: 'error' }),
  });

  const doAction = useMutation({
    mutationFn: async ({ type, user, role }) => {
      if (type === 'reset') return userMgmtService.resetPassword(user.id);
      if (type === 'deactivate') return userMgmtService.deactivate(user.id);
      if (type === 'activate') return userMgmtService.activate(user.id);
      if (type === 'role') return userMgmtService.changeRole(user.id, role);
      return null;
    },
    onSuccess: (res, vars) => {
      invalidate();
      setConfirm(null);
      if (vars.type === 'reset') setCredentials({ email: vars.user.email, password: res.generated_password });
      else setToast({ message: 'Done.', tone: 'success' });
    },
    onError: (e) => setToast({ message: e?.response?.data?.detail || 'Action failed.', tone: 'error' }),
  });

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <div className="lr-page-head">
        <div><h2>User Management</h2><div className="lr-page-sub">Create and manage employee accounts</div></div>
        <button type="button" className="lr-btn lr-btn-primary" onClick={() => setCreating(true)}>Create employee</button>
      </div>

      <div className="lr-filter-bar">
        <input type="search" placeholder="Search name / email / employee id" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
          <option value="">All roles</option>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {isLoading && <Skeleton rows={4} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {!isLoading && !isError && users.length === 0 && <EmptyState message="No users match." ctaLabel="Create employee" ctaTo={undefined} />}

      {!isLoading && !isError && users.length > 0 && (
        <div className="lr-table-wrap">
          <table className="lr-table">
            <thead><tr><th scope="col">Employee</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><div style={{ fontWeight: 600 }}>{u.full_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.employee_id || '—'}</div></td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} aria-label={`Role for ${u.email}`} onChange={(e) => setConfirm({ type: 'role', user: u, role: e.target.value })}
                      style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: 12, textTransform: 'capitalize' }}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>{u.is_active ? 'Active' : 'Inactive'}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="lr-btn lr-btn-ghost" onClick={() => setConfirm({ type: 'reset', user: u })}>Reset PW</button>
                    {u.is_active
                      ? <button type="button" className="lr-btn lr-btn-ghost" onClick={() => setConfirm({ type: 'deactivate', user: u })}>Deactivate</button>
                      : <button type="button" className="lr-btn lr-btn-ghost" onClick={() => setConfirm({ type: 'activate', user: u })}>Activate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateUserModal busy={create.isPending} onClose={() => setCreating(false)} onSubmit={(p) => create.mutate(p)} />}
      {credentials && <CredentialsModal {...credentials} onClose={() => setCredentials(null)} />}

      {confirm && (
        <ConfirmModal
          title={{
            reset: 'Reset password', deactivate: 'Deactivate user', activate: 'Activate user', role: 'Change role',
          }[confirm.type]}
          message={{
            reset: `Generate a new temporary password for ${confirm.user.email}? They must change it on next login.`,
            deactivate: `Deactivate ${confirm.user.email}? They will be blocked at login.`,
            activate: `Reactivate ${confirm.user.email}?`,
            role: `Change ${confirm.user.email}'s role to "${confirm.role}"?`,
          }[confirm.type]}
          danger={confirm.type === 'deactivate'}
          confirmLabel="Confirm"
          busy={doAction.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() => doAction.mutate(confirm)}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default UserManagement;
