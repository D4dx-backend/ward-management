import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import axios from 'axios';

export default function SICReports() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pendingExpanded, setPendingExpanded] = useState(true); // Pending expanded by default
  const [submittedExpanded, setSubmittedExpanded] = useState(false); // Submitted collapsed by default
  const [pendingReports, setPendingReports] = useState([]);
  const [submittedReports, setSubmittedReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [wardNames, setWardNames] = useState({});
  const [formTemplate, setFormTemplate] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      console.log('User authenticated as coordinator, fetching reports...');
      console.log('Session details:', {
        userId: session.user.id,
        userRole: session.user.role,
        userEmail: session.user.email
      });
      fetchReports();
    }
  }, [status, session, router]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setError('');

      console.log('Fetching SIC reports...');
      
      const [pendingResponse, submittedResponse] = await Promise.all([
        axios.get('/api/coordinator/reports?type=pending&limit=20'),
        axios.get('/api/coordinator/reports?type=submitted&limit=20')
      ]);

      console.log('SIC reports fetched successfully');
      setPendingReports(pendingResponse.data.reports || []);
      setSubmittedReports(submittedResponse.data.reports || []);
    } catch (error) {
      console.error('Error fetching SIC reports:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 401) {
        setError('Authentication failed. Please try logging out and logging back in.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to view these reports.');
      } else {
        setError(`Failed to load reports: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReport = async (report, type) => {
    try {
      if (type === 'submitted') {
        // Fetch full report details for submitted reports
        const response = await axios.get(`/api/coordinator/reports/${report._id}`);
        const reportData = response.data;
        
        // Log ward data for debugging
        console.log('SIC Reports View - Ward Data:', {
          wardData: reportData.wardData,
          wardDataKeys: Object.keys(reportData.wardData || {}),
          wardDataLength: Object.keys(reportData.wardData || {}).length
        });
        
        // Fetch ward names if wardData exists
        if (reportData.wardData && Object.keys(reportData.wardData).length > 0) {
          try {
            const wardIds = Object.keys(reportData.wardData);
            const wardResponse = await axios.get('/api/coordinator/wards');
            const wardNamesMap = {};
            wardResponse.data.forEach(ward => {
              if (wardIds.includes(ward._id)) {
                wardNamesMap[ward._id] = ward.name;
              }
            });
            setWardNames(wardNamesMap);
            console.log('SIC Reports - Fetched ward names:', wardNamesMap);
          } catch (error) {
            console.error('Error fetching ward names:', error);
          }
        }
        
        // Fetch the form template to get field definitions
        if (reportData.formTemplate) {
          try {
            const templateResponse = await axios.get(`/api/forms/${reportData.formTemplate._id}`);
            setFormTemplate(templateResponse.data);
            console.log('SIC Reports - Fetched form template:', templateResponse.data);
          } catch (error) {
            console.error('Error fetching form template:', error);
          }
        }
        
        setSelectedReport({ ...reportData, reportType: 'submitted' });
        setShowReportModal(true);
      } else {
        // For pending reports, navigate directly to the editable form
        router.push(`/coordinator/reports/submit?formId=${report._id}`);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
      alert('Failed to load report details');
    }
  };

  const handleSubmitReport = (reportId) => {
    router.push(`/coordinator/reports/submit?formId=${reportId}`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      submitted: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (report) => {
    if (!report.closeDateTime) return false;
    return new Date() > new Date(report.closeDateTime);
  };

  const renderFieldValue = (field, value) => {
    if (value === undefined || value === null || value === '') {
      return <span className="text-gray-400 italic">Not provided</span>;
    }

    switch (field.type) {
      case 'checkbox':
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Yes' : 'No'}
          </span>
        );
      case 'textarea':
        return (
          <div className="whitespace-pre-wrap bg-gray-50 p-3 rounded border">
            {value}
          </div>
        );
      case 'select':
        return <span className="font-medium">{value}</span>;
      case 'number':
        return <span className="font-mono">{value}</span>;
      default:
        return <span>{value}</span>;
    }
  };

  const renderReportContent = () => {
    if (!selectedReport) return null;

    if (selectedReport.reportType === 'submitted' && selectedReport.responses) {
      // Render submitted report responses
      return (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Form:</span>
                <p className="text-gray-900">{selectedReport.formTemplate?.title || 'Unknown Form'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Submitted:</span>
                <p className="text-gray-900">{formatDate(selectedReport.submittedAt)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Week:</span>
                <p className="text-gray-900">{selectedReport.weekNumber}/{selectedReport.year}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">District:</span>
                <p className="text-gray-900">{selectedReport.district}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Report Responses</h4>
            <div className="space-y-6">
              {formTemplate && formTemplate.fields ? (
                formTemplate.fields.map((field, index) => (
                  <div key={field.id || index} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {field.applicableToWards && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Ward-specific
                        </span>
                      )}
                    </label>
                  
                    {/* Show ward data for ward-applicable questions - only ward answers, no main answer */}
                    {field.applicableToWards && selectedReport.wardData && Object.keys(selectedReport.wardData).length > 0 ? (
                      <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-orange-800 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          Ward-specific Answers
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(selectedReport.wardData).map(([wardId, wardResponses]) => {
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
                                    renderFieldValue(field, wardAnswer)
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
                      <div className="mt-1">
                        {renderFieldValue(field, selectedReport.responses[field.label])}
                      </div>
                    )}
                    
                    {/* Handle sub-questions */}
                    {field.subQuestions && field.subQuestions.length > 0 && (
                      <div className="mt-4 ml-4 space-y-3">
                        {field.subQuestions.map((subQuestion, subIndex) => {
                          const subKey = `${field.label}_${subQuestion.label}`;
                          const shouldShow = field.showSubQuestionsWhen ? 
                            (selectedReport.responses[field.label]?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || 
                             selectedReport.responses[field.label] === field.showSubQuestionsWhen) : true;
                          
                          if (!shouldShow) return null;
                          
                          return (
                            <div key={subIndex} className="border-l-2 border-gray-200 pl-4">
                              <label className="block text-sm font-medium text-gray-600 mb-1">
                                {subQuestion.label}
                                {subQuestion.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <div className="mt-1">
                                {renderFieldValue(subQuestion, selectedReport.responses[subKey])}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                  {Object.entries(selectedReport.responses || {}).map(([key, value]) => (
                    <div key={key} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {key}
                      </label>
                      <div className="mt-1">
                        {value !== undefined && value !== null && value !== '' ? (
                          <span>{String(value)}</span>
                        ) : (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else {
      // Render pending report form details
      return (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${
            isOverdue(selectedReport) 
              ? 'bg-red-50 border-red-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center">
              <svg className={`w-5 h-5 mr-2 ${
                isOverdue(selectedReport) ? 'text-red-600' : 'text-yellow-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className={`text-sm ${
                isOverdue(selectedReport) ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {isOverdue(selectedReport) 
                  ? 'This report is overdue for submission' 
                  : 'This report is pending submission'
                }
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Form:</span>
                <p className="text-gray-900">{selectedReport.title}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Type:</span>
                <p className="text-gray-900">{selectedReport.formType}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Week:</span>
                <p className="text-gray-900">{selectedReport.weekNumber}/{selectedReport.year}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Due Date:</span>
                <p className={`${
                  isOverdue(selectedReport) ? 'text-red-600 font-medium' : 'text-gray-900'
                }`}>
                  {formatDate(selectedReport.closeDateTime)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={() => handleSubmitReport(selectedReport._id)}
              className={`${
                isOverdue(selectedReport) 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isOverdue(selectedReport) ? 'Submit Overdue Report' : 'Submit Report'}
            </Button>
          </div>
        </div>
      );
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>SIC Reports - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SIC Reports</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your coordinator reports - view pending submissions and submitted reports
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm">{error}</p>
              <Button
                onClick={fetchReports}
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Accordion Style Reports */}
        <div className="space-y-4">
          {/* Pending Reports Section - Expanded by Default */}
          <Card>
            <div className="border-b border-gray-200">
              <button
                onClick={() => setPendingExpanded(!pendingExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium text-gray-900">Pending Reports</h3>
                  {pendingReports.length > 0 && (
                    <span className="bg-yellow-100 text-yellow-800 py-1 px-3 rounded-full text-sm font-medium">
                      {pendingReports.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={(e) => { e.stopPropagation(); fetchReports(); }} variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </Button>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      pendingExpanded ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
            </div>
            
            {pendingExpanded && (
              <div className="p-6">
                <div className="space-y-3">
                  {pendingReports.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No pending reports</p>
                    </div>
                  ) : (
                    pendingReports.map((report) => {
                      const reportIsOverdue = isOverdue(report);
                      return (
                        <div
                          key={report._id}
                          className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                            reportIsOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                          }`}
                          onClick={() => handleViewReport(report, 'pending')}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="text-sm font-medium text-gray-900">{report.title}</h4>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  reportIsOverdue 
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {reportIsOverdue ? 'overdue' : 'pending'}
                                </span>
                              </div>
                              
                              <div className="text-sm text-gray-600">
                                <p>Week {report.weekNumber}/{report.year}</p>
                                <p className={reportIsOverdue ? 'text-red-600 font-medium' : ''}>
                                  Due: {formatDate(report.closeDateTime)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="ml-4 flex items-center space-x-2">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubmitReport(report._id);
                                }}
                                className={reportIsOverdue ? 'bg-red-600 hover:bg-red-700' : ''}
                              >
                                Submit
                              </Button>
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Submitted Reports Section - Collapsed by Default */}
          <Card>
            <div className="border-b border-gray-200">
              <button
                onClick={() => setSubmittedExpanded(!submittedExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium text-gray-900">Submitted Reports</h3>
                  {submittedReports.length > 0 && (
                    <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-sm font-medium">
                      {submittedReports.length}
                    </span>
                  )}
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    submittedExpanded ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {submittedExpanded && (
              <div className="p-6">
                <div className="space-y-3">
                  {submittedReports.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No submitted reports</p>
                    </div>
                  ) : (
                    submittedReports.map((report) => (
                      <div
                        key={report._id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewReport(report, 'submitted')}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {report.formTemplate?.title || report.title}
                              </h4>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                submitted
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              <p>Week {report.weekNumber}/{report.year}</p>
                              <p>Submitted: {formatDate(report.submittedAt)}</p>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Report Details Modal */}
        <Modal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedReport(null);
          }}
          title={`${selectedReport?.reportType === 'submitted' ? 'Submitted' : 'Pending'} Report Details`}
          size="lg"
        >
          {renderReportContent()}
        </Modal>
      </div>
    </Layout>
  );
}