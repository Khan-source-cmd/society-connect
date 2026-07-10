import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, dashboardAPI } from '../services/apiService';

// Create the Auth Context
const AuthContext = createContext();

// Custom hook to use the Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  // Check if user is authenticated on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('userRole');
      const userEmail = localStorage.getItem('userEmail');

      if (token && userRole && userEmail) {
        try {
          // Verify token is still valid by fetching profile
          const profileResponse = await authAPI.getProfile();
          if (profileResponse.success) {
            // Handle both possible response formats
            const userData = profileResponse.data.data?.user || profileResponse.data.user;
            setUser({
              ...userData,
              role: userRole,
              email: userEmail
            });
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userEmail');
          }
        } catch (err) {
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userEmail');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.login(credentials);
      
      if (response.success) {
        // Get user data from response - apiService already returns response.data
        const userData = response.data.user;
        setUser({
          ...userData,
          role: userData.role,
          email: userData.email
        });
        
        // Fetch dashboard data based on role
        await fetchDashboardData(userData.role);
        
        return { success: true, message: response.data.message };
      } else {
        setError(response.message);
        return { success: false, message: response.message };
      }
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.register(userData);
      
      if (response.success) {
        // Note: For OTP-based registration, user is not logged in immediately
        // The user must verify OTP first before logging in
        // So we don't set the user here or fetch dashboard data
        
        return { success: true, message: response.data.message || 'Registration successful! Please verify your email.' };
      } else {
        setError(response.message);
        return { success: false, message: response.message };
      }
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await authAPI.logout();
      setUser(null);
      setDashboardData(null);
      return { success: true, message: 'Logout successful' };
    } catch (err) {
      const errorMessage = err.message || 'Logout failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard data based on user role
  const fetchDashboardData = async (role) => {
    try {
      let response;
      
      switch (role) {
        case 'admin':
          response = await dashboardAPI.getAdminDashboard();
          break;
        case 'resident':
          response = await dashboardAPI.getResidentDashboard();
          break;
        case 'security':
          response = await dashboardAPI.getSecurityDashboard();
          break;
        default:
          return;
      }
      
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      // Don't set error for dashboard fetch failures, just log them
    }
  };

  // Refresh dashboard data
  const refreshDashboardData = async () => {
    if (user && user.role) {
      await fetchDashboardData(user.role);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Context value
  const contextValue = {
    user,
    loading,
    error,
    dashboardData,
    isAuthenticated,
    login,
    register,
    logout,
    refreshDashboardData,
    setError // Allow clearing errors from components
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;