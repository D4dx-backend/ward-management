import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';

export default function CoordinatorWardStatus() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    page: 1
  });
  const [pagination, setPagination] = useState({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    if (session.user.role !== 'coordinator') {
      router.push('/dashboard');
      return;
    }
    
    fetchWardStatus();
  }, [session, status, filters]);

  const fetchWardStatus = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/admin/ward-status?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setWards(data.wards);
        setPagination(data.pagination);
      } else {
        console.error('Error fetching ward status:', data.message);
      }
    } catch (error) {
      console.error('Error fetching ward status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch('/api/admin/ward-status/export?type=ward-status');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-wards-status-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (statusColor, daysSinceLogin) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    let colorClasses = "";
    let text = "";

    switch (statusColor) {
      case 'green':
        colorClasses = "bg-green-100 text-green-800";
        text = `Active (${daysSinceLogin}d)`;
        break;
      case 'orange':
        colorClasses = "bg-orange-100 text-orange-800";
        text = `Warning (${daysSinceLogin}d)`;
        break;
      case 'red':
        colorClasses = "bg-red-100 text-red-800";
        text = `Inactive (${daysSinceLogin}d)`;
        break;
      default:
        colorClasses = "bg-gray-100 text-gray-800";
        text = "No Data";
    }

    return (
      <span className={`${baseClasses} ${colorClasses}`}>
        {text}
      </span>
    );
  };

  const getStatusSummary = () => {
    const summary = {
      active: 0,
      warning: 0,
      inactive: 0,
      noData: 0
    };

    wards.forEach(ward => {
      switch (ward.statusColor) {
        case 'green':
          summary.active++;
          break;
        case 'orange':
          summary.warning++;
          break;
        case 'red':
          summary.inactive++;
          break;
        default:
          summary.noData++;
      }
    });

    return summary;
  };

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  const statusSummary = getStatusSummary();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">My Wards Status</h1>
          
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export Ward Status'}
          </button>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{statusSummary.active}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Active Wards</p>
                <p className="text-xs text-green-600">0-3 days since login</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{statusSummary.warning}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-800">Warning Wards</p>
                <p className="text-xs text-orange-600">4-6 days since login</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{statusSummary.inactive}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">Inactive Wards</p>
                <p className="text-xs text-red-600">7+ days since login</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{statusSummary.noData}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-800">No Data</p>
                <p className="text-xs text-gray-600">Never logged in</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Status</option>
                <option value="green">Active (0-3 days)</option>
                <option value="orange">Warning (4-6 days)</option>
                <option value="red">Inactive (7+ days)</option>
                <option value="gray">No Data</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', page: 1 })}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Ward Status Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reports This Week
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wards.map((ward) => (
                  <tr key={ward._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {ward.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Ward #{ward.wardNumber} • {ward.panchayath}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ward.wardAdmin ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ward.wardAdmin.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {ward.wardAdmin.mobileNumber}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ward.lastLogin 
                        ? new Date(ward.lastLogin).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(ward.statusColor, ward.daysSinceLogin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900 mr-2">
                          {ward.submittedReports} / {ward.totalExpectedReports}
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${ward.reportCompletionRate}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 ml-2">
                          {ward.reportCompletionRate}%
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {wards.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No wards found matching the current filters.
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Showing page {pagination.currentPage} of {pagination.totalPages} 
              ({pagination.totalWards} total wards)
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}