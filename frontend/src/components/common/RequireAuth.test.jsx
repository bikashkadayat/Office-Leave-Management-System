import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../../hooks/useAuth';
import RequireAuth from './RequireAuth';

const Protected = () => <div>PROTECTED</div>;

const renderAt = (path, element) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login" element={<div>LOGIN</div>} />
      <Route path="/auth/first-login-change-password" element={<div>CHANGE PW</div>} />
      <Route path="/unauthorized" element={<div>NO ACCESS</div>} />
      <Route path="/admin" element={element} />
    </Routes>
  </MemoryRouter>,
);

describe('RequireAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects unauthenticated users to /login', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    renderAt('/admin', <RequireAuth><Protected /></RequireAuth>);
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('forces first-login password change', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, mustChangePassword: true, role: 'maker', loading: false });
    renderAt('/admin', <RequireAuth><Protected /></RequireAuth>);
    expect(screen.getByText('CHANGE PW')).toBeInTheDocument();
  });

  it('blocks a role that is not allowed', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, mustChangePassword: false, role: 'maker', loading: false });
    renderAt('/admin', <RequireAuth allowedRoles={['admin']}><Protected /></RequireAuth>);
    expect(screen.getByText('NO ACCESS')).toBeInTheDocument();
  });

  it('renders children for an authorized user', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, mustChangePassword: false, role: 'admin', loading: false });
    renderAt('/admin', <RequireAuth allowedRoles={['admin']}><Protected /></RequireAuth>);
    expect(screen.getByText('PROTECTED')).toBeInTheDocument();
  });
});
