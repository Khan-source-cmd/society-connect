import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, maintenanceAPI } from '../services/apiService';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in by checking localStorage
    const userRole = localStorage.getItem('userRole');
    const userEmail = localStorage.getItem('userEmail');
    
    if (!userRole || !userEmail) {
      navigate('/login');
      return;
    }

    // Create a mock user object based on localStorage data
    const mockUser = {
      name: userEmail.split('@')[0], // Use email prefix as name
      email: userEmail,
      role: userRole,
      phone: userRole === 'admin' ? '+91 9876543210' : 
             userRole === 'resident' ? '+91 9876543211' : '+91 9876543212',
      unique_id: userRole === 'admin' ? 'ADM001' : 
                userRole === 'resident' ? 'RES001' : 'SEC001',
      created_at: new Date().toISOString(),
      wing: userRole === 'resident' ? 'A' : null,
      flat: userRole === 'resident' ? '101' : null
    };

    setUser(mockUser);

    // Fetch real data for residents
    if (userRole === 'resident') {
      fetchResidentData();
    }

    setLoading(false);
  }, [navigate]);

  const fetchResidentData = async () => {
    try {
      // Fetch resident dashboard data
      const dashboardResponse = await dashboardAPI.getResidentDashboard();
      if (dashboardResponse.success) {
        setDashboardData(dashboardResponse.data);
      }

      // Fetch payment history
      const paymentResponse = await maintenanceAPI.getMyBills();
      if (paymentResponse.success && paymentResponse.data.bills) {
        const bills = paymentResponse.data.bills;
        const monthlyData = {};
        
        bills.forEach(bill => {
          const date = new Date(bill.created_at || bill.bill_date);
          const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          if (!monthlyData[month]) {
            monthlyData[month] = 0;
          }
          monthlyData[month] += bill.amount;
        });

        const history = Object.entries(monthlyData).map(([month, amount]) => ({
          month,
          amount
        })).slice(-6); // Last 6 months

        setPaymentHistory(history);
      }
    } catch (error) {
      console.error('Error fetching resident data:', error);
      // Keep using mock data if API fails
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-teal-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="text-2xl mr-3">💠</div>
              <h1 className="text-xl font-semibold text-gray-900">SocietyConnect</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{user?.name}</span>
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {user?.role}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Role</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{user?.role}</p>
                  </div>
                  {user?.role === 'resident' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Wing</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.wing || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Flat</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.flat || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Member ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{user?.unique_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Member Since</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {user?.role === 'admin' ? 'Admin Panel' : 
                   user?.role === 'security' ? 'Security Dashboard' : 
                   'Resident Dashboard'}
                </h2>
                
                <div className="space-y-6">
                  {user?.role === 'admin' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-medium text-blue-900">Manage Users</h3>
                        <p className="text-sm text-blue-700 mt-1">View and manage all society members</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-medium text-green-900">Announcements</h3>
                        <p className="text-sm text-green-700 mt-1">Create and manage society announcements</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-medium text-purple-900">Reports</h3>
                        <p className="text-sm text-purple-700 mt-1">Generate reports and analytics</p>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-medium text-yellow-900">Settings</h3>
                        <p className="text-sm text-yellow-700 mt-1">Configure society settings</p>
                      </div>
                    </div>
                  )}

                  {user?.role === 'resident' && (
                    <div className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm opacity-90">My Pending Dues</p>
                              <p className="text-2xl font-bold mt-1">
                                ₹{dashboardData?.pendingPayments || 2500}
                              </p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs opacity-75 mt-2">Due by 15th</p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm opacity-90">My Active Complaints</p>
                              <p className="text-2xl font-bold mt-1">
                                {dashboardData?.totalComplaints || 3}
                              </p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs opacity-75 mt-2">
                            {dashboardData?.pendingComplaints || 2} pending, {dashboardData?.resolvedComplaints || 1} resolved
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm opacity-90">Latest Notice</p>
                              <p className="text-lg font-bold mt-1">Elevator Maintenance</p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs opacity-75 mt-2">Today, 10:30 AM</p>
                        </div>
                      </div>

                      {/* Chart Section */}
                      <div className="bg-white rounded-lg p-6 border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Payment History</h3>
                        <div className="h-64 flex items-end justify-around bg-gray-50 rounded-lg p-4">
                          {paymentHistory.length > 0 ? (
                            paymentHistory.map((data, index) => (
                              <div key={index} className="flex flex-col items-center space-y-2">
                                <div 
                                  className="w-12 bg-blue-500 rounded-t"
                                  style={{ height: `${Math.max(20, (data.amount / Math.max(...paymentHistory.map(p => p.amount))) * 100)}px` }}
                                ></div>
                                <span className="text-xs text-gray-600">{data.month}</span>
                              </div>
                            ))
                          ) : (
                            // Fallback to static chart if no data
                            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => (
                              <div key={index} className="flex flex-col items-center space-y-2">
                                <div className="w-12 bg-blue-500 h-20 rounded-t"></div>
                                <span className="text-xs text-gray-600">{month}</span>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-2 text-center">
                          {paymentHistory.length > 0 ? 'Last 6 months payment history' : 'No payment history available'}
                        </p>
                      </div>

                      {/* Quick Actions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="font-medium text-blue-900">Society Announcements</h3>
                          <p className="text-sm text-blue-700 mt-1">Stay updated with the latest society news and events</p>
                          <button className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                            View All Announcements →
                          </button>
                        </div>
                        
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h3 className="font-medium text-green-900">Maintenance Requests</h3>
                          <p className="text-sm text-green-700 mt-1">Submit and track maintenance requests for your flat</p>
                          <button className="mt-2 text-sm text-green-600 hover:text-green-800 font-medium">
                            Submit Request →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {user?.role === 'security' && (
                    <div className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm opacity-90">Visitors Inside Now</p>
                              <p className="text-3xl font-bold mt-1">12</p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs opacity-75 mt-2">Currently logged in</p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm opacity-90">Total Entries Today</p>
                              <p className="text-3xl font-bold mt-1">47</p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs opacity-75 mt-2">Since midnight</p>
                        </div>
                      </div>

                      {/* Main Section */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Recent Visitor Feed */}
                        <div className="lg:col-span-2 bg-white rounded-lg p-6 border">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Visitor Feed</h3>
                          <div className="space-y-4">
                            {[
                              { name: "John Smith", purpose: "Package Delivery", time: "2:30 PM", status: "Checked In" },
                              { name: "Sarah Johnson", purpose: "Guest Visit", time: "1:45 PM", status: "Checked Out" },
                              { name: "Mike Davis", purpose: "Maintenance", time: "12:15 PM", status: "Checked In" },
                              { name: "Lisa Wilson", purpose: "Meeting", time: "11:30 AM", status: "Checked Out" }
                            ].map((visitor, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                    {visitor.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{visitor.name}</p>
                                    <p className="text-sm text-gray-600">{visitor.purpose}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    visitor.status === 'Checked In' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {visitor.status}
                                  </span>
                                  <p className="text-xs text-gray-500 mt-1">{visitor.time}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Quick Check-In Button */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
                          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                          <button className="w-full bg-white text-indigo-600 font-bold py-4 px-6 rounded-lg hover:bg-gray-100 transition-colors shadow-lg">
                            <div className="flex items-center justify-center space-x-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                              </svg>
                              <span className="text-lg">Quick Check-In</span>
                            </div>
                            <p className="text-sm opacity-80 mt-1">Add visitor without form</p>
                          </button>
                          
                          <div className="mt-6 space-y-3">
                            <div className="flex justify-between items-center p-3 bg-white/20 rounded-lg">
                              <span className="text-sm">Active Alerts</span>
                              <span className="bg-red-500 px-2 py-1 rounded text-xs font-bold">3</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/20 rounded-lg">
                              <span className="text-sm">Pending Approvals</span>
                              <span className="bg-yellow-500 px-2 py-1 rounded text-xs font-bold">2</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/20 rounded-lg">
                              <span className="text-sm">Emergency Mode</span>
                              <button className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs font-bold transition-colors">
                                Activate
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      <button className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full hover:bg-blue-200">
                        Update Profile
                      </button>
                      <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200">
                        Change Password
                      </button>
                      <button className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full hover:bg-green-200">
                        Contact Admin
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;