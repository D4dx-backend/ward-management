import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import { ShimmerDashboard } from '../../../../components/Shimmer';

export default function ViewCoordinatorReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [report, setReport] = useState(null);
  const [formTemplate, setFormTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
    if (id) {
      fetchReport();
    }
  }, [session, status, id]);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await axios.get(`/api/responses/${id}`);
      const reportData = response.data;

      // Verify this report belongs to the current coordinator
      if (reportData.respondent._id !== session.user.id) {
        setError('Access denied. You can only view your own reports.');
        return;
      }

      setReport(reportData);

      // Fetch the form template to get field definitions
      if (reportData.formTemplate) {
        const templateResponse = await axios.get(`/api/forms/${reportData.formTemplate._id}`);
        setFormTemplate(templateResponse.data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      if (error.response?.status === 404) {
        setError('Report not found.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You can only view your own reports.');
      } else {
        setError('Failed to load report. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWeekRange = (weekNumber, year) => {
    const startDate = new Date(year, 0, 1 + (weekNumber - 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return `${startDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}`;
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

  const canEditReport = () => {
    return formTemplate?.allowEditAfterSubmission || false;
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">View Report</h1>
            <Link href="/coordinator/reports" className="text-blue-600 hover:text-blue-800">
              ← Back to Reports
            </Link>
          </div>
          
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p>{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">View Report</h1>
            <Link href="/coordinator/reports" className="text-blue-600 hover:text-blue-800">
              ← Back to Reports
            </Link>
          </div>
          
          <div className="text-center py-8">
            <p className="text-gray-600">Report not found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">View Report</h1>
            <p className="mt-1 text-sm text-gray-600">
              {report.formTemplate?.title || 'Coordinator Report'}
            </p>
          </div>
          <div className="flex space-x-3">
            {canEditReport() && (
              <Link
                href={`/coordinator/reports/edit/${report._id}`}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Edit Report
              </Link>
            )}
            <Link
              href="/coordinator/reports"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Back to Reports
            </Link>
          </div>
        </div>

        {/* Report Metadata */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Report Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Form Title</label>
                <p className="mt-1 text-sm text-gray-900">{report.formTemplate?.title || 'Unknown Form'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Week</label>
                <p className="mt-1 text-sm text-gray-900">
                  Week {report.weekNumber} ({report.year})
                  <br />
                  <span className="text-gray-600">{getWeekRange(report.weekNumber, report.year)}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Submitted Date</label>
                <p className="mt-1 text-sm text-gray-900">{formatDateTime(report.submittedAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className="mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Submitted
                </span>
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
                {formTemplate.fields.map((field, index) => (
                  <div key={field.id || index} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="mt-1">
                      {renderFieldValue(field, report.responses[field.label])}
                    </div>
                    
                    {/* Handle sub-questions */}
                    {field.subQuestions && field.subQuestions.length > 0 && (
                      <div className="mt-4 ml-4 space-y-3">
                        {field.subQuestions.map((subQuestion, subIndex) => {
                          const subKey = `${field.label}_${subQuestion.label}`;
                          const shouldShow = field.showSubQuestionsWhen ? 
                            (report.responses[field.label]?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || 
                             report.responses[field.label] === field.showSubQuestionsWhen) : true;
                          
                          if (!shouldShow) return null;
                          
                          return (
                            <div key={subIndex} className="border-l-2 border-gray-200 pl-4">
                              <label className="block text-sm font-medium text-gray-600 mb-1">
                                {subQuestion.label}
                                {subQuestion.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <div className="mt-1">
                                {renderFieldValue(subQuestion, report.responses[subKey])}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(report.responses || {}).map(([key, value]) => (
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
        </Card>
      </div>
    </Layout>
  );
}