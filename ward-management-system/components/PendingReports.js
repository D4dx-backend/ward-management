import Link from 'next/link';

const PendingReports = ({ pendingReports = [], title = "Pending Reports", userRole = 'coordinator' }) => {
  // Filter to only show pending reports and limit to 10
  const filteredPendingReports = pendingReports
    .filter(report => report.status === 'pending' || !report.status) // Show only pending reports
    .slice(0, 10); // Limit to maximum 10 reports

  const getViewAllLink = () => {
    switch (userRole) {
      case 'stateAdmin':
        return '/admin/reports';
      case 'coordinator':
        return '/coordinator/ward-reports';
      case 'wardAdmin':
        return '/ward/reports';
      default:
        return '/admin/reports';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {filteredPendingReports.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {filteredPendingReports.length}
                {pendingReports.length > 10 && '+'}
              </span>
            )}
          </div>
          <Link href={getViewAllLink()} className="text-sm text-blue-600 hover:text-blue-800">
            View all
          </Link>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {filteredPendingReports.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm">No pending reports</p>
            </div>
          </div>
        ) : (
          filteredPendingReports.map((report, index) => (
            <div key={index} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {report.formTitle || 'Report Form'}
                      </p>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {report.formType === 'wardReport' ? 'Ward Report' : 'Coordinator Report'}
                    </p>
                    {report.wardName && (
                      <p className="text-xs text-gray-400">
                        Ward: {report.wardName}
                      </p>
                    )}
                    {report.adminName && (
                      <p className="text-xs text-gray-400">
                        Assigned to: {report.adminName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-sm text-gray-500">
                  <span className="text-yellow-600 font-medium">
                    {report.daysOverdue ? `${report.daysOverdue}d overdue` : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PendingReports;