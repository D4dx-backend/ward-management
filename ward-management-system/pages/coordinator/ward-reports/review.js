import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
export default function CoordinatorWardReportReview() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [wards, setWards] = useState([]);
  const [forms, setForms] = useState([]);
  const [recurringQuestions, setRecurringQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [reportType, setReportType] = useState('all'); // all, form-based, recurring-questions
  
  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringData, setRecurringData] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchInitialData();
    }
  }, [status, session, router]);

  useEffect(() => {
    applyFilters();
  }, [reports, selectedWard, selectedForm, selectedWeek, selectedYear, reportType]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [reportsRes, wardsRes, formsRes, questionsRes] = await Promise.all([
        axios.get('/api/coordinator/ward-reports'),
        axios.get('/api/coordinator/wards'),
        axios.get('/api/forms', { params: { formType: 'wardReport' } }),
        axios.get('/api/recurring-questions')
      ]);

      setReports(reportsRes.data || []);
      setWards(wardsRes.data || []);
      setForms(formsRes.data || []);
      setRecurringQuestions(questionsRes.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    if (selectedWard) {
      filtered = filtered.filter(report => report.ward?._id === selectedWard);
    }

    if (selectedForm) {
      filtered = filtered.filter(report => report.formTemplate?._id === selectedForm);
    }

    if (selectedWeek) {
      filtered = filtered.filter(report => report.weekNumber === parseInt(selectedWeek));
    }

    if (selectedYear) {
      filtered = filtered.filter(report => report.year === parseInt(selectedYear));
    }

    if (reportType !== 'all') {
      if (reportType === 'form-based') {
        filtered = filtered.filter(report => report.formTemplate);
      } else if (reportType === 'recurring-questions') {
        filtered = filtered.filter(report => report.hasRecurringQuestions);
      }
    }

    setFilteredReports(filtered);
  };

  const handleViewReport = async (report) => {
    try {
      const response = await axios.get(`/api/responses/${report._id}`);
      setSelectedReport(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching report details:', error);
      setError('Failed to load report details');
    }
  };

  const handleViewRecurringQuestions = async (wardId, weekNumber, year) => {
    try {
      const response = await axios.get('/api/recurring-questions/ward-responses', {
        params: { wardId, weekNumber, year }
      });
      setRecurringData(response.data);
      setShowRecurringModal(true);
    } catch (error) {
      console.error('Error fetching recurring questions:', error);
      setError('Failed to load recurring questions data');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    
    if (typeof value === 'string' && value.length > 100) {
      return (
        <div className="bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
          <p className="whitespace-pre-wrap text-sm">{value}</p>
        </div>
      );
    }
    
    return <span className="text-sm text-gray-900">{String(value)}</span>;
  };

  if (loading) {
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
        <title>Ward Report Review - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Report Review</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review and analyze ward reports including form-based submissions and recurring questions
            </p>
          </div>
          <div className="flex space-x-3">
            <Link href="/coordinator/recurring-questions/review">
              <Button variant="outline">Recurring Questions</Button>
            </Link>
            <Link href="/coordinator/form-statistics">
              <Button variant="outline">Form Statistics</Button>
            </Link>
            <Link href="/coordinator">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {/* Filters */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Wards</option>
                  {wards.map(ward => (
                    <option key={ward._id} value={ward._id}>
                      {ward.name} ({ward.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form</label>
                <select
                  value={selectedForm}
                  onChange={(e) => setSelectedForm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Forms</option>
                  {forms.map(form => (
                    <option key={form._id} value={form._id}>
                      {form.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Weeks</option>
                  {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Reports</option>
                  <option value="form-based">Form-Based</option>
                  <option value="recurring-questions">Recurring Questions</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button onClick={fetchInitialData} className="w-full">
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Reports Table */}
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Ward Reports ({filteredReports.length})
              </h3>
            </div>

            {filteredReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ward
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Week/Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Form/Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReports.map((report) => (
                      <tr key={report._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {report.ward?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {report.ward?.district}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            Week {report.weekNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {report.year}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {report.formTemplate?.title || 'General Report'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {report.formTemplate ? 'Form-based' : 'Standard'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {report.respondent?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {report.respondent?.role}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(report.submittedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                          {recurringQuestions.length > 0 && (
                            <button
                              onClick={() => handleViewRecurringQuestions(
                                report.ward?._id, 
                                report.weekNumber, 
                                report.year
                              )}
                              className="text-green-600 hover:text-green-900"
                            >
                              Recurring Q&A
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No reports found matching your filters</p>
                <Button 
                  onClick={() => {
                    setSelectedWard('');
                    setSelectedForm('');
                    setSelectedWeek('');
                    setReportType('all');
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Report Detail Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedReport(null);
          }}
          title="Ward Report Details"
          size="xl"
        >
          {selectedReport && (
            <div className="space-y-6">
              {/* Report Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Ward:</span>
                    <span className="ml-2 font-medium">{selectedReport.ward?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Week:</span>
                    <span className="ml-2 font-medium">Week {selectedReport.weekNumber}, {selectedReport.year}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Form:</span>
                    <span className="ml-2 font-medium">{selectedReport.formTemplate?.title || 'Standard Report'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Submitted:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedReport.submittedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Report Responses */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Report Responses</h4>
                {selectedReport.responses && Object.keys(selectedReport.responses).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(selectedReport.responses).map(([question, answer], index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          {question}
                        </div>
                        <div>
                          {renderResponseValue(answer)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No response data available</p>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Recurring Questions Modal */}
        <Modal
          isOpen={showRecurringModal}
          onClose={() => {
            setShowRecurringModal(false);
            setRecurringData(null);
          }}
          title="Recurring Questions & Answers"
          size="xl"
        >
          {recurringData && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Ward:</span>
                    <span className="ml-2 font-medium">{recurringData.wardName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Week:</span>
                    <span className="ml-2 font-medium">Week {recurringData.weekNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Year:</span>
                    <span className="ml-2 font-medium">{recurringData.year}</span>
                  </div>
                </div>
              </div>

              {recurringData.responses && recurringData.responses.length > 0 ? (
                <div className="space-y-4">
                  {recurringData.responses.map((response, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        {response.question}
                      </div>
                      <div className="text-sm text-gray-700">
                        {renderResponseValue(response.answer)}
                      </div>
                      {response.formTitle && (
                        <div className="text-xs text-gray-500 mt-2">
                          From: {response.formTitle}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recurring questions data available for this period</p>
              )}
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}