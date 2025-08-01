import Link from 'next/link';

const RecentReports = ({ reports = [], title = "Recent Reports", userRole = 'stateAdmin', onReportClick }) => {
  // Always show only the first 3 reports, full details available via "View all"
  const displayReports = reports.slice(0, 3);
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
        return '/admin/reports';
      case 'coordinator':
        return '/coordinator/reports';
      case 'wardAdmin':
        return '/ward/reports';
      default:
        return '/admin/reports';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            { (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {reports.length}
              </span>
            )}
          </div>
          <Link href={getViewAllLink()} className="text-sm text-blue-600 hover:text-blue-800">
            View all
          </Link>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {reports.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm">No recent reports</p>
            </div>
          </div>
        ) : (
          displayReports.map((report) => {
            const reportContent = (
              <div className="px-6 py-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {report.form?.title || 'Unknown Form'}
                        </p>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Submitted
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        by {report.user?.name || 'Unknown User'}
                        {report.user?.role && (
                          <span className="text-gray-400"> ({report.user.role.replace('Admin', ' Admin')})</span>
                        )}
                      </p>
                      {report.ward && (
                        <p className="text-xs text-gray-400">
                          {report.ward.name}, {report.ward.district}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {formatTimeAgo(report.submittedAt)}
                  </div>
                </div>
              </div>
            );

            return onReportClick ? (
              <div key={report._id} onClick={() => onReportClick(report)}>
                {reportContent}
              </div>
            ) : (
              <Link key={report._id} href={`/admin/forms/responses/${report.formTemplate || report.form?._id}?responseId=${report._id}`}>
                {reportContent}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecentReports;