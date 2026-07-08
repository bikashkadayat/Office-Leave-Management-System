import api from './api';

const list = (res) => (Array.isArray(res.data) ? res.data : (res.data?.results ?? []));

/** Report catalog used by the hub cards and the builder forms. */
export const REPORT_TYPES = [
  { key: 'employee_register', name: 'Employee Leave Register', desc: 'Full register: summary, per-day detail and adjustments.', formats: ['excel'], fields: ['year', 'department'] },
  { key: 'monthly_attendance', name: 'Monthly Attendance', desc: 'Working days, leave days and attendance %, grouped by department.', formats: ['excel', 'pdf'], fields: ['year', 'month', 'department'] },
  { key: 'leave_utilization', name: 'Leave Utilization', desc: 'Usage by type, department and month with trend analysis.', formats: ['pdf'], fields: ['year', 'department'] },
  { key: 'compliance', name: 'Compliance Report', desc: 'High usage, unusual patterns and document-required leaves.', formats: ['pdf'], fields: ['year'] },
  { key: 'audit_trail', name: 'Audit Trail', desc: 'Filterable AuditLog export for HR / regulatory audits.', formats: ['excel'], fields: ['date_from', 'date_to', 'action'] },
];

export const reportTypeByKey = (key) => REPORT_TYPES.find((r) => r.key === key);

export const reportService = {
  listReports: async (mine = true) => list(await api.get('/reports/', { params: mine ? { mine: 1 } : {} })),
  requestReport: async (reportType, params) => (await api.post('/reports/request/', { report_type: reportType, params })).data,
  getStatus: async (id) => (await api.get(`/reports/${id}/status/`)).data,
  download: async (id) => api.get(`/reports/${id}/download/`, { responseType: 'blob' }),
  getAnalytics: async (year) => (await api.get('/reports/analytics/', { params: { year } })).data,
};

/** Trigger a browser download from a blob axios response. */
export const saveBlob = (response, fallbackName = 'report') => {
  const disposition = response.headers?.['content-disposition'] || '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const name = match ? match[1] : fallbackName;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export default reportService;
