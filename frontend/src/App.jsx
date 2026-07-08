import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import RoleLanding from './pages/RoleLanding';
import Profile from './pages/Profile';
import RequireAuth from './components/common/RequireAuth';

// Leave Pages
import LeaveDashboard from './pages/leave/Dashboard';
import ApplyLeave from './pages/leave/ApplyLeave';
import MyApplications from './pages/leave/MyApplications';
import PendingApprovals from './pages/leave/PendingApprovals';
import TeamCalendar from './pages/leave/TeamCalendar';

// Phase 6 - Enterprise Leave Records pages
import MyLeaveHistory from './pages/leave/records/MyLeaveHistory';
import MyLeaveCalendar from './pages/leave/records/MyLeaveCalendar';
import WeeklyReport from './pages/leave/records/WeeklyReport';
import MonthlyReport from './pages/leave/records/MonthlyReport';
import TeamAttendance from './pages/leave/records/TeamAttendance';

// Phase 7 - HR/Admin pages
import EmployeeList from './pages/admin/leaves/EmployeeList';
import EmployeeDetail from './pages/admin/leaves/EmployeeDetail';
import PolicyManagement from './pages/admin/leaves/PolicyManagement';
import HolidayManagement from './pages/admin/leaves/HolidayManagement';
import DepartmentManagement from './pages/admin/leaves/DepartmentManagement';
import LeaveTypeManagement from './pages/admin/leaves/LeaveTypeManagement';
import BulkActions from './pages/admin/leaves/BulkActions';

// Phase 8 - Reports & Analytics
import ReportsHub from './pages/reports/ReportsHub';
import ReportBuilder from './pages/reports/ReportBuilder';
import ReportHistory from './pages/reports/ReportHistory';
import Analytics from './pages/admin/Analytics';

// Phase 9 - Notifications
import NotificationsPage from './pages/NotificationsPage';

// Phase 2.5 - Auth / User Management
import FirstLoginPasswordChange from './pages/FirstLoginPasswordChange';
import Unauthorized from './pages/Unauthorized';
import UserManagement from './pages/admin/users/UserManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* First-login password change: protected but standalone (no chrome). */}
        <Route path="/auth/first-login-change-password" element={<RequireAuth><FirstLoginPasswordChange /></RequireAuth>} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<RoleLanding />} />
          <Route path="unauthorized" element={<Unauthorized />} />
          <Route path="admin/users" element={<RequireAuth allowedRoles={['admin']}><UserManagement /></RequireAuth>} />
          <Route path="profile" element={<Profile />} />
          <Route path="leave" element={<LeaveDashboard />} />
          <Route path="leave/apply" element={<ApplyLeave />} />
          <Route path="leave/my-applications" element={<MyApplications />} />
          <Route path="leave/pending" element={<PendingApprovals />} />
          <Route path="leave/calendar" element={<TeamCalendar />} />

          {/* Phase 6 - Enterprise Leave Records */}
          <Route path="leaves/my-history" element={<MyLeaveHistory />} />
          <Route path="leaves/my-calendar" element={<MyLeaveCalendar />} />
          <Route path="leaves/weekly-report" element={<WeeklyReport />} />
          <Route path="leaves/monthly-report" element={<MonthlyReport />} />
          <Route path="leaves/team-attendance" element={<TeamAttendance />} />

          {/* Phase 7 - HR/Admin */}
          <Route path="admin/leaves/employees" element={<EmployeeList />} />
          <Route path="admin/leaves/employees/:id" element={<EmployeeDetail />} />
          <Route path="admin/leaves/policies" element={<PolicyManagement />} />
          <Route path="admin/leaves/holidays" element={<HolidayManagement />} />
          <Route path="admin/leaves/departments" element={<DepartmentManagement />} />
          <Route path="admin/leaves/leave-types" element={<LeaveTypeManagement />} />
          <Route path="admin/leaves/bulk-actions" element={<BulkActions />} />

          {/* Phase 8 - Reports & Analytics */}
          <Route path="reports" element={<ReportsHub />} />
          <Route path="reports/build/:type" element={<ReportBuilder />} />
          <Route path="reports/history" element={<ReportHistory />} />
          <Route path="admin/analytics" element={<Analytics />} />

          {/* Phase 9 - Notifications */}
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
