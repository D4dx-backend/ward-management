import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Card from './Card';
import Button from './Button';
import Modal from './Modal';

export default function CoordinatorReportsList({ type = 'submitted', title = 'Reports' }) {
  const { data: session } = useSession();
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (session?.user?.role === 'coordinator') {
      fetchReports();
    }
  }, [session, type]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await axios.get(`/api/coordinator/reports?type=${type}&limit=10`);
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Error fetching coordinator reports:', error);
      setError('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReport = async (report) => {
    try {
      if (type === 'submitted') {
        // Fetch full report details for submitted reports
        const response = await axios.get(`/api/coordinator/reports/${report._id}`);
        setSelectedReport(response.data);
      } else {
        // For pending reports, just show the form details
        setSelectedReport(report);
      }
      setShowReportModal(true);
    } catch (error) {
      console.error('Error fetching report details:', error);
      alert('Failed to load report details');
    }
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
      day: 'numeric'
    });
  };

  const renderReportContent = () => {
    if (!selectedReport) return null;

    if (type === 'submitted' && selectedReport.responses) {
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
            <div className="space-y-3">
              {selectedReport.formTemplate?.fields?.map((field, index) => (
                <div key={index} className="border-b border-gray-200 pb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="text-sm text-gray-900">
                    {selectedReport.responses[field.label] || 'No response provided'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    } else {
      // Render pending report form details
      return (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-yellow-800">This report is pending submission</p>
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
                <p className="text-gray-900">{formatDate(selectedReport.closeDateTime)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={() => window.open(`/coordinator/reports/submit?formId=${selectedReport._id}`, '_blank')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Submit Report
            </Button>
          </div>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {reports.length}
            </span>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  {type === 'submitted' ? 'No submitted reports' : 'No pending reports'}
                </p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleViewReport(report)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {type === 'submitted' 
                            ? (report.formTemplate?.title || report.title)
                            : report.title
                          }
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(type)}`}>
                          {type}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>Week {report.weekNumber}/{report.year}</p>
                        {type === 'submitted' ? (
                          <p>Submitted: {formatDate(report.submittedAt)}</p>
                        ) : (
                          <p>Due: {formatDate(report.closeDateTime)}</p>
                        )}
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

          {reports.length > 0 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/coordinator/reports', '_blank')}
              >
                View All Reports
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Report Details Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedReport(null);
        }}
        title={`${type === 'submitted' ? 'Submitted' : 'Pending'} Report Details`}
        size="lg"
      >
        {renderReportContent()}
      </Modal>
    </>
  );
}