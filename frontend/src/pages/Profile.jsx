import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, User, Mail, Shield, Calendar } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const roleLabels = {
    maker: 'Maker',
    checker: 'Checker',
    approver: 'Approver',
    admin: 'Administrator'
  };

  const roleDescriptions = {
    maker: 'Can apply for leave and track applications',
    checker: 'Can review pending leave applications',
    approver: 'Can approve or reject leave applications',
    admin: 'Full access to all features and settings'
  };

  return (
    <div className="page">
      <div className="pg-head">
        <div className="pg-head-left">
          <div className="pg-breadcrumb">
            <button className="pg-back" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
            </button>
            User Profile
          </div>
          <div className="pg-title">My Profile</div>
          <div className="pg-desc">View your account information</div>
        </div>
        <div className="pg-head-right">
          <div className="pg-logo">
            <img src="/NIF.png" alt="NIF Logo" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Profile Card */}
        <div className="table-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: user?.color || '#6B7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: '700',
              color: 'white'
            }}>
              {user?.initials || 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {user?.full_name || user?.name || 'User'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge" style={{ 
                  background: user?.color || '#6B7280',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {roleLabels[role] || role}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--brand-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} color="white" />
                </div>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Personal Information</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '48px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Full Name</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>{user?.full_name || user?.name || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Username</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>{user?.username || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={18} color="white" />
                </div>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Contact Details</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '48px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Email Address</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>{user?.email || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={18} color="white" />
                </div>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Role & Permissions</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '48px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Role</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>{roleLabels[role] || role}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Description</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{roleDescriptions[role] || 'User role'}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--draft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} color="white" />
                </div>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Account Info</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '48px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Account Status</div>
                  <div style={{ fontSize: '14px', color: 'var(--success)', fontWeight: '500' }}>Active</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Login Type</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Email & Password</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;