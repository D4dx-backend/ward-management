import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ShimmerDashboard, ShimmerTable } from '../../../components/Shimmer';

export default function CoordinatorMyReports() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [formTemplates, setFormTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    formType: 'coordinatorReport',
    weekNumber: '',
    year: new Date().getFullYear(),
  });

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
    
    fetchData();
  }, [session, status, filter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Fetch both reports and form templates
      const [reportsResponse, templatesResponse] = await Promise.all([
        axios.get('/api/responses', {
          params: {
            formType: filter.formType,
            coordinatorId: session.user.id, // Get only this coordinator's reports
            ...(filter.weekNumber && { weekNumber: filter.weekNumber }),
            ...(filter.year && { year: filter.year })
          }
        }),
        axios.get('/api/forms', {
          params: {
            formType: 'coordinatorReport',
            isActive: true
          }
        })
      ]);
      
      setReports(reportsResponse.data || []);
      setFormTemplates(templatesResponse.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const canEditReport = (report) => {
    // Check if the form template allows editing after submission
    const template = formTemplates.find(t => t._id === report.formTemplate?._id);
    return template?.allowEditAfterSubmission || false;
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWeekRange = (weekNumber, year) => {
    const startDate = new Date(year, 0, 1 + (weekNumber - 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return `${startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
            <p className="mt-1 text-sm text-gray-600">View and manage your submitted reports</p>
          </div>
          <Link href="/coordinator/reports/submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Submit New Report
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={filter.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Years</option>
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Week Number
                </label>
                <select
                  value={filter.weekNumber}
                  onChange={(e) => handleFilterChange('weekNumber', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Weeks</option>
                  {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setFilter({ formType: 'coordinatorReport', weekNumber: '', year: new Date().getFullYear() })}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm">{error}</p>
              <button
                onClick={fetchData}
                className="ml-4 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Reports Table */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Submitted Reports</h3>
            <p className="mt-1 text-sm text-gray-600">
              {reports.length} report{reports.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600 mb-4">
                {filter.weekNumber || filter.year !== new Date().getFullYear() 
                  ? 'No reports match your current filters.' 
                  : 'You haven\'t submitted any reports yet.'}
              </p>
              <Link href="/coordinator/reports/submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Submit Your First Report
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.formTemplate?.title || 'Unknown Form'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {report.formTemplate?.formType || 'coordinatorReport'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Week {report.weekNumber} ({report.year})
                        </div>
                        <div className="text-sm text-gray-500">
                          {getWeekRange(report.weekNumber, report.year)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(report.submittedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Submitted
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/coordinator/reports/view/${report._id}`}
                            className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded border border-blue-300 hover:bg-blue-50"
                          >
                            View
                          </Link>
                          {canEditReport(report) && (
                            <Link
                              href={`/coordinator/reports/edit/${report._id}`}
                              className="text-green-600 hover:text-green-900 px-3 py-1 rounded border border-green-300 hover:bg-green-50"
                            >
                              Edit
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}