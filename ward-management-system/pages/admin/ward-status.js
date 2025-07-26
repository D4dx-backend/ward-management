import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';

export default function WardStatus() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    district: '',
    coordinator: '',
    status: '',
    page: 1
  });
  const [pagination, setPagination] = useState({});
  const [districts, setDistricts] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    if (session.user.role !== 'stateAdmin' && session.user.role !== 'coordinator') {
      router.push('/dashboard');
      return;
    }
    
    fetchWardStatus();
    fetchFilterOptions();
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

  const fetchFilterOptions = async () => {
    try {
      // Fetch districts and coordinators for filters
      const [districtsRes, coordinatorsRes] = await Promise.all([
        fetch('/api/admin/districts'),
        fetch('/api/admin/coordinators')
      ]);

      if (districtsRes.ok) {
        const districtsData = await districtsRes.json();
        setDistricts(districtsData);
      }

      if (coordinatorsRes.ok) {
        const coordinatorsData = await coordinatorsRes.json();
        setCoordinators(coordinatorsData);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
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

  const handleExport = async (type) => {
    try {
      setExporting(true);
      const response = await fetch(`/api/admin/ward-status/export?type=${type}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
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

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Ward Status Dashboard</h1>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('ward-status')}
              disabled={exporting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export Ward Status'}
            </button>
            
            {session.user.role === 'stateAdmin' && (
              <>
                <button
                  onClick={() => handleExport('relationships')}
                  disabled={exporting}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Export Relationships
                </button>
                
                <button
                  onClick={() => handleExport('forms')}
                  disabled={exporting}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  Export Forms
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {session.user.role === 'stateAdmin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <select
                  value={filters.district}
                  onChange={(e) => handleFilterChange('district', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Districts</option>
                  {districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
            )}

            {session.user.role === 'stateAdmin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coordinator
                </label>
                <select
                  value={filters.coordinator}
                  onChange={(e) => handleFilterChange('coordinator', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Coordinators</option>
                  {coordinators.map(coordinator => (
                    <option key={coordinator._id} value={coordinator._id}>
                      {coordinator.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
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
                onClick={() => setFilters({ district: '', coordinator: '', status: '', page: 1 })}
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
                    Coordinator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reports
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
                        <div className="text-sm text-gray-500">
                          {ward.district}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {ward.coordinator.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {ward.coordinator.mobileNumber}
                        </div>
                      </div>
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
                      <div className="text-sm text-gray-900">
                        {ward.submittedReports} / {ward.totalExpectedReports}
                      </div>
                      <div className="text-sm text-gray-500">
                        {ward.reportCompletionRate}% complete
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