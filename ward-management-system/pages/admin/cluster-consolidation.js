import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import SearchInput from '../../components/SearchInput';
import Loading from '../../components/Loading';
import Pagination from '../../components/Pagination';
import { usePersistentPaginationState, usePersistentFilterState } from '../../hooks/usePersistentState';

export default function ClusterConsolidation() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedWards, setExpandedWards] = useState(new Set());
  const [summary, setSummary] = useState({
    totalWards: 0,
    totalClusters: 0,
    sittingWards: 0,
    regularWards: 0
  });
  const [filterOptions, setFilterOptions] = useState({
    districts: [],
    localBodies: [],
    coordinators: []
  });

  // Persistent pagination state
  const {
    currentPage,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange
  } = usePersistentPaginationState(1, 10, {
    pageKey: 'clusterConsolidationPage',
    itemsPerPageKey: 'clusterConsolidationItemsPerPage'
  });

  // Persistent filter state
  const {
    filters,
    updateFilter,
    clearFilters
  } = usePersistentFilterState({
    searchTerm: '',
    filterDistrict: '',
    filterLocalBody: '',
    filterSittingWard: '',
    filterCoordinator: ''
  }, {
    filterKey: 'clusterConsolidationFilters'
  });

  const searchTerm = filters.searchTerm || '';
  const filterDistrict = filters.filterDistrict || '';
  const filterLocalBody = filters.filterLocalBody || '';
  const filterSittingWard = filters.filterSittingWard || '';
  const filterCoordinator = filters.filterCoordinator || '';

  const setSearchTerm = (value) => updateFilter('searchTerm', value);
  const setFilterDistrict = (value) => updateFilter('filterDistrict', value);
  const setFilterLocalBody = (value) => updateFilter('filterLocalBody', value);
  const setFilterSittingWard = (value) => updateFilter('filterSittingWard', value);
  const setFilterCoordinator = (value) => updateFilter('filterCoordinator', value);

  useEffect(() => {
    // Check if user is authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && !['stateAdmin', 'wardAdmin', 'coordinator'].includes(session.user.role)) {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/cluster-consolidation');
      setData(response.data.data || []);
      setSummary(response.data.summary || {});
      setFilterOptions(response.data.filters || { districts: [], localBodies: [], coordinators: [] });
      setError('');
    } catch (error) {
      console.error('Error fetching cluster consolidation data:', error);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.wardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.wardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.localBody.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.coordinator?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.wardAdmin?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply district filter
    if (filterDistrict) {
      filtered = filtered.filter(item => item.district === filterDistrict);
    }

    // Apply local body filter
    if (filterLocalBody) {
      filtered = filtered.filter(item => item.localBody === filterLocalBody);
    }

    // Apply sitting ward filter
    if (filterSittingWard) {
      if (filterSittingWard === 'sitting') {
        filtered = filtered.filter(item => item.isSittingWard === true);
      } else if (filterSittingWard === 'regular') {
        filtered = filtered.filter(item => item.isSittingWard !== true);
      }
    }

    // Apply coordinator filter
    if (filterCoordinator) {
      filtered = filtered.filter(item => 
        item.coordinator && (
          item.coordinator._id === filterCoordinator ||
          item.coordinator._id?.toString() === filterCoordinator
        )
      );
    }

    return filtered;
  }, [data, searchTerm, filterDistrict, filterLocalBody, filterSittingWard, filterCoordinator]);

  // Calculate pagination
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Auto-adjust page if current page exceeds total pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      handlePageChange(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage, handlePageChange]);

  const toggleWardExpansion = (wardId) => {
    setExpandedWards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wardId)) {
        newSet.delete(wardId);
      } else {
        newSet.add(wardId);
      }
      return newSet;
    });
  };

  const handleExportCSV = () => {
    try {
      // Prepare CSV data
      const csvData = filteredData.map(item => ({
        'Ward Name': item.wardName,
        'Ward Number': item.wardNumber,
        'District': item.district,
        'Local Body': item.localBody,
        'Number of Clusters': item.clusterCount,
        'Sitting Ward': item.isSittingWard ? 'Yes' : 'No',
        'SIC Name': item.coordinator?.name || 'Not assigned',
        'SIC Phone': item.coordinator?.mobileNumber || '',
        'Ward Incharge Name': item.wardAdmin?.name || 'Not assigned',
        'Ward Incharge Phone': item.wardAdmin?.mobileNumber || '',
        'Population': item.population || '',
        'Area': item.area || ''
      }));

      // Convert to CSV format
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header];
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Add UTF-8 BOM for proper encoding
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `cluster_consolidation_${currentDate}.csv`;
      link.setAttribute('download', filename);
      
      // Trigger download
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setError('Failed to export data. Please try again.');
    }
  };

  const handleClearFilters = () => {
    setFilterDistrict('');
    setFilterLocalBody('');
    setFilterSittingWard('');
    setFilterCoordinator('');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <Loading />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Cluster Consolidation - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cluster Consolidation Data</h1>
            <p className="mt-1 text-sm text-gray-600">
              View ward-wise cluster distribution and details
            </p>
          </div>
          <Button 
            onClick={handleExportCSV}
            variant="outline"
            disabled={filteredData.length === 0}
            className="flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Wards</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalWards}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Clusters</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalClusters}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sitting Wards</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.sittingWards}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <span className="text-2xl">🪑</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Regular Wards</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.regularWards}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by ward name, number, district, local body, coordinator, or ward admin..."
                className="max-w-md"
              />
              
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Districts</option>
                  {filterOptions.districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                
                <select
                  value={filterLocalBody}
                  onChange={(e) => setFilterLocalBody(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Local Bodies</option>
                  {filterOptions.localBodies.map(localBody => (
                    <option key={localBody} value={localBody}>{localBody}</option>
                  ))}
                </select>
                
                <select
                  value={filterSittingWard}
                  onChange={(e) => setFilterSittingWard(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Ward Types</option>
                  <option value="sitting">Sitting Wards Only</option>
                  <option value="regular">Regular Wards Only</option>
                </select>
                
                <select
                  value={filterCoordinator}
                  onChange={(e) => setFilterCoordinator(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Coordinators</option>
                  {filterOptions.coordinators.map(coordinator => (
                    <option key={coordinator.id} value={coordinator.id}>{coordinator.name}</option>
                  ))}
                </select>
                
                {(filterDistrict || filterLocalBody || filterSittingWard || filterCoordinator || searchTerm) && (
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              Showing {paginatedData.length} of {totalItems} wards
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coordinator (SIC)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Admin
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clusters
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Type
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((item) => (
                  <>
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.wardName}</div>
                          <div className="text-xs text-gray-500">Ward #{item.wardNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.district}</div>
                        <div className="text-xs text-gray-500">{item.localBody}</div>
                      </td>
                      <td className="px-6 py-4">
                        {item.coordinator ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.coordinator.name}</div>
                            {item.coordinator.mobileNumber && (
                              <div className="text-xs text-gray-500">{item.coordinator.mobileNumber}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Not assigned</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.wardAdmin ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.wardAdmin.name}</div>
                            {item.wardAdmin.mobileNumber && (
                              <div className="text-xs text-gray-500">{item.wardAdmin.mobileNumber}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Not assigned</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                          {item.clusterCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.isSittingWard ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            🪑 Sitting
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Regular
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.clusterCount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleWardExpansion(item._id)}
                          >
                            {expandedWards.has(item._id) ? (
                              <>
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                Hide
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                Show Clusters
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Cluster Details */}
                    {expandedWards.has(item._id) && (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                              Clusters in {item.wardName} ({item.clusters.length})
                            </h4>
                            
                            {item.clusters.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {item.clusters.map((cluster) => (
                                  <div key={cluster._id} className="bg-white rounded-lg border border-gray-200 p-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs font-semibold rounded">
                                            #{cluster.clusterNumber}
                                          </span>
                                          <span className="text-sm font-medium text-gray-900">
                                            {cluster.name}
                                          </span>
                                        </div>
                                        
                                        {cluster.coordinator?.name && (
                                          <div className="mt-2 text-xs text-gray-600">
                                            <span className="font-medium">Coordinator:</span> {cluster.coordinator.name}
                                          </div>
                                        )}
                                        
                                        <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
                                          {cluster.householdCount > 0 && (
                                            <div className="flex items-center">
                                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                              </svg>
                                              {cluster.householdCount} HH
                                            </div>
                                          )}
                                          {cluster.population > 0 && (
                                            <div className="flex items-center">
                                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                              </svg>
                                              {cluster.population}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        cluster.status === 'active' ? 'bg-green-100 text-green-800' :
                                        cluster.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {cluster.status || 'Active'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 text-center py-4">
                                No clusters found for this ward
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                
                {totalItems === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {(searchTerm || filterDistrict || filterLocalBody || filterSittingWard || filterCoordinator)
                            ? 'No wards found matching your filters'
                            : 'No data available'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </Card>
      </div>
    </Layout>
  );
}
