import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import axios from 'axios';

const ReportModal = ({ isOpen, onClose, report }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && report) {
      fetchReportDetails();
    }
  }, [isOpen, report]);

  const fetchReportDetails = async () => {
    if (!report?._id) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/forms/responses/${report.formTemplate || report.form?._id}?responseId=${report._id}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report details:', error);
      setReportData(report); // Fallback to basic report data
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    return value.toString();
  };

  const renderFormData = (data) => {
    if (!data || !data.responses) return null;

    return (
      <div className="space-y-4">
        {Object.entries(data.responses).map(([key, value]) => (
          <div key={key} className="border-b border-gray-200 pb-3">
            <dt className="text-sm font-medium text-gray-500 capitalize">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatValue(value)}
            </dd>
          </div>
        ))}
      </div>
    );
  };

  if (!report) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={report.form?.title || 'Report Details'} size="lg">
      <div className="space-y-6">
        {/* Report Header */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-800">
                  {report.form?.title || 'Report'}
                </h4>
                <div className="mt-2 space-y-1 text-sm text-green-700">
                  <p>Submitted by: {report.user?.name || 'Unknown User'}</p>
                  <p>Date: {new Date(report.submittedAt).toLocaleString()}</p>
                  {report.ward && (
                    <p>Ward: {report.ward.name}, {report.ward.district}</p>
                  )}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Submitted
            </span>
          </div>
        </div>

        {/* Report Content */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Report Data</h4>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading report details...</p>
            </div>
          ) : reportData ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              {renderFormData(reportData)}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-500 text-center">No detailed data available</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              const url = `/admin/forms/responses/${report.formTemplate || report.form?._id}?responseId=${report._id}`;
              window.open(url, '_blank');
            }}
          >
            View Full Report
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportModal;