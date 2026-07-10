import React, { ReactElement, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Landing from './pages/Landing';
import { AdminHome, ResidentHome, SecurityHome } from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import ResidentManagement from './pages/ResidentManagement';
import MaintenanceTracker from './pages/MaintenanceTracker';
import NoticeBoard from './pages/NoticeBoard';
import Complaints from './pages/Complaints';
import Security from './pages/Security';
import Settings from './pages/Settings';
import FlatManagement from './pages/FlatManagement';
import TenantManagement from './pages/TenantManagement';
import OwnershipTransfers from './pages/OwnershipTransfers';
import WorkOrders from './pages/WorkOrders';
import VendorManagement from './pages/VendorManagement';
import ComplianceManager from './pages/ComplianceManager';
import FinancialReports from './pages/FinancialReports';
import AmenityBooking from './pages/AmenityBooking';
import CalendarView from './pages/CalendarView';

// Protected Route Component
interface ProtectedRouteProps {
  children: ReactElement;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const userRole = localStorage.getItem('userRole');
  
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Role-based Home Component
const Home: React.FC = () => {
  const { user } = useAuth();
  const userRole = user?.role || localStorage.getItem('userRole');

  // If no user is logged in, redirect to login page
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // Render appropriate dashboard based on user role
  switch (userRole) {
    case 'admin':
      return <AdminHome />;
    case 'resident':
      return <ResidentHome user={user} />;
    case 'security':
      return <SecurityHome />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['resident', 'security']}>
                <Navigate to="/home" replace />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resident-management" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ResidentManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/maintenance-tracker" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'resident']}>
                <MaintenanceTracker />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notice-board" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'resident', 'security']}>
                <NoticeBoard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/complaints" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'resident']}>
                <Complaints />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/security" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'security']}>
                <Security />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'resident', 'security']}>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/flat-management" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <FlatManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tenant-management" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TenantManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ownership-transfers" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <OwnershipTransfers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/work-orders" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <WorkOrders />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendors" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <VendorManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/compliance" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ComplianceManager />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/financial-reports" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <FinancialReports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/amenities" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'resident']}>
                <AmenityBooking />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/calendar" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'resident', 'security']}>
                <CalendarView />
              </ProtectedRoute>
            } 
          />
          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;