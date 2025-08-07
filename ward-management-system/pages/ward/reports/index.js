import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../components/Shimmer';
import { useApiData } from '../../../hooks/useApiData';

export default function WardReports() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableForms, setAvailableForms] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filter, setFilter] = useState({
    formType: 'wardReport',
    weekNumber: '',
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    // Check if user is authenticated and is ward admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchReports();
    }
  }, [status, session, router, filter]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      
      // Fetch both reports and available forms
      const [reportsResponse, formsResponse] = await Promise.all([
        axios.get(`/api/responses?formType=wardReport${filter.weekNumber ? `&weekNumber=${filter.weekNumber}` : ''}${filter.year ? `&year=${filter.year}` : ''}`),
        axios.get('/api/forms?formType=wardReport')
      ]);
      
      // Process reports data
      const responseData = reportsResponse.data;
      let reportsData = [];
      if (Array.isArray(responseData)) {
        reportsData = responseData;
      } else if (responseData && Array.isArray(responseData.reports)) {
        reportsData = responseData.reports;
      } else if (responseData && Array.isArray(responseData.data)) {
        reportsData = responseData.data;
      }
      
      setReports(reportsData);
      setAvailableForms(formsResponse.data || []);
      setError('');
    } catch (error) {
      setError('Failed to fetch reports');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowViewModal(true);
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
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
      <Head>
        <title>My Ward Reports - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Ward Reports</h1>
            <p className="mt-1 text-sm text-gray-600">View your submitted ward reports</p>
          </div>
          {availableForms.length > 0 && (
            <Link href="/ward/reports/submit" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit New Report
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filter Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                <input
                  type="number"
                  value={filter.weekNumber}
                  onChange={(e) => setFilter({ ...filter, weekNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter week number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={filter.year}
                  onChange={(e) => setFilter({ ...filter, year: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => setFilter({
                    formType: 'wardReport',
                    weekNumber: '',
                    year: new Date().getFullYear(),
                  })}
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(reports) && reports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {report.formTemplate?.title || 'Unknown Form'}
                        </div>
                        <div className="text-sm text-gray-500">
                          District: {report.district}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.ward?.name || 'Unknown Ward'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Week {report.weekNumber}, {report.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(report.submittedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Submitted
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                        {/* Edit functionality can be added here if needed */}
                      </div>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm">No reports found</p>
                        {availableForms.length > 0 ? (
                          <p className="mt-1 text-sm text-gray-400">
                            <Link href="/ward/reports/submit" className="text-blue-600 hover:text-blue-800">
                              Submit your first report
                            </Link>
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-gray-400">
                            No report forms are currently available for submission
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* View Report Details Modal */}
        {showViewModal && selectedReport && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Report Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Report Header */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Form Title</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedReport.formTemplate?.title || 'Unknown Form'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ward</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedReport.ward?.name || 'Unknown Ward'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Period</label>
                      <p className="mt-1 text-sm text-gray-900">Week {selectedReport.weekNumber}, {selectedReport.year}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Submitted</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedReport.submittedAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Report Responses */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Report Responses</h4>
                  <div className="space-y-4">
                    {selectedReport.responses && Object.entries(selectedReport.responses).map(([question, answer]) => (
                      <div key={question} className="border-l-4 border-blue-200 pl-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{question}</label>
                        <div className="text-sm text-gray-900">
                          {typeof answer === 'boolean' ? (answer ? 'Yes' : 'No') : 
                           typeof answer === 'object' ? JSON.stringify(answer, null, 2) : 
                           answer || 'No response'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Information */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">District:</span> {selectedReport.district}
                    </div>
                    <div>
                      <span className="font-medium">Form Type:</span> {selectedReport.formType}
                    </div>
                    <div>
                      <span className="font-medium">Submitted by:</span> {selectedReport.respondent?.name || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Report ID:</span> {selectedReport._id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </Button>
                {/* Edit button can be added here if editing is allowed */}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}