import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import SearchInput from '../../../../components/SearchInput';
import Table from '../../../../components/Table';
import { useApiData } from '../../../../hooks/useApiData';
import ClusterResponseSummary from '../../../../components/ClusterResponseSummary';

export default function FormResponses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id, responseId, direct } = router.query;
  
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [filteredResponses, setFilteredResponses] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [coordinators, setCoordinators] = useState([]);
  const [wardNames, setWardNames] = useState({});
  const [clusters, setClusters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedResponses, setExpandedResponses] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  // Reset pagination when filters change
  useEffect(() => {
    console.log('Filters or search changed, resetting to page 1');
    setCurrentPage(1);
  }, [searchTerm, filters]);

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
    console.log('Clearing all filters and resetting pagination');
    setFilters({
      role: 'all',
      ward: 'all',
      coordinator: 'all',
      dateRange: 'all'
    });
    setSearchTerm('');
    setCurrentPage(1);
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

  // Pagination handlers
  const handlePageChange = (page) => {
    console.log('Changing to page:', page);
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize) => {
    console.log('Changing page size to:', newPageSize);
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
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
      
      // Log form structure for debugging
      console.log('Form data received:', {
        hasFields: !!formResponse.data.fields,
        fieldsCount: formResponse.data.fields?.length || 0,
        hasSittingWardFields: !!formResponse.data.sittingWardFields,
        sittingWardFieldsCount: formResponse.data.sittingWardFields?.length || 0,
        responsesCount: responseData.length,
        sampleWardData: responseData.length > 0 ? {
          hasWard: !!responseData[0].ward,
          wardIsSittingWard: responseData[0].ward?.isSittingWard,
          willShowSittingWardFields: !!(formResponse.data.sittingWardFields && formResponse.data.sittingWardFields.length > 0 && responseData[0].ward?.isSittingWard),
          hasWardData: !!responseData[0].wardData,
          wardDataKeys: Object.keys(responseData[0].wardData || {}),
          wardDataLength: Object.keys(responseData[0].wardData || {}).length
        } : null
      });
      
      // Filter coordinators from users
      const coordinatorUsers = (usersResponse.data || []).filter(user => user.role === 'coordinator');
      setCoordinators(coordinatorUsers);
      
      // Fetch ward names for ward data display
      try {
        const wardsResponse = await axios.get('/api/wards');
        const wardNamesMap = {};
        wardsResponse.data.forEach(ward => {
          wardNamesMap[ward._id] = ward.name;
        });
        setWardNames(wardNamesMap);
        console.log('Fetched ward names:', wardNamesMap);
      } catch (error) {
        console.error('Error fetching ward names:', error);
      }

      // Fetch clusters for cluster response display
      try {
        const clustersResponse = await axios.get('/api/clusters');
        setClusters(clustersResponse.data || []);
        console.log('Fetched clusters:', clustersResponse.data?.length || 0);
      } catch (error) {
        console.error('Error fetching clusters:', error);
      }
      
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

  const hasSittingWardResponses = (response) => {
    if (!response.responses) return false;
    
    const responsesObj = response.responses instanceof Map ?
      Object.fromEntries(response.responses) : response.responses;
    
    // Check if any response key contains 'sittingWard' or 'sitting'
    return Object.keys(responsesObj).some(key => 
      key.toLowerCase().includes('sittingward') || 
      key.toLowerCase().includes('sitting')
    );
  };

  const getClusterName = (clusterId) => {
    const cluster = clusters.find(c => c._id === clusterId);
    return cluster?.name || `Cluster ${clusterId.slice(-4)}`;
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

  // Create table columns configuration
  const createTableColumns = () => {
    if (!form || !form.fields) return [];

    console.log('Creating table columns for form:', form.title);
    console.log('Form fields count:', form.fields.length);
    console.log('Sitting ward fields count:', form.sittingWardFields?.length || 0);

    const columns = [
      {
        key: 'respondent',
        title: 'Respondent',
        sortable: true,
        render: (value, row) => (
          <div>
            <div className="font-medium text-gray-900">{row.respondent?.name || 'Unknown'}</div>
            <div className="text-sm text-gray-500">{row.respondent?.role || 'Unknown Role'}</div>
          </div>
        )
      },
      {
        key: 'ward',
        title: 'Ward',
        sortable: true,
        render: (value, row) => (
          <div>
            <div className="font-medium text-gray-900">{row.ward?.name || 'Unknown'}</div>
            <div className="text-sm text-gray-500">{row.ward?.district || 'Unknown District'}</div>
          </div>
        )
      },
      {
        key: 'submittedAt',
        title: 'Submitted',
        sortable: true,
        render: (value) => (
          <div className="text-sm">
            {formatDate(value)}
          </div>
        )
      }
    ];

    // Add form field columns (limit to first 3-4 most important fields for table readability)
    const formFieldColumns = form.fields.slice(0, 3).map((field, index) => ({
      key: `response_${field.label}`,
      title: field.label,
      sortable: false,
      render: (value, row) => {
        const fieldValue = row.responses?.[field.label];
        return (
          <div className="max-w-xs truncate" title={fieldValue}>
            {renderFieldValue(field, fieldValue)}
          </div>
        );
      }
    }));

    columns.push(...formFieldColumns);

    // Add actions column
    columns.push({
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedResponse(row)}
          >
            View Details
          </Button>
        </div>
      )
    });

    return columns;
  };

  const exportResponses = () => {
    if (!filteredResponses.length || !form) return;
    
    const csvContent = generateResponsesCSV();
    downloadCSV(csvContent, `${form.title}_responses_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const generateResponsesCSV = () => {
    // Check if any response has sitting ward fields
    const hasSittingWards = filteredResponses.some(response => 
      response.ward?.isSittingWard || hasSittingWardResponses(response)
    );
    
    const headers = [
      'Response ID',
      'Respondent Name',
      'Respondent Role',
      'Ward',
      'District',
      'Coordinator',
      'Submitted At',
      ...form.fields.map(field => field.label),
      ...(form.sittingWardFields && hasSittingWards ? form.sittingWardFields.map(field => `[Sitting Ward] ${field.label}`) : [])
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
      }),
      ...(form.sittingWardFields && (response.ward?.isSittingWard || hasSittingWardResponses(response)) ? form.sittingWardFields.map(field => {
        // Try different key formats for sitting ward fields
        let fieldValue = response.responses?.[`sittingWard_${field.label}`];
        
        if (fieldValue === undefined) {
          const possibleKeys = [
            `sittingWard_field_${form.sittingWardFields.indexOf(field)}`,
            `sittingWard_${form.sittingWardFields.indexOf(field)}`,
            field.label,
            `field_${form.fields.length + form.sittingWardFields.indexOf(field)}`
          ];

          for (const key of possibleKeys) {
            if (response.responses?.[key] !== undefined) {
              fieldValue = response.responses[key];
              break;
            }
          }
        }

        if (!fieldValue) return 'N/A';
        if (Array.isArray(fieldValue)) return fieldValue.join('; ');
        return String(fieldValue).replace(/,/g, ';'); // Replace commas to avoid CSV issues
      }) : [])
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const generateJSONData = () => {
    const jsonData = filteredResponses.map(response => {
      const responseData = {
        responseId: response._id,
        respondent: {
          name: response.respondent?.name || 'Unknown',
          role: response.respondent?.role || 'Unknown',
          id: response.respondent?._id
        },
        ward: {
          name: response.ward?.name || 'Unknown',
          district: response.ward?.district || 'Unknown',
          id: response.ward?._id,
          isSittingWard: response.ward?.isSittingWard || false,
          coordinator: response.ward?.coordinator?.name || response.respondent?.name || 'Unknown'
        },
        submittedAt: response.submittedAt,
        formFields: {},
        wardSpecificFields: {},
        clusterFields: {},
        sittingWardFields: {}
      };

      // Process regular form fields
      form.fields?.forEach((field, index) => {
        if (field.applicableToClusters) {
          // Extract cluster responses
          const clusterResponses = {};
          Object.keys(response.responses || {}).forEach(key => {
            if (key.startsWith(`${field.label}_cluster_`)) {
              const clusterId = key.replace(`${field.label}_cluster_`, '');
              const cluster = clusters.find(c => c._id === clusterId);
              clusterResponses[cluster?.name || clusterId] = response.responses[key];
            }
          });
          responseData.clusterFields[field.label] = {
            fieldType: field.type,
            required: field.required,
            clusterResponses: clusterResponses
          };
        } else if (field.applicableToWards && response.wardData) {
          // Extract ward-specific responses
          const wardResponses = {};
          Object.entries(response.wardData).forEach(([wardId, wardData]) => {
            const fieldKey = `field_${index}`;
            const wardAnswer = wardData[fieldKey];
            if (wardAnswer !== undefined && wardAnswer !== null && wardAnswer !== '') {
              wardResponses[wardNames[wardId] || wardId] = wardAnswer;
            }
          });
          responseData.wardSpecificFields[field.label] = {
            fieldType: field.type,
            required: field.required,
            wardResponses: wardResponses
          };
        } else {
          // Regular field
          responseData.formFields[field.label] = {
            fieldType: field.type,
            required: field.required,
            value: response.responses?.[field.label] || null
          };
        }
      });

      // Process sitting ward fields
      if (form.sittingWardFields && (response.ward?.isSittingWard || hasSittingWardResponses(response))) {
        form.sittingWardFields.forEach((field, index) => {
          // Try different key formats for sitting ward fields
          let fieldValue = response.responses?.[`sittingWard_${field.label}`];
          
          if (fieldValue === undefined) {
            const possibleKeys = [
              `sittingWard_field_${index}`,
              `sittingWard_${index}`,
              field.label,
              `field_${form.fields.length + index}`
            ];

            for (const key of possibleKeys) {
              if (response.responses?.[key] !== undefined) {
                fieldValue = response.responses[key];
                break;
              }
            }
          }

          responseData.sittingWardFields[field.label] = {
            fieldType: field.type,
            required: field.required,
            value: fieldValue || null
          };

          // Handle sub-questions for sitting ward fields
          if (field.subQuestions && field.subQuestions.length > 0) {
            const subQuestionData = {};
            field.subQuestions.forEach((subQuestion, subIndex) => {
              let subValue = null;
              const possibleKeys = [
                `sittingWard_${field.label}_${subQuestion.label}`,
                `sittingWard_field_${index}_sub_${subIndex}`,
                `sittingWard_${index}_sub_${subIndex}`,
                `${field.label}_sub_${subQuestion.label}`,
                `field_${form.fields.length + index}_sub_${subIndex}`
              ];

              for (const key of possibleKeys) {
                if (response.responses?.[key] !== undefined) {
                  subValue = response.responses[key];
                  break;
                }
              }

              subQuestionData[subQuestion.label] = {
                fieldType: subQuestion.type,
                required: subQuestion.required,
                value: subValue
              };
            });

            if (Object.keys(subQuestionData).length > 0) {
              responseData.sittingWardFields[field.label].subQuestions = subQuestionData;
            }
          }
        });
      }

      // Add notes if available
      if (response.notes) {
        responseData.notes = response.notes;
      }

      return responseData;
    });

    return jsonData;
  };

  const copyAsJSON = () => {
    if (!filteredResponses.length || !form) return;
    
    const jsonData = generateJSONData();
    const jsonString = JSON.stringify(jsonData, null, 2);
    
    navigator.clipboard.writeText(jsonString).then(() => {
      alert(`Copied ${filteredResponses.length} responses as JSON to clipboard!`);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard. Check console for details.');
    });
  };

  const downloadJSON = () => {
    if (!filteredResponses.length || !form) return;
    
    const jsonData = generateJSONData();
    const jsonString = JSON.stringify(jsonData, null, 2);
    
    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title}_responses_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
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
                  {viewMode === 'table' ? (
                    `Showing ${Math.min((currentPage - 1) * pageSize + 1, filteredResponses.length)}-${Math.min(currentPage * pageSize, filteredResponses.length)} of ${filteredResponses.length} filtered response${filteredResponses.length !== 1 ? 's' : ''} (${responses.length} total)`
                  ) : (
                    `Showing ${filteredResponses.length} of ${responses.length} response${responses.length !== 1 ? 's' : ''}`
                  )}
                </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="px-3 py-1.5"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V4a2 2 0 012-2h14a2 2 0 012 2v16a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="px-3 py-1.5"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Cards
              </Button>
            </div>
            
            {/* Card view specific controls */}
            {viewMode === 'cards' && (
              <>
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
              </>
            )}
            
            <Button onClick={exportResponses} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV ({filteredResponses.length})
            </Button>
            <Button onClick={downloadJSON} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download JSON ({filteredResponses.length})
            </Button>
            <Button onClick={copyAsJSON} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              Copy JSON ({filteredResponses.length})
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
          <div className="border-b border-gray-200">
            <div 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${filtersExpanded ? 'rotate-90' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <h2 className="text-lg font-medium text-gray-900">Filters & Search</h2>
                  {!filtersExpanded && (
                    <span className="text-sm text-gray-500">
                      ({Object.values(filters).filter(v => v !== 'all').length + (searchTerm ? 1 : 0)} active)
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {filtersExpanded && (
                    <Button onClick={clearFilters} variant="outline" size="sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Clear All
                    </Button>
                  )}
                  <span className="text-xs text-gray-400">
                    {filtersExpanded ? 'Click to collapse' : 'Click to expand'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {filtersExpanded && (
            <div className="p-6 animate-in slide-in-from-top-2 duration-300">
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
          )}
        </Card>

        {/* Responses Display */}
        {viewMode === 'table' ? (
          // Table View
          <div className="space-y-4">
            <Table
              data={filteredResponses}
              columns={createTableColumns()}
              loading={isLoading}
              error={error}
              emptyMessage="No responses found for the current filters"
              sortable={true}
              striped={true}
              hover={true}
              pagination={true}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              totalItems={filteredResponses.length}
            />
            
            {/* Page Size Selector */}
            {filteredResponses.length > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
                <div>
                  Total: {filteredResponses.length} response{filteredResponses.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Cards View */
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
                                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mr-2">
                                          Q{index + 1}
                                        </span>
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                        {field.applicableToWards && (
                                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                            Ward-specific
                                          </span>
                                        )}
                                      </label>
                                      
                                      {/* Show ward data for ward-applicable questions - only ward answers, no main answer */}
                                      {field.applicableToWards && response.wardData && Object.keys(response.wardData).length > 0 ? (
                                        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                                          <h5 className="text-sm font-medium text-orange-800 mb-3 flex items-center">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            Ward-specific Answers
                                          </h5>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {Object.entries(response.wardData).map(([wardId, wardResponses]) => {
                                              const fieldKey = `field_${index}`;
                                              const wardAnswer = wardResponses[fieldKey];
                                              return (
                                                <div key={wardId} className="bg-white border border-orange-200 rounded-md p-3">
                                                  <div className="flex items-center mb-2">
                                                    <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                                                      <span className="text-xs font-medium text-orange-600">W</span>
                                                    </div>
                                                    <span className="text-xs font-medium text-orange-700">
                                                      {wardNames[wardId] || `Ward ${wardId.slice(-4)}`}
                                                    </span>
                                                  </div>
                                                  <div className="text-sm text-gray-900">
                                                    {wardAnswer !== undefined && wardAnswer !== null && wardAnswer !== '' ? (
                                                      <span>{String(wardAnswer)}</span>
                                                    ) : (
                                                      <span className="text-gray-400 italic">No response</span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ) : field.applicableToWards ? (
                                        <div className="text-sm text-gray-500 italic">No ward-specific data available</div>
                                      ) : (
                                        <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                                          {renderFieldValue(field, response.responses?.[field.label])}
                                        </div>
                                      )}
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


                            {/* Sitting Ward Fields - Only show if ward is a sitting ward or has sitting ward responses */}
                            {form?.sittingWardFields && form.sittingWardFields.length > 0 && (response.ward?.isSittingWard || hasSittingWardResponses(response)) && (
                              <div className="mt-8">
                                <div className="border-t border-gray-200 pt-6">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    Sitting Ward Questions
                                  </h3>
                                  <div className="space-y-4">
                                    {form.sittingWardFields.map((field, index) => {
                                      // Try different ways to get the field value for sitting ward fields
                                      let fieldValue = null;
                                      if (response.responses) {
                                        // Try different key formats for sitting ward fields
                                        const sittingWardKey = `sittingWard_${field.label}`;
                                        fieldValue = response.responses[sittingWardKey];

                                        // If not found, try other possible formats
                                        if (fieldValue === undefined) {
                                          const possibleKeys = [
                                            `sittingWard_field_${index}`,
                                            `sittingWard_${index}`,
                                            field.label,
                                            `field_${form.fields.length + index}` // Continue numbering from regular fields
                                          ];

                                          for (const key of possibleKeys) {
                                            if (response.responses[key] !== undefined) {
                                              fieldValue = response.responses[key];
                                              break;
                                            }
                                          }
                                        }

                                        // Try case-insensitive matching
                                        if (fieldValue === undefined) {
                                          const keys = Object.keys(response.responses);
                                          const matchingKey = keys.find(key =>
                                            key.toLowerCase().includes(field.label?.toLowerCase()) ||
                                            key.toLowerCase().includes('sittingward')
                                          );
                                          if (matchingKey) {
                                            fieldValue = response.responses[matchingKey];
                                          }
                                        }
                                      }

                                      return (
                                        <div key={`sitting-${index}`} className="bg-green-50 border border-green-200 rounded-lg p-4">
                                          <div className="flex items-start space-x-4">
                                            <div className="flex-1">
                                              <label className="block text-sm font-medium text-green-700 mb-2">
                                                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold mr-2">
                                                  SW{index + 1}
                                                </span>
                                                {field.label}
                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                              </label>
                                              <div className="text-sm text-gray-900 bg-white p-3 rounded-md border border-green-200">
                                                {renderFieldValue(field, fieldValue)}
                                              </div>
                                            </div>
                                            <div className="flex-shrink-0">
                                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-600">
                                                {field.type}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Handle sub-questions for sitting ward fields */}
                                          {field.subQuestions && field.subQuestions.length > 0 && (
                                            <div className="mt-4 space-y-3">
                                              <div className="text-xs font-medium text-green-600 uppercase tracking-wide">Related Questions</div>
                                              <div className="ml-4 space-y-3 border-l-2 border-green-300 pl-4">
                                                {field.subQuestions.map((subQuestion, subIndex) => {
                                                  // Check if sub-questions should be shown based on parent answer
                                                  let shouldShowSubQuestion = true;

                                                  if (field.showSubQuestionsWhen) {
                                                    if (field.type === 'yesno') {
                                                      const parentIsYes = fieldValue === 'Yes' || fieldValue === 'yes' || fieldValue === true;
                                                      shouldShowSubQuestion = (field.showSubQuestionsWhen === 'yes' && parentIsYes) ||
                                                        (field.showSubQuestionsWhen === 'no' && !parentIsYes);
                                                    } else if (field.type === 'select') {
                                                      shouldShowSubQuestion = fieldValue === field.showSubQuestionsWhen;
                                                    }
                                                  }

                                                  if (!shouldShowSubQuestion) {
                                                    return null;
                                                  }

                                                  // Try to find sub-question value for sitting ward
                                                  let subValue = null;
                                                  if (response.responses) {
                                                    // Try different key formats for sitting ward sub-questions
                                                    const possibleKeys = [
                                                      `sittingWard_${field.label}_${subQuestion.label}`,
                                                      `sittingWard_field_${index}_sub_${subIndex}`,
                                                      `sittingWard_${index}_sub_${subIndex}`,
                                                      `${field.label}_sub_${subQuestion.label}`,
                                                      `field_${form.fields.length + index}_sub_${subIndex}`
                                                    ];

                                                    for (const key of possibleKeys) {
                                                      if (response.responses[key] !== undefined) {
                                                        subValue = response.responses[key];
                                                        break;
                                                      }
                                                    }

                                                    // Try case-insensitive matching for sub-questions
                                                    if (subValue === undefined) {
                                                      const keys = Object.keys(response.responses);
                                                      const matchingKey = keys.find(key =>
                                                        key.toLowerCase().includes(subQuestion.label.toLowerCase()) ||
                                                        key.toLowerCase().includes('sittingward')
                                                      );
                                                      if (matchingKey) {
                                                        subValue = response.responses[matchingKey];
                                                      }
                                                    }
                                                  }

                                                  return (
                                                    <div key={subIndex} className="bg-green-100 border border-green-300 rounded-md p-3">
                                                      <label className="block text-sm font-medium text-green-800 mb-1">
                                                        <span className="inline-flex items-center px-1.5 py-0.5 bg-green-200 text-green-900 rounded text-xs font-semibold mr-2">
                                                          SW{index + 1}.{subIndex + 1}
                                                        </span>
                                                        {subQuestion.label}
                                                        {subQuestion.required && <span className="text-red-500 ml-1">*</span>}
                                                      </label>
                                                      <div className="text-sm text-gray-900 bg-white p-2 rounded border border-green-200">
                                                        {renderFieldValue(subQuestion, subValue)}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
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
        )}

        {/* Response Details Modal */}
        {selectedResponse && (() => {
          console.log('Modal opened with selectedResponse:', {
            hasWardData: !!selectedResponse.wardData,
            wardDataKeys: Object.keys(selectedResponse.wardData || {}),
            wardDataLength: Object.keys(selectedResponse.wardData || {}).length,
            wardData: selectedResponse.wardData
          });
          return null;
        })()}
        {selectedResponse && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Response Details - {selectedResponse.respondent?.name || 'Unknown User'}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedResponse(null)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {form?.fields && form.fields.length > 0 ? (
                    form.fields.map((field, index) => {
                      // Handle cluster-applicable fields
                      if (field.applicableToClusters) {
                        return (
                          <ClusterResponseSummary
                            key={field._id || field.id}
                            field={field}
                            responses={selectedResponse.responses}
                            clusters={clusters}
                            questionIndex={index}
                            getClusterName={getClusterName}
                            renderFieldValue={renderFieldValue}
                          />
                        );
                      }

                      return (
                        <div key={field._id || field.id} className="border-b border-gray-100 pb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mr-2">
                              Q{index + 1}
                            </span>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                            {field.applicableToWards && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Ward-specific
                              </span>
                            )}
                          </label>
                        
                        {/* Show ward data for ward-applicable questions - only ward answers, no main answer */}
                        {field.applicableToWards && selectedResponse.wardData && Object.keys(selectedResponse.wardData).length > 0 ? (
                          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-orange-800 mb-3 flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              Ward-specific Answers
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.entries(selectedResponse.wardData).map(([wardId, wardResponses]) => {
                                const fieldKey = `field_${index}`;
                                const wardAnswer = wardResponses[fieldKey];
                                return (
                                  <div key={wardId} className="bg-white border border-orange-200 rounded-md p-3">
                                    <div className="flex items-center mb-2">
                                      <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                                        <span className="text-xs font-medium text-orange-600">W</span>
                                      </div>
                                      <span className="text-xs font-medium text-orange-700">
                                        {wardNames[wardId] || `Ward ${wardId.slice(-4)}`}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-900">
                                      {wardAnswer !== undefined && wardAnswer !== null && wardAnswer !== '' ? (
                                        <span>{String(wardAnswer)}</span>
                                      ) : (
                                        <span className="text-gray-400 italic">No response</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : field.applicableToWards ? (
                          <div className="text-sm text-gray-500 italic">No ward-specific data available</div>
                        ) : (
                          <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                            {renderFieldValue(field, selectedResponse.responses?.[field.label])}
                          </div>
                        )}
                      </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500">No form fields available</p>
                  )}

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}