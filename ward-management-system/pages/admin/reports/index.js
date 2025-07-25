import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { getWeekOptions, formatWeekPeriod } from '../../../lib/weekUtils';

export default function Reports() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [responses, setResponses] = useState([]);
  const [forms, setForms] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [wards, setWards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    formType: '',
    weekPeriod: '',
    weekNumber: '',
    year: new Date().getFullYear(),
    coordinatorId: '',
    wardId: '',
  });

  useEffect(() => {
    // Check if user is authenticated and is state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchForms();
      fetchFilterOptions();
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && session.user.role === 'stateAdmin') {
      fetchResponses();
    }
  }, [status, session, filter]);

  // Remove district-based effect since we're not using districts anymore

  const fetchForms = async () => {
    try {
      const response = await axios.get('/api/forms');
      setForms(response.data);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get('/api/reports/filters');
      setCoordinators(response.data.coordinators);
      setWards(response.data.wards);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const fetchResponses = async () => {
    try {
      setIsLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (filter.formType) queryParams.append('formType', filter.formType);
      if (filter.weekNumber) queryParams.append('weekNumber', filter.weekNumber);
      if (filter.year) queryParams.append('year', filter.year);
      if (filter.coordinatorId) queryParams.append('coordinatorId', filter.coordinatorId);
      if (filter.wardId) queryParams.append('wardId', filter.wardId);
      
      const response = await axios.get(`/api/responses?${queryParams.toString()}`);
      setResponses(response.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch responses');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    // Check if there are any responses to export
    if (responses.length === 0) {
      setError('No reports available to export. Please adjust your filters or wait for reports to be submitted.');
      return;
    }
    
    // Build query string with current filters
    const queryParams = new URLSearchParams();
    if (filter.formType) queryParams.append('formType', filter.formType);
    if (filter.weekNumber) queryParams.append('weekNumber', filter.weekNumber);
    if (filter.year) queryParams.append('year', filter.year);
    if (filter.coordinatorId) queryParams.append('coordinatorId', filter.coordinatorId);
    if (filter.wardId) queryParams.append('wardId', filter.wardId);
    
    // Open export URL in new tab
    window.open(`/api/reports/export?${queryParams.toString()}`, '_blank');
    
    // Clear any previous errors
    setError('');
  };

  // Get unique weeks from forms
  const weeks = [...new Set(forms
    .filter(form => !filter.formType || form.formType === filter.formType)
    .filter(form => !filter.year || form.year === parseInt(filter.year))
    .map(form => form.weekNumber)
  )].sort((a, b) => a - b);

  if (status === 'loading' || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout>
      <Head>
        <title>Reports - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="mt-1 text-sm text-gray-600">View and analyze submitted reports</p>
          </div>
          <Button
            onClick={exportToExcel}
            variant="success"
            disabled={responses.length === 0}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel ({responses.length} reports)
          </Button>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Type</label>
                <select
                  value={filter.formType}
                  onChange={(e) => setFilter({ 
                    ...filter, 
                    formType: e.target.value,
                    coordinatorId: e.target.value === 'wardReport' ? '' : filter.coordinatorId,
                    wardId: e.target.value === 'coordinatorReport' ? '' : filter.wardId
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="coordinatorReport">Coordinator Report</option>
                  <option value="wardReport">Ward Report</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Period</label>
                <select
                  value={filter.weekPeriod}
                  onChange={(e) => {
                    const weekOptions = getWeekOptions();
                    const selectedOption = Object.values(weekOptions).find(opt => opt.value === e.target.value);
                    setFilter({ 
                      ...filter, 
                      weekPeriod: e.target.value,
                      weekNumber: selectedOption ? selectedOption.weekNumber : '',
                      year: selectedOption ? selectedOption.year : filter.year
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Periods</option>
                  {Object.entries(getWeekOptions()).map(([key, option]) => (
                    <option key={key} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                <select
                  value={filter.weekNumber}
                  onChange={(e) => setFilter({ ...filter, weekNumber: e.target.value, weekPeriod: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Weeks</option>
                  {weeks.map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>
              {filter.formType === 'coordinatorReport' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coordinator</label>
                  <select
                    value={filter.coordinatorId}
                    onChange={(e) => setFilter({ ...filter, coordinatorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Coordinators</option>
                    {coordinators.map(coordinator => (
                      <option key={coordinator._id} value={coordinator._id}>
                        {coordinator.name} ({coordinator.district})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                <select
                  value={filter.wardId}
                  onChange={(e) => setFilter({ ...filter, wardId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Wards</option>
                  {wards.map(ward => (
                    <option key={ward._id} value={ward._id}>
                      {ward.name} ({ward.district})
                    </option>
                  ))}
                </select>
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Respondent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {responses.map((response) => (
                  <tr key={response._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {response.formTemplate?.title || 'Unknown Form'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {response.district} {response.ward?.name && `• ${response.ward.name}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        response.formType === 'coordinatorReport' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {response.formType === 'coordinatorReport' ? 'Coordinator' : 'Ward Report'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>Week {response.weekNumber}, {response.year}</div>
                      <div className="text-xs text-gray-500">
                        {formatWeekPeriod(response.weekNumber, response.year)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {response.respondent?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {response.respondent?.name || 'Unknown User'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(response.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/admin/reports/view/${response._id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {responses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h10a4 4 0 014 4v14a4 4 0 01-4 4z" />
                        </svg>
                        <p className="mt-2 text-sm">No reports found</p>
                        <p className="text-xs text-gray-400">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}