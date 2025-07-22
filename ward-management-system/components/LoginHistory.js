import { useState, useEffect } from 'react';
import axios from 'axios';

const LoginHistory = ({ userId = null, showAllUsers = false, limit = 10 }) => {
  const [loginHistory, setLoginHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLoginHistory();
  }, [userId, showAllUsers]);

  const fetchLoginHistory = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('showAllUsers', showAllUsers.toString());
      if (userId && !showAllUsers) {
        params.append('userId', userId);
      }
      
      const response = await axios.get(`/api/login-history?${params.toString()}`);
      setLoginHistory(response.data.loginHistory);
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return time.toLocaleDateString();
  };

  const getDeviceInfo = (userAgent) => {
    if (!userAgent) return 'Unknown Device';
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return 'Mobile Device';
    } else if (userAgent.includes('iPad')) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Login History</h3>
        </div>
        <div className="px-6 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading login history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {showAllUsers ? 'Recent Logins' : 'Login History'}
          </h3>
          <button
            onClick={fetchLoginHistory}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {loginHistory.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <p className="mt-2 text-sm">No login history found</p>
            </div>
          </div>
        ) : (
          loginHistory.map((login) => (
            <div key={login._id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      login.isActive ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${login.isActive ? 'text-green-600' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {showAllUsers ? login.user?.name || 'Unknown User' : 'Login Session'}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        login.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {login.isActive ? 'Active' : 'Ended'}
                      </span>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {login.loginMethod}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500">
                        Login: {new Date(login.loginTime).toLocaleString()}
                      </p>
                      {login.logoutTime && (
                        <p className="text-sm text-gray-500">
                          Logout: {new Date(login.logoutTime).toLocaleString()}
                        </p>
                      )}
                      {login.sessionDuration && (
                        <p className="text-xs text-gray-400">
                          Duration: {login.sessionDuration}m
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      {login.ipAddress && (
                        <p className="text-xs text-gray-400">
                          IP: {login.ipAddress}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {login.deviceType || getDeviceInfo(login.userAgent)}
                      </p>
                      {login.browser && login.browser !== 'Unknown' && (
                        <p className="text-xs text-gray-400">
                          {login.browser}
                        </p>
                      )}
                    </div>
                    {showAllUsers && login.user?.role && (
                      <p className="text-xs text-gray-400 mt-1">
                        {login.user.role.replace('Admin', ' Admin')} • {login.district}
                        {login.ward && ` • ${login.ward.name}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-sm text-gray-500">
                  {formatTimeAgo(login.loginTime)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LoginHistory;