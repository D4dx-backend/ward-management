import Link from 'next/link';

const RecentActivity = ({ logs = [], title = "Recent Activity", userRole = "stateAdmin" }) => {
  // Always show only the first 3 items, full details available via "View all"
  const displayLogs = logs.slice(0, 3);
  const getActionBadgeColor = (action) => {
    const colors = {
      USER_LOGIN: 'bg-green-100 text-green-800',
      USER_LOGOUT: 'bg-gray-100 text-gray-800',
      REPORT_SUBMITTED: 'bg-blue-100 text-blue-800',
      FORM_SUBMIT: 'bg-blue-100 text-blue-800',
      FORM_CREATE: 'bg-purple-100 text-purple-800',
      FORM_UPDATE: 'bg-yellow-100 text-yellow-800',
      FORM_DELETE: 'bg-red-100 text-red-800',
      USER_CREATED: 'bg-indigo-100 text-indigo-800',
      USER_CREATE: 'bg-indigo-100 text-indigo-800',
      USER_UPDATE: 'bg-orange-100 text-orange-800',
      USER_DELETE: 'bg-red-100 text-red-800',
      WARD_CREATED: 'bg-blue-100 text-blue-800',
      WARD_UPDATED: 'bg-yellow-100 text-yellow-800',
      WARD_ADMIN_ASSIGNED: 'bg-purple-100 text-purple-800',
      REPORT_REVIEWED: 'bg-cyan-100 text-cyan-800',
      REPORT_VIEW: 'bg-cyan-100 text-cyan-800',
      REPORT_EXPORT: 'bg-teal-100 text-teal-800',
      LOGIN: 'bg-green-100 text-green-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatActionText = (action) => {
    const actionTexts = {
      LOGIN: 'Login',
      LOGOUT: 'Logout',
      FORM_SUBMIT: 'Form Submit',
      FORM_CREATE: 'Form Create',
      FORM_UPDATE: 'Form Update',
      FORM_DELETE: 'Form Delete',
      USER_CREATE: 'User Create',
      USER_UPDATE: 'User Update',
      USER_DELETE: 'User Delete',
      REPORT_VIEW: 'Report View',
      REPORT_EXPORT: 'Report Export',
    };
    return actionTexts[action] || action.replace('_', ' ');
  };

  const formatDescription = (log) => {
    // Handle REPORT_VIEW actions with JSON filters
    if (log.action === 'REPORT_VIEW' && log.description.includes('filters:')) {
      try {
        const match = log.description.match(/filters:\s*({.*})/);
        if (match) {
          const filters = JSON.parse(match[1]);
          let parts = [];

          if (filters.formType) {
            parts.push(`${filters.formType.replace('Report', ' Reports')}`);
          }
          if (filters.year) {
            parts.push(`for ${filters.year}`);
          }
          if (filters.weekNumber) {
            parts.push(`week ${filters.weekNumber}`);
          }

          return `Viewed ${parts.join(' ') || 'reports'}`;
        }
      } catch (e) {
        // If parsing fails, fall back to original description
      }
    }

    return log.description;
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

  const getViewAllLink = () => {
    switch (userRole) {
      case 'stateAdmin':
        return '/admin/logs';
      case 'coordinator':
        return '/coordinator/logs';
      case 'wardAdmin':
        return '/ward/logs'; // Ward admins can view their activity logs
      default:
        return '/admin/logs';
    }
  };

  const shouldShowViewAll = true; // Show "View all" for all user roles

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {shouldShowViewAll && (
            <Link href={getViewAllLink()} className="text-sm text-blue-600 hover:text-blue-800">
              View all
            </Link>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {logs.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm">No recent activity</p>
            </div>
          </div>
        ) : (
          displayLogs.map((log) => (
            <div key={log._id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {log.user?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {log.user?.name || 'Unknown User'}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                        {formatActionText(log.action)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {formatDescription(log)}
                    </p>
                    {(log.ward || log.district) && (
                      <p className="text-xs text-gray-400">
                        {log.ward ? `${log.ward.name}, ${log.ward.district || log.district}` : log.district}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-sm text-gray-500">
                  {formatTimeAgo(log.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentActivity;