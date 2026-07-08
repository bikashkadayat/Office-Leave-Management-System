import api from './api';

// Public self-registration removed in Phase 2.5. Accounts are created by an
// administrator via User Management.
export const authService = {
  login: async (email, password) => {
    return await api.post('/auth/login/', { email, password });
  },

  me: async () => {
    return await api.get('/auth/user/');
  },

  changePassword: async (currentPassword, newPassword) => {
    return await api.post('/auth/change-password/', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
