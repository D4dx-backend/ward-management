import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Card from './Card';
import Button from './Button';
import ClusterResponseSummary from './ClusterResponseSummary';

export default function WardReportDetailView({ 
  reportId, 
  role = 'coordinator', // 'coordinator', 'stateAdmin', 'wardAdmin', or 'ward'
  onBack,
  showEditButton = true 
}) {
  const [report, setReport] = useState(null);
  const [formTemplate, setFormTemplate] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [wardNames, setWardNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reportId) {
      fetchReportDetail();
    }
  }, [reportId]);

  const fetchReportDetail = async () => {
    setLoading(true);
    try {
      console.log('Fetching report detail for ID:', reportId);
      const response = await axios.get(`/api/responses/${reportId}`);
      console.log('Report detail response:', response.data);
      const reportData = response.data;
      setReport(reportData);
      setError('');

      // Fetch the form template to get field definitions
      if (reportData.formTemplate) {
        try {
          const templateResponse = await axios.get(`/api/forms/${reportData.formTemplate._id}`);
          setFormTemplate(templateResponse.data);
          console.log('Ward Report Detail - Fetched form template:', templateResponse.data);
        } catch (error) {
          console.error('Error fetching form template:', error);
          setFormTemplate(null);
        }
      }

      // Fetch clusters for the ward if there are cluster-applicable fields
      const hasClusterFields = reportData.formTemplate?.fields?.some(field => field.applicableToClusters);
      console.log('Ward Report Detail - Cluster fields check:', {
        hasClusterFields,
        wardId: reportData.ward?._id,
        formTemplateFields: reportData.formTemplate?.fields?.map(f => ({ label: f.label, applicableToClusters: f.applicableToClusters }))
      });
      
      if (hasClusterFields && reportData.ward?._id) {
        try {
          console.log('Ward Report Detail - Fetching clusters for ward:', reportData.ward._id);
          const clustersResponse = await axios.get(`/api/clusters?wardId=${reportData.ward._id}`);
          console.log('Ward Report Detail - Clusters API response:', clustersResponse.data);
          setClusters(clustersResponse.data || []);
          console.log('Ward Report Detail - Fetched clusters:', clustersResponse.data?.length || 0);
        } catch (error) {
          console.error('Error fetching clusters:', error);
          console.error('Cluster fetch error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          
          // If clusters fetch fails, try to get clusters from the ward data or create empty array
          // This ensures the component doesn't break if cluster data is unavailable
          setClusters([]);
        }
      } else {
        console.log('Ward Report Detail - No cluster fields or ward ID, skipping cluster fetch');
        setClusters([]);
      }

      // Fetch ward names if this is a coordinator report with ward data
      if (reportData.wardData && Object.keys(reportData.wardData).length > 0) {
        try {
          console.log('Ward Report Detail - Fetching ward names for ward data');
          const wardIds = Object.keys(reportData.wardData);
          const wardNamesMap = {};
          
          // Fetch ward names for all wards in wardData
          await Promise.all(
            wardIds.map(async (wardId) => {
              try {
                const wardResponse = await axios.get(`/api/wards/${wardId}`);
                wardNamesMap[wardId] = wardResponse.data.name;
              } catch (err) {
                console.error(`Error fetching ward ${wardId}:`, err);
                wardNamesMap[wardId] = `Ward ${wardId.slice(-4)}`;
              }
            })
          );
          
          setWardNames(wardNamesMap);
          console.log('Ward Report Detail - Fetched ward names:', wardNamesMap);
        } catch (error) {
          console.error('Error fetching ward names:', error);
          setWardNames({});
        }
      }
    } catch (error) {
      console.error('Error fetching report detail:', error);
      let errorMessage = 'Failed to fetch report details';
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view this report.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Report not found. The report may have been deleted or the ID is invalid.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const hasSittingWardResponses = (report) => {
    if (!report.responses) return false;
    const keys = Object.keys(report.responses);
    return keys.some(key => 
      key.toLowerCase().includes('sittingward') || 
      key.toLowerCase().includes('sitting')
    );
  };

  const renderResponseValue = (value) => {
    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    
    if (typeof value === 'object' && value !== null) {
      return (
        <div className="bg-gray-50 p-3 rounded border">
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(value, null, 2)}</pre>
        </div>
      );
    }

    if (typeof value === 'string' && value.length > 100) {
      return (
        <div className="bg-gray-50 p-3 rounded border">
          <p className="whitespace-pre-wrap text-sm">{value}</p>
        </div>
      );
    }
    
    return <span className="text-sm text-gray-900">{String(value)}</span>;
  };

  // Get navigation paths based on role
  const getNavigationPaths = () => {
    switch (role) {
      case 'stateAdmin':
        return {
          dashboard: '/admin',
          allReports: '/admin/reports',
          editReport: `/admin/reports/edit/${reportId}`,
        };
      case 'wardAdmin':
      case 'ward':
        return {
          dashboard: '/ward',
          allReports: '/ward/reports',
          editReport: `/ward/reports/edit/${reportId}`,
        };
      case 'coordinator':
      default:
        return {
          dashboard: '/coordinator',
          allReports: '/coordinator/ward-reports',
          editReport: `/coordinator/ward-reports/edit/${reportId}`,
        };
    }
  };

  const paths = getNavigationPaths();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report Detail</h1>
            <p className="mt-1 text-sm text-gray-600">Unable to load report details</p>
          </div>
          <Link href={paths.dashboard}>
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
        
        <Card>
          <div className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchReportDetail}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report Not Found</h1>
            <p className="mt-1 text-sm text-gray-600">The requested report could not be found</p>
          </div>
          <Link href={paths.dashboard}>
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{`${report.ward?.name} - Week ${report.weekNumber} Report - Ward Management System`}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {report.ward?.name} - Week {report.weekNumber} Report
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Detailed view of ward report for week {report.weekNumber}, {report.year}
            </p>
          </div>
          <div className="flex space-x-3">
            {showEditButton && (
              <Link href={paths.editReport}>
                <Button variant="primary">
                  <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Report
                </Button>
              </Link>
            )}
            <Link href={paths.allReports}>
              <Button variant="outline">All Reports</Button>
            </Link>
            <Link href={paths.dashboard}>
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* Report Summary */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Report Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Ward</div>
                <div className="text-lg font-semibold text-gray-900">{report.ward?.name}</div>
                <div className="text-sm text-gray-500">{report.ward?.district}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Week/Year</div>
                <div className="text-lg font-semibold text-gray-900">Week {report.weekNumber}</div>
                <div className="text-sm text-gray-500">{report.year}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Submitted By</div>
                <div className="text-lg font-semibold text-gray-900">{report.respondent?.name}</div>
                <div className="text-sm text-gray-500">{report.respondent?.role}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Submitted At</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(report.submittedAt)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Report Responses */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Report Responses</h3>
            
            {formTemplate && formTemplate.fields ? (
              <div className="space-y-6">
                {formTemplate.fields.map((field, index) => {
                  // Handle cluster-applicable fields
                  if (field.applicableToClusters) {
                    // If no clusters are available, show a message but still render the field
                    if (!clusters || clusters.length === 0) {
                      return (
                        <div key={field.id || index} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-900">
                              <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold mr-2">
                                Q{index + 1}
                              </span>
                              {field.label}
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Cluster Question
                              </span>
                            </h4>
                            {field.required && (
                              <span className="text-xs text-red-500">Required</span>
                            )}
                          </div>
                          <div className="text-sm text-orange-700 bg-orange-100 p-3 rounded-md">
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span>Cluster data is not available for this ward. This question requires cluster information to be displayed properly.</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <ClusterResponseSummary
                        key={field.id || index}
                        field={field}
                        responses={report.responses || {}}
                        clusters={clusters}
                        questionIndex={index}
                        getClusterName={(clusterId) => {
                          const cluster = clusters.find(c => c._id === clusterId);
                          return cluster ? cluster.name : `Cluster ${clusterId.slice(-4)}`;
                        }}
                        renderFieldValue={(field, value) => {
                          if (value === undefined || value === null || value === '') {
                            return <span className="text-gray-400 italic">Not answered</span>;
                          }
                          return renderResponseValue(value);
                        }}
                      />
                    );
                  }

                  // Handle ward-applicable fields (ward iteration)
                  if (field.applicableToWards) {
                    return (
                      <div key={field.id || index} className="border-l-4 border-orange-500 pl-6 py-3">
                        <div className="flex flex-col space-y-2">
                          <h4 className="text-sm font-medium text-gray-900 leading-relaxed">
                            <span className="inline-flex items-center justify-center w-6 h-6 mr-3 text-xs font-bold text-white bg-orange-500 rounded-full">
                              {index + 1}
                            </span>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Ward-specific
                            </span>
                          </h4>
                          
                          {/* Show ward data for ward-applicable questions */}
                          {report.wardData && Object.keys(report.wardData).length > 0 ? (
                            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <h5 className="text-sm font-medium text-orange-800 mb-3 flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Ward-specific Answers
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(report.wardData).map(([wardId, wardResponses]) => {
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
                                          renderResponseValue(wardAnswer)
                                        ) : (
                                          <span className="text-gray-400 italic">No response</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded">
                              No ward-specific data available
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Handle regular fields
                  const answer = report.responses?.[field.label];
                  return (
                    <div key={field.id || index} className="border-l-4 border-blue-500 pl-6 py-3">
                      <div className="flex flex-col space-y-2">
                        <h4 className="text-sm font-medium text-gray-900 leading-relaxed">
                          <span className="inline-flex items-center justify-center w-6 h-6 mr-3 text-xs font-bold text-white bg-blue-500 rounded-full">
                            {index + 1}
                          </span>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </h4>
                        <div className="text-sm text-gray-700">
                          {answer === undefined || answer === null || answer === '' ? (
                            <span className="text-gray-400 italic">Not answered</span>
                          ) : (
                            renderResponseValue(answer)
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : report.responses && Object.keys(report.responses).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(report.responses).map(([question, answer], index) => {
                  const displayQuestion = question.replace(/_sub_\d+$/, '').replace(/_/g, ' ');
                  return (
                    <div key={index} className="border-l-4 border-blue-500 pl-6 py-3">
                      <div className="flex flex-col space-y-2">
                        <h4 className="text-sm font-medium text-gray-900 leading-relaxed">
                          <span className="inline-flex items-center justify-center w-6 h-6 mr-3 text-xs font-bold text-white bg-blue-500 rounded-full">
                            {index + 1}
                          </span>
                          {displayQuestion}
                        </h4>
                        <div className="text-sm text-gray-700">
                          {renderResponseValue(answer)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No response data available for this report</p>
              </div>
            )}

            {/* Sitting Ward Fields - Only show if ward is a sitting ward or has sitting ward responses */}
            {formTemplate?.sittingWardFields && formTemplate.sittingWardFields.length > 0 && (report.ward?.isSittingWard || hasSittingWardResponses(report)) && (
              <div className="mt-8">
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Sitting Ward Questions
                  </h3>
                  <div className="space-y-6">
                    {formTemplate.sittingWardFields.map((field, index) => {
                      // Try different ways to get the field value for sitting ward fields
                      let fieldValue = null;
                      if (report.responses) {
                        // Try different key formats for sitting ward fields
                        const sittingWardKey = `sittingWard_${field.label}`;
                        fieldValue = report.responses[sittingWardKey];

                        // If not found, try other possible formats
                        if (fieldValue === undefined) {
                          const possibleKeys = [
                            `sittingWard_field_${index}`,
                            `sittingWard_${index}`,
                            field.label,
                            `field_${formTemplate.fields.length + index}` // Continue numbering from regular fields
                          ];

                          for (const key of possibleKeys) {
                            if (report.responses[key] !== undefined) {
                              fieldValue = report.responses[key];
                              break;
                            }
                          }
                        }

                        // Try case-insensitive matching
                        if (fieldValue === undefined) {
                          const keys = Object.keys(report.responses);
                          const matchingKey = keys.find(key =>
                            key.toLowerCase().includes(field.label?.toLowerCase()) ||
                            key.toLowerCase().includes('sittingward')
                          );
                          if (matchingKey) {
                            fieldValue = report.responses[matchingKey];
                          }
                        }
                      }

                      return (
                        <div key={`sitting-${index}`} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-medium text-green-700">
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold mr-2">
                                SW{index + 1}
                              </span>
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </h4>
                          </div>
                          
                          <div className="text-sm text-gray-700 bg-white p-3 rounded border border-green-200">
                            {fieldValue === undefined || fieldValue === null || fieldValue === '' ? (
                              <span className="text-gray-400 italic">Not answered</span>
                            ) : (
                              renderResponseValue(fieldValue)
                            )}
                          </div>

                          {/* Handle sub-questions for sitting ward fields */}
                          {field.subQuestions && field.subQuestions.length > 0 && (
                            <div className="mt-4 ml-4 space-y-3 border-l-2 border-green-300 pl-4">
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
                                if (report.responses) {
                                  // Try different key formats for sitting ward sub-questions
                                  const possibleKeys = [
                                    `sittingWard_${field.label}_${subQuestion.label}`,
                                    `sittingWard_field_${index}_sub_${subIndex}`,
                                    `sittingWard_${index}_sub_${subIndex}`,
                                    `${field.label}_sub_${subQuestion.label}`,
                                    `field_${formTemplate.fields.length + index}_sub_${subIndex}`
                                  ];

                                  for (const key of possibleKeys) {
                                    if (report.responses[key] !== undefined) {
                                      subValue = report.responses[key];
                                      break;
                                    }
                                  }
                                }

                                return (
                                  <div key={`sitting-sub-${index}-${subIndex}`} className="bg-white border border-green-200 rounded p-3">
                                    <h5 className="text-xs font-medium text-green-600 mb-2">
                                      {subQuestion.label}
                                      {subQuestion.required && <span className="text-red-500 ml-1">*</span>}
                                    </h5>
                                    <div className="text-sm text-gray-700">
                                      {subValue === undefined || subValue === null || subValue === '' ? (
                                        <span className="text-gray-400 italic">Not answered</span>
                                      ) : (
                                        renderResponseValue(subValue)
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
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
        </Card>

        {/* Form Template Info */}
        {report.formTemplate && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Form Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Form Title:</span>
                    <span className="ml-2 font-medium">{report.formTemplate.title}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Form Type:</span>
                    <span className="ml-2 font-medium capitalize">{report.formTemplate.formType}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Report ID:</span>
                    <span className="ml-2 font-mono text-xs">{report._id}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 pt-6">
          {showEditButton && (
            <Link href={paths.editReport}>
              <Button variant="primary">
                <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Report
              </Button>
            </Link>
          )}
          {report.ward?._id && (
            <Link href={`/${role === 'stateAdmin' ? 'admin' : (role === 'wardAdmin' ? 'ward' : role)}/ward-analytics/${report.ward._id}?name=${encodeURIComponent(report.ward?.name || '')}`}>
              <Button>View Ward Analytics</Button>
            </Link>
          )}
          <Link href={paths.allReports}>
            <Button variant="outline">View All Reports</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
