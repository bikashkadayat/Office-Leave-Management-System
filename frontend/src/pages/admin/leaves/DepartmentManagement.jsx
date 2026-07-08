import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminLeaveService } from '../../../services/adminLeaveService';
import ConfirmModal from '../../../components/admin/ConfirmModal';
import Toast from '../../../components/admin/Toast';
import { Skeleton, EmptyState, ErrorState } from '../../../components/leave-records/States';

const empty = { name: '', code: '', head: '', parent: '', is_active: true };

const DeptForm = ({ initial, departments, users, busy, onClose, onSubmit }) => {
  const [form, setForm] = useState(initial || empty);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="lr-modal-overlay" role="dialog" aria-modal="true" aria-label="Department" onClick={onClose}>
      <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lr-modal-head"><h3>{initial ? 'Edit' : 'New'} department</h3><button type="button" className="lr-modal-close" aria-label="Close" onClick={onClose}>×</button></div>
        <label className="lr-field"><span>Name</span><input type="text" value={form.name} onChange={set('name')} aria-label="Name" /></label>
        <label className="lr-field"><span>Code</span><input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} aria-label="Code" /></label>
        <label className="lr-field"><span>Head</span>
          <select value={form.head || ''} onChange={set('head')} aria-label="Department head">
            <option value="">None</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
        </label>
        <label className="lr-field"><span>Parent department</span>
          <select value={form.parent || ''} onChange={set('parent')} aria-label="Parent department">
            <option value="">None (top-level)</option>
            {departments.filter((d) => d.id !== form.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" className="lr-btn lr-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="lr-btn lr-btn-primary" disabled={!form.name || !form.code || busy} onClick={() => onSubmit(form)}>Save</button>
        </div>
      </div>
    </div>
  );
};

/** Recursive tree node. */
const DeptNode = ({ dept, childrenOf, depth, onEdit, onDelete }) => (
  <>
    <tr>
      <td style={{ paddingLeft: 16 + depth * 24 }}>
        {depth > 0 && <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>└ </span>}
        {dept.name} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({dept.code})</span>
      </td>
      <td>{dept.head_name || '—'}</td>
      <td>{dept.member_count}</td>
      <td style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="lr-btn lr-btn-ghost" onClick={() => onEdit(dept)}>Edit</button>
        <button type="button" className="lr-btn lr-btn-ghost" onClick={() => onDelete(dept)}>Delete</button>
      </td>
    </tr>
    {(childrenOf[dept.id] || []).map((c) => (
      <DeptNode key={c.id} dept={c} childrenOf={childrenOf} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
    ))}
  </>
);

const DepartmentManagement = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  const { data: departments = [], isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin-departments'], queryFn: adminLeaveService.getDepartments });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: adminLeaveService.getUsers });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-departments'] });
  const clean = (form) => ({ ...form, head: form.head || null, parent: form.parent || null });

  const save = useMutation({
    mutationFn: (form) => (editing?.id ? adminLeaveService.updateDepartment(editing.id, clean(form)) : adminLeaveService.createDepartment(clean(form))),
    onSuccess: () => { invalidate(); setToast({ message: 'Department saved.', tone: 'success' }); setEditing(null); },
    onError: () => setToast({ message: 'Save failed (duplicate code?).', tone: 'error' }),
  });
  const del = useMutation({ mutationFn: (id) => adminLeaveService.deleteDepartment(id), onSuccess: () => { invalidate(); setToast({ message: 'Department deleted.', tone: 'success' }); setDeleting(null); } });

  const roots = departments.filter((d) => !d.parent);
  const childrenOf = departments.reduce((acc, d) => { if (d.parent) (acc[d.parent] = acc[d.parent] || []).push(d); return acc; }, {});

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <div className="lr-page-head">
        <div><h2>Departments</h2><div className="lr-page-sub">Reporting hierarchy and department heads</div></div>
        <button type="button" className="lr-btn lr-btn-primary" onClick={() => setEditing({})}>New department</button>
      </div>

      {isLoading && <Skeleton rows={3} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {!isLoading && !isError && departments.length === 0 && <EmptyState message="No departments yet." ctaLabel="Add one" ctaTo={undefined} />}

      {!isLoading && !isError && departments.length > 0 && (
        <div className="lr-table-wrap">
          <table className="lr-table">
            <thead><tr><th scope="col">Department</th><th scope="col">Head</th><th scope="col">Members</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {roots.map((d) => <DeptNode key={d.id} dept={d} childrenOf={childrenOf} depth={0} onEdit={setEditing} onDelete={setDeleting} />)}
            </tbody>
          </table>
        </div>
      )}

      {editing && <DeptForm initial={editing.id ? editing : null} departments={departments} users={users} busy={save.isPending} onClose={() => setEditing(null)} onSubmit={(f) => save.mutate(f)} />}
      {deleting && (
        <ConfirmModal title="Delete department" danger confirmWord="DELETE" confirmLabel="Delete" busy={del.isPending}
          message={`Delete "${deleting.name}"? Members will be detached (set to no department).`}
          onClose={() => setDeleting(null)} onConfirm={() => del.mutate(deleting.id)} />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default DepartmentManagement;
