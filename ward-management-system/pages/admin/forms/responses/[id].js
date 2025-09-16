import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import SearchInput from '../../../../components/SearchInput';
import { useApiData } from '../../../../hooks/useApiData';

export default function FormResponses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id, responseId, direct } = router.query;
  
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [filteredResponses, setFilteredResponses] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [coordinators, setCoordinators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedResponses, setExpandedResponses] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: 'all',
    ward: 'all',
    coordinator: 'all',
    dateRange: 'all'
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchFormAndResponses();
    }
  }, [status, session, router, id]);

  useEffect(() => {
    // If direct navigation with responseId, scroll to that response
    if (direct === 'true' && responseId && responses.length > 0) {
      const targetResponse = responses.find(r => r._id === responseId);
      if (targetResponse) {
        setSelectedResponse(targetResponse);
        // Scroll to the response after a short delay
        setTimeout(() => {
          const element = document.getElementById(`response-${responseId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
            }, 3000);
          }
        }, 100);
      }
    }
  }, [direct, responseId, responses]);

  // Filter responses based on search term and filters
  useEffect(() => {
    let filtered = responses;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(response =>
        (response.respondent?.name && response.respondent.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (response.ward?.name && response.ward.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (response.ward?.district && response.ward.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (response.respondent?.role && response.respondent.role.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(response => response.respondent?.role === filters.role);
    }

    // Apply ward filter
    if (filters.ward !== 'all') {
      filtered = filtered.filter(response => response.ward?._id === filters.ward);
    }

    // Apply coordinator filter
    if (filters.coordinator !== 'all') {
      filtered = filtered.filter(response => {
        // For coordinator reports, filter by respondent
        if (response.formType === 'coordinatorReport') {
          return response.respondent?._id === filters.coordinator;
        }
        // For ward reports, filter by ward's coordinator
        return response.ward?.coordinator?._id === filters.coordinator || response.ward?.coordinator === filters.coordinator;
      });
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(response => new Date(response.submittedAt) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(response => new Date(response.submittedAt) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(response => new Date(response.submittedAt) >= filterDate);
          break;
      }
    }

    setFilteredResponses(filtered);
  }, [responses, searchTerm, filters]);

  // Get unique values for filter options
  const getFilterOptions = () => {
    const roles = [...new Set(responses.map(r => r.respondent?.role).filter(Boolean))];
    const wards = [...new Set(responses.map(r => r.ward).filter(Boolean))];
    
    return { roles, wards };
  };

  const { roles, wards } = getFilterOptions();

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      role: 'all',
      ward: 'all',
      coordinator: 'all',
      dateRange: 'all'
    });
    setSearchTerm('');
  };

  const toggleResponseExpansion = (responseId) => {
    setExpandedResponses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(responseId)) {
        newSet.delete(responseId);
      } else {
        newSet.add(responseId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedResponses(new Set(filteredResponses.map(r => r._id)));
  };

  const collapseAll = () => {
    setExpandedResponses(new Set());
  };

  const fetchFormAndResponses = async () => {
    try {
      setIsLoading(true);
      
      // Fetch form details, responses, and users
      const [formResponse, responsesResponse, usersResponse] = await Promise.all([
        axios.get(`/api/forms/${id}`),
        axios.get(`/api/responses?formTemplate=${id}`),
        axios.get('/api/users')
      ]);
      
      setForm(formResponse.data);
      const responseData = responsesResponse.data || [];
      setResponses(responseData);
      setFilteredResponses(responseData);
      
      // Filter coordinators from users
      const coordinatorUsers = (usersResponse.data || []).filter(user => user.role === 'coordinator');
      setCoordinators(coordinatorUsers);
      
      // Auto-expand first response if there are responses
      if (responseData.length > 0) {
        setExpandedResponses(new Set([responseData[0]._id]));
      }
      
      setError('');
    } catch (error) {
      console.error('Error fetching form data:', error);
      setError('Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderFieldValue = (field, value) => {
    // Handle null, undefined, empty string, and empty arrays
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return <span className="text-gray-400 italic">No response</span>;
    }
    
    switch (field.type) {
      case 'multiselect':
      case 'checkbox':
        if (Array.isArray(value)) {
          return value.length > 0 ? value.join(', ') : <span className="text-gray-400 italic">No response</span>;
        }
        return value;
      case 'yesno':
        return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value;
      case 'radio':
      case 'select':
        return value;
      case 'textarea':
        return (
          <div className="whitespace-pre-wrap max-h-32 overflow-y-auto">
            {value}
          </div>
        );
      case 'file':
        return value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            View File
          </a>
        ) : <span className="text-gray-400 italic">No file uploaded</span>;
      case 'date':
        return value ? new Date(value).toLocaleDateString() : <span className="text-gray-400 italic">No date selected</span>;
      case 'number':
        return value !== null && value !== undefined ? value.toString() : <span className="text-gray-400 italic">No response</span>;
      default:
        return value;
    }
  };

  const exportResponses = () => {
    if (!filteredResponses.length || !form) return;
    
    const csvContent = generateResponsesCSV();
    downloadCSV(csvContent, `${form.title}_responses_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const generateResponsesCSV = () => {
    const headers = [
      'Response ID',
      'Respondent Name',
      'Respondent Role',
      'Ward',
      'District',
      'Coordinator',
      'Submitted At',
      ...form.fields.map(field => field.label)
    ];
    
    const rows = filteredResponses.map(response => [
      response._id,
      response.respondent?.name || 'Unknown',
      response.respondent?.role || 'Unknown',
      response.ward?.name || 'Unknown',
      response.ward?.district || 'Unknown',
      response.ward?.coordinator?.name || response.respondent?.name || 'Unknown',
      formatDate(response.submittedAt),
      ...form.fields.map(field => {
        const value = response.responses?.[field.label];
        if (!value) return 'N/A';
        if (Array.isArray(value)) return value.join('; ');
        return String(value).replace(/,/g, ';'); // Replace commas to avoid CSV issues
      })
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{form?.title ? `${form.title} - Responses` : 'Form Responses'} - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/forms')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Forms
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {form?.title || 'Form'} - Responses
              </h1>
              <p className="text-sm text-gray-600">
                Showing {filteredResponses.length} of {responses.length} response{responses.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button onClick={expandAll} variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Expand All
            </Button>
            <Button onClick={collapseAll} variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6M21 3l-6 6m0 0V4m0 5h5M3 21l6-6m0 0v5m0-5H4" />
              </svg>
              Collapse All
            </Button>
            <Button onClick={exportResponses} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Filtered ({filteredResponses.length})
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {direct === 'true' && responseId && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <p className="text-sm">
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Navigated directly to a specific response. It's highlighted below.
            </p>
          </div>
        )}

        {/* Filters Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Filters & Search</h2>
              <Button onClick={clearFilters} variant="outline" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search responses..."
                />
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Roles</option>
                  {roles.map(role => (
                    <option key={role} value={role}>
                      {role.replace('Admin', ' Admin')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordinator Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coordinator</label>
                <select
                  value={filters.coordinator}
                  onChange={(e) => handleFilterChange('coordinator', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Coordinators</option>
                  {coordinators.map(coordinator => (
                    <option key={coordinator._id} value={coordinator._id}>
                      {coordinator.name} - {coordinator.district}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Ward Filter - Full width if many wards */}
            {wards.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                <select
                  value={filters.ward}
                  onChange={(e) => handleFilterChange('ward', e.target.value)}
                  className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Wards</option>
                  {wards.map(ward => (
                    <option key={ward._id} value={ward._id}>
                      {ward.name} - {ward.district}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {filteredResponses.length > 0 ? (
            filteredResponses.map((response) => {
              const isExpanded = expandedResponses.has(response._id);
              
              return (
                <Card 
                  key={response._id} 
                  id={`response-${response._id}`}
                  className="transition-all duration-300 overflow-hidden"
                >
                  {/* Response Header - Always Visible */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                    onClick={() => toggleResponseExpansion(response._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Response from {response.respondent?.name || 'Unknown User'}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span>Submitted: {formatDate(response.submittedAt)}</span>
                            {response.respondent?.role && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {response.respondent.role.replace('Admin', ' Admin')}
                              </span>
                            )}
                            {response.ward && (
                              <span className="text-gray-600">
                                {response.ward.name}, {response.ward.district}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Submitted
                        </span>
                        <div className="text-sm text-gray-500">
                          {form?.fields?.length || 0} fields
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Response Content - Collapsible */}
                  {isExpanded && (
                    <div className="p-6 bg-gray-50">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="space-y-4">
                          {form?.fields && form.fields.length > 0 ? (
                            form.fields.map((field, index) => (
                              <div key={field._id || field.id} className={`${index !== form.fields.length - 1 ? 'border-b border-gray-100 pb-4' : ''}`}>
                                <div className="flex items-start space-x-4">
                                  <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      {field.label}
                                      {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                                      {renderFieldValue(field, response.responses?.[field.label])}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                      {field.type}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-sm mt-2">No form fields available</p>
                            </div>
                          )}
                        </div>

                        {response.notes && (
                          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Notes
                            </h4>
                            <p className="text-sm text-yellow-700">{response.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          ) : (
            <Card>
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No responses yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This form hasn't received any responses yet.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}