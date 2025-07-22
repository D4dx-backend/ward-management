const DashboardLoginHistory = ({ logins = [], userRole = 'stateAdmin' }) => {
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

  const getViewAllLink = () => {
    switch (userRole) {
      case 'stateAdmin':
        return '/admin/logs';
      case 'coordinator':
        return '/coordinator/logs';
      default:
        return '/admin/logs';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Logins</h3>
          <a href={getViewAllLink()} className="text-sm text-blue-600 hover:text-blue-800">
            View all
          </a>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {logins.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <p className="mt-2 text-sm">No recent logins</p>
            </div>
          </div>
        ) : (
          logins.map((login) => (
            <div key={login._id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      login.isActive ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-4 h-4 ${login.isActive ? 'text-green-600' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {login.user?.name || 'Unknown User'}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        login.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {login.isActive ? 'Active' : 'Ended'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-gray-500">
                        {login.user?.role?.replace('Admin', ' Admin')}
                      </p>
                      <span className="text-gray-400">•</span>
                      <p className="text-sm text-gray-500">
                        {login.loginMethod}
                      </p>
                      {login.deviceType && (
                        <>
                          <span className="text-gray-400">•</span>
                          <p className="text-sm text-gray-500">
                            {login.deviceType}
                          </p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {login.district}
                      {login.ward && ` • ${login.ward.name}`}
                    </p>
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

export default DashboardLoginHistory;