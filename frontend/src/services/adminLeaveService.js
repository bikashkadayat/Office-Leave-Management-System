import api from './api';

/**
 * Phase 7 - HR/Admin leave-management service. All routes under
 * /api/v1/leaves/admin/* (admin-only) plus the Level 1 /admin/leaves list.
 */
const list = (res) => (Array.isArray(res.data) ? res.data : (res.data?.results ?? []));

export const adminLeaveService = {
  // Employees
  getEmployees: async (params = {}) => (await api.get('/leaves/admin/employees/', { params })).data,
  getEmployee: async (id, year) => (await api.get(`/leaves/admin/employees/${id}/`, { params: { year } })).data,
  adjustBalance: async (id, payload) => (await api.post(`/leaves/admin/employees/${id}/adjust-balance/`, payload)).data,

  // Policies
  getPolicies: async (params = {}) => list(await api.get('/leaves/admin/policies/', { params })),
  createPolicy: async (payload) => (await api.post('/leaves/admin/policies/', payload)).data,
  updatePolicy: async (id, payload) => (await api.patch(`/leaves/admin/policies/${id}/`, payload)).data,
  deprecatePolicy: async (id) => (await api.delete(`/leaves/admin/policies/${id}/`)).data,

  // Holidays
  getHolidays: async (year) => list(await api.get('/leaves/admin/holidays/', { params: { year } })),
  createHoliday: async (payload) => (await api.post('/leaves/admin/holidays/', payload)).data,
  updateHoliday: async (id, payload) => (await api.patch(`/leaves/admin/holidays/${id}/`, payload)).data,
  deleteHoliday: async (id) => { await api.delete(`/leaves/admin/holidays/${id}/`); },
  bulkImportHolidays: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return (await api.post('/leaves/admin/holidays/bulk-import/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },

  // Departments
  getDepartments: async () => list(await api.get('/leaves/admin/departments/')),
  createDepartment: async (payload) => (await api.post('/leaves/admin/departments/', payload)).data,
  updateDepartment: async (id, payload) => (await api.patch(`/leaves/admin/departments/${id}/`, payload)).data,
  deleteDepartment: async (id) => { await api.delete(`/leaves/admin/departments/${id}/`); },

  // Leave types
  getLeaveTypes: async () => list(await api.get('/leaves/admin/leave-types/')),
  createLeaveType: async (payload) => (await api.post('/leaves/admin/leave-types/', payload)).data,
  updateLeaveType: async (id, payload) => (await api.patch(`/leaves/admin/leave-types/${id}/`, payload)).data,

  // Bulk actions on leave applications
  getPendingLeaves: async (params = {}) => list(await api.get('/admin/leaves/', { params: { status: 'pending', ...params } })),
  bulkLeaveAction: async (payload) => (await api.post('/leaves/admin/leaves/bulk-action/', payload)).data,

  // Reports metadata + users (for dept-head selection)
  getReports: async () => (await api.get('/leaves/admin/reports/')).data,
  getUsers: async () => list(await api.get('/admin/users/')),
};

export default adminLeaveService;
