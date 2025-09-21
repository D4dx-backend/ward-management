import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { formatWeekPeriod } from '../../lib/weekUtils';
import Loading from '../../components/Loading';

export default function UnifiedWardStatus() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  
  // Main state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [wardBasicData, setWardBasicData] = useState(null);
  const [wardInchargeReports, setWardInchargeReports] = useState([]);
  const [stateInchargeReports, setStateInchargeReports] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [houseVisitData, setHouseVisitData] = useState([]);
  const [advancedData, setAdvancedData] = useState(null);
  const [clustersData, setClustersData] = useState([]);
  const [recurringQuestionsData, setRecurringQuestionsData] = useState([]);
  
  // UI states
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    'basic': true, // Keep basic data expanded by default
    'ward-reports': false,
    'state-reports': false,
    'weekly-reports': false,
    'house-visits': false,
    'advanced-data': false,
    'clusters': false,
    'recurring': false
  });

  useEffect(() => {
    // Check authentication and authorization
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated') {
      const allowedRoles = ['stateAdmin', 'coordinator'];
      if (!allowedRoles.includes(session.user.role)) {
        router.push('/');
        return;
      }
      
      if (id) {
        fetchAllWardData();
      }
    }
  }, [status, session, id, router]);

  const fetchAllWardData = async () => {
    console.log('=== FETCHING UNIFIED WARD STATUS DATA ===');
    console.log('Ward ID:', id);
    console.log('User Role:', session?.user?.role);
    
    try {
      setLoading(true);
      setError('');

      // Fetch all data in parallel for better performance
      const promises = [
        fetchWardBasicData(),
        fetchWardInchargeReports(),
        fetchStateInchargeReports(),
        fetchWeeklyReports(),
        fetchHouseVisitData(),
        fetchAdvancedData(),
        fetchClustersData(),
        fetchRecurringQuestionsData()
      ];

      const results = await Promise.allSettled(promises);
      
      // Log results of each fetch operation
      results.forEach((result, index) => {
        const apiNames = [
          'Ward Basic Data', 'Ward Incharge Reports', 'State Incharge Reports', 
          'Weekly Reports', 'House Visit Data', 'Advanced Data', 
          'Clusters Data', 'Recurring Questions Data'
        ];
        
        if (result.status === 'fulfilled') {
          console.log(`✅ ${apiNames[index]} - SUCCESS`);
        } else {
          console.error(`❌ ${apiNames[index]} - FAILED:`, result.reason);
        }
      });
      
      console.log('✅ All ward data fetch operations completed');
      
      // Log final state counts
      console.log('=== FINAL DATA SUMMARY ===');
      console.log('Ward Basic Data:', wardBasicData ? 'Available' : 'Missing');
      console.log('Ward Incharge Reports:', wardInchargeReports.length);
      console.log('State Incharge Reports:', stateInchargeReports.length);
      console.log('Weekly Reports:', weeklyReports.length);
      console.log('House Visit Data:', houseVisitData.length);
      console.log('Advanced Data:', advancedData ? 'Available' : 'Missing');
      console.log('Clusters Data:', clustersData.length);
      console.log('Recurring Questions Data:', recurringQuestionsData.length);
    } catch (error) {
      console.error('❌ Error fetching ward data:', error);
      setError('Failed to fetch ward data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWardBasicData = async () => {
    try {
      console.log('Fetching ward basic data...');
      const response = await axios.get(`/api/wards/${id}`);
      setWardBasicData(response.data);
      console.log('✅ Ward basic data fetched:', response.data);
    } catch (error) {
      console.error('❌ Error fetching ward basic data:', error);
      console.error('API Response:', error.response?.data);
      throw error;
    }
  };

  const fetchWardInchargeReports = async () => {
    try {
      console.log('Fetching ward incharge reports...');
      const response = await axios.get(`/api/responses`, {
        params: {
          wardId: id,
          limit: 20
        }
      });
      // Filter for ward admin reports on the client side
      const wardAdminReports = (response.data || []).filter(report => 
        report.respondent?.role === 'wardAdmin'
      );
      setWardInchargeReports(wardAdminReports);
      console.log('✅ Ward incharge reports fetched:', wardAdminReports.length);
      console.log('Ward admin reports data:', wardAdminReports);
    } catch (error) {
      console.error('❌ Error fetching ward incharge reports:', error);
      console.error('Full error:', error.response?.data || error.message);
      setWardInchargeReports([]);
    }
  };

  const fetchStateInchargeReports = async () => {
    try {
      console.log('Fetching state incharge reports...');
      const response = await axios.get(`/api/responses`, {
        params: {
          wardId: id,
          limit: 20
        }
      });
      // Filter for coordinator reports on the client side
      const coordinatorReports = (response.data || []).filter(report => 
        report.respondent?.role === 'coordinator'
      );
      setStateInchargeReports(coordinatorReports);
      console.log('✅ State incharge reports fetched:', coordinatorReports.length);
      console.log('Coordinator reports data:', coordinatorReports);
    } catch (error) {
      console.error('❌ Error fetching state incharge reports:', error);
      console.error('Full error:', error.response?.data || error.message);
      setStateInchargeReports([]);
    }
  };

  const fetchWeeklyReports = async () => {
    try {
      console.log('Fetching weekly reports...');
      const response = await axios.get(`/api/responses`, {
        params: {
          wardId: id,
          limit: 50
        }
      });
      // Get all reports for this ward, sorted by submission date
      setWeeklyReports(response.data || []);
      console.log('✅ Weekly reports fetched:', response.data?.length || 0);
      console.log('Weekly reports data:', response.data);
    } catch (error) {
      console.error('❌ Error fetching weekly reports:', error);
      setWeeklyReports([]);
    }
  };

  const fetchHouseVisitData = async () => {
    try {
      console.log('Fetching house visit data...');
      // Use the coordinator ward-clusters endpoint for both roles
      const response = await axios.get(`/api/coordinator/ward-clusters?wardId=${id}`);
      setHouseVisitData(response.data || []);
      console.log('✅ House visit data fetched:', response.data?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching house visit data:', error);
      // If that fails, try to get cluster visits from cluster-visits API
      try {
        const visitResponse = await axios.get(`/api/cluster-visits/my-ward`);
        const visitData = visitResponse.data?.clusterVisits || [];
        setHouseVisitData(visitData);
        console.log('✅ House visit data fetched from alternative API:', visitData.length);
      } catch (altError) {
        console.error('❌ Alternative house visit API also failed:', altError);
        setHouseVisitData([]);
      }
    }
  };

  const fetchAdvancedData = async () => {
    try {
      console.log('Fetching advanced data...');
      const response = await axios.get(`/api/ward-basic-data?wardId=${id}`);
      setAdvancedData(response.data?.[0] || null);
      console.log('✅ Advanced data fetched');
    } catch (error) {
      console.error('❌ Error fetching advanced data:', error);
      setAdvancedData(null);
    }
  };

  const fetchClustersData = async () => {
    try {
      console.log('Fetching clusters data...');
      const response = await axios.get(`/api/clusters?wardId=${id}`);
      setClustersData(response.data || []);
      console.log('✅ Clusters data fetched:', response.data?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching clusters data:', error);
      setClustersData([]);
    }
  };

  const fetchRecurringQuestionsData = async () => {
    try {
      console.log('Fetching recurring questions data...');
      const response = await axios.get(`/api/recurring-questions/ward-responses?wardId=${id}`);
      setRecurringQuestionsData(response.data || []);
      console.log('✅ Recurring questions data fetched:', response.data?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching recurring questions data:', error);
      setRecurringQuestionsData([]);
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handlePrintPDF = () => {
    console.log('=== GENERATING PDF FOR WARD STATUS ===');
    console.log('Ward:', wardBasicData?.name);
    
    // Expand all sections before printing
    setExpandedSections({
      'basic': true,
      'ward-reports': true,
      'state-reports': true,
      'weekly-reports': true,
      'house-visits': true,
      'advanced-data': true,
      'clusters': true,
      'recurring': true
    });

    // Wait a moment for sections to expand, then print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDebugData = async () => {
    console.log('=== RUNNING WARD DATA DEBUG ===');
    try {
      const response = await axios.get(`/api/debug/ward-data?wardId=${id}`);
      console.log('DEBUG DATA RESULTS:', response.data);
      alert('Debug data logged to console. Check browser console for details.');
    } catch (error) {
      console.error('Debug failed:', error);
      alert('Debug failed. Check console for error details.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'submitted': { color: 'green', text: 'Submitted' },
      'pending': { color: 'yellow', text: 'Pending' },
      'overdue': { color: 'red', text: 'Overdue' },
      'draft': { color: 'gray', text: 'Draft' }
    };
    
    const config = statusMap[status] || { color: 'gray', text: status };
    return <Badge color={config.color}>{config.text}</Badge>;
  };

  const sections = [
    { id: 'basic', label: 'Basic Data', icon: '📋', count: wardBasicData ? 1 : 0 },
    { id: 'ward-reports', label: 'Ward Incharge Reports', icon: '👥', count: wardInchargeReports.length },
    { id: 'state-reports', label: 'State Incharge Reports', icon: '🏛️', count: stateInchargeReports.length },
    { id: 'weekly-reports', label: 'Weekly Reports', icon: '📅', count: weeklyReports.length },
    { id: 'house-visits', label: 'House Visits', icon: '🏠', count: houseVisitData.length },
    { id: 'advanced-data', label: 'Advanced Data', icon: '📊', count: advancedData ? 1 : 0 },
    { id: 'clusters', label: 'Clusters', icon: '🗂️', count: clustersData.length },
    { id: 'recurring', label: 'Recurring Analysis', icon: '🔄', count: recurringQuestionsData.length }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchAllWardData} className="mr-4">
              Retry
            </Button>
            <Link href={session?.user?.role === 'stateAdmin' ? '/admin/wards' : '/coordinator'}>
              <Button variant="outline">Go Back</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
          .accordion-button {
            display: none !important;
          }
          .accordion-content {
            display: block !important;
            border: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      `}</style>
      
      <Layout>
        <Head>
          <title>Ward Status - {wardBasicData?.name} - Ward Management System</title>
        </Head>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center no-print">
            <div>
              <Link 
                href={session?.user?.role === 'stateAdmin' ? '/admin/wards' : '/coordinator'}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-4"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Ward Status - {wardBasicData?.name}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Ward #{wardBasicData?.wardNumber} • {wardBasicData?.panchayath}, {wardBasicData?.district}
                {wardBasicData?.isSittingWard && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🪑 Sitting Ward
                  </span>
                )}
              </p>
            </div>
            <div className="flex space-x-3">
            <Button onClick={fetchAllWardData} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <Button onClick={handleDebugData} variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Debug Data
              </Button>
            )}
            <Button onClick={handlePrintPDF} className="bg-green-600 hover:bg-green-700 text-white">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print PDF
            </Button>
          </div>
          </div>

          {/* Print Header */}
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ward Status Report</h1>
            <h2 className="text-xl text-gray-700">{wardBasicData?.name} - Ward #{wardBasicData?.wardNumber}</h2>
            <p className="text-gray-600">{wardBasicData?.panchayath}, {wardBasicData?.district}</p>
            <p className="text-sm text-gray-500 mt-2">Generated on: {formatDate(new Date())}</p>
          </div>

          {/* Accordion Sections */}
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id} className="border border-gray-200 rounded-lg accordion-content">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="accordion-button w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-t-lg no-print"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{section.icon}</span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{section.label}</h3>
                      <p className={`text-sm ${section.count > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {section.count > 0 ? `✅ ${section.count} items` : '❌ No data available'}
                      </p>
                    </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                        expandedSections[section.id] ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {(expandedSections[section.id] || typeof window !== 'undefined' && window.matchMedia && window.matchMedia('print').matches) && (
                  <div className="border-t border-gray-200">
                    {/* Print Section Header */}
                    <div className="hidden print:block px-6 py-3 bg-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <span className="mr-2">{section.icon}</span>
                        {section.label}
                      </h3>
                    </div>

                    {/* Basic Data Section */}
                    {section.id === 'basic' && (
                      <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6 print:hidden">Basic Ward Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <dt className="text-sm font-medium text-gray-500">Ward Name & Number</dt>
                            <dd className="mt-1 text-lg font-semibold text-gray-900">
                              {wardBasicData?.name} (#{wardBasicData?.wardNumber})
                            </dd>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <dt className="text-sm font-medium text-gray-500">Local Body</dt>
                            <dd className="mt-1 text-lg font-semibold text-gray-900">
                              {wardBasicData?.panchayath}
                            </dd>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <dt className="text-sm font-medium text-gray-500">District</dt>
                            <dd className="mt-1 text-lg font-semibold text-gray-900">
                              {wardBasicData?.district}
                            </dd>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <dt className="text-sm font-medium text-gray-500">Ward Incharge</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {wardBasicData?.wardAdmin?.name || 'Not assigned'}
                              {wardBasicData?.wardAdmin?.mobileNumber && (
                                <div className="text-xs text-gray-500">
                                  📱 {wardBasicData.wardAdmin.mobileNumber}
                                </div>
                              )}
                            </dd>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <dt className="text-sm font-medium text-gray-500">State Incharge</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {wardBasicData?.coordinator?.name || 'Not assigned'}
                              {wardBasicData?.coordinator?.mobileNumber && (
                                <div className="text-xs text-gray-500">
                                  📱 {wardBasicData.coordinator.mobileNumber}
                                </div>
                              )}
                            </dd>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <dt className="text-sm font-medium text-gray-500">Sitting Ward Status</dt>
                            <dd className="mt-1">
                              {wardBasicData?.isSittingWard ? (
                                <Badge color="purple">🪑 Sitting Ward</Badge>
                              ) : (
                                <Badge color="gray">Regular Ward</Badge>
                              )}
                            </dd>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <dt className="text-sm font-medium text-gray-500">Ward Admin Last Login</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {wardBasicData?.wardAdmin?.lastLogin ? formatDate(wardBasicData.wardAdmin.lastLogin) : 'Never'}
                            </dd>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <dt className="text-sm font-medium text-gray-500">Last Report Submitted</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {weeklyReports.length > 0 ? formatDate(weeklyReports[0].submittedAt) : 'No reports'}
                            </dd>
                          </div>
                          {wardBasicData?.population && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <dt className="text-sm font-medium text-gray-500">Population</dt>
                              <dd className="mt-1 text-lg font-semibold text-gray-900">
                                {wardBasicData.population.toLocaleString()}
                              </dd>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ward Incharge Reports Section */}
                    {section.id === 'ward-reports' && (
                      <div className="p-6 print-break">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 print:hidden">
                          Ward Incharge Visit Reports ({wardInchargeReports.length})
                        </h2>
                        {wardInchargeReports.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Report
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Week/Year
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Submitted
                                  </th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider no-print">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {wardInchargeReports.map((report) => (
                                  <tr key={report._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {report.formTemplate?.title || 'Ward Report'}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        by {report.respondent?.name}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">Week {report.weekNumber}</div>
                                      <div className="text-sm text-gray-500">{report.year}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {getStatusBadge(report.status || 'submitted')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {formatDate(report.submittedAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium no-print">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewReport(report)}
                                      >
                                        View Report
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No Ward Incharge Reports</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              No reports have been submitted by the ward incharge yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* State Incharge Reports Section */}
                    {section.id === 'state-reports' && (
                      <div className="p-6 print-break">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 print:hidden">
                          State Incharge Visit Reports ({stateInchargeReports.length})
                        </h2>
                        {stateInchargeReports.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Report
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Week/Year
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Submitted
                                  </th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider no-print">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {stateInchargeReports.map((report) => (
                                  <tr key={report._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {report.formTemplate?.title || 'State Report'}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        by {report.respondent?.name}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">Week {report.weekNumber}</div>
                                      <div className="text-sm text-gray-500">{report.year}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {getStatusBadge(report.status || 'submitted')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {formatDate(report.submittedAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium no-print">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewReport(report)}
                                      >
                                        View Report
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No State Incharge Reports</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              No reports have been submitted by the state incharge yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Weekly Reports Section */}
                    {section.id === 'weekly-reports' && (
                      <div className="p-6 print-break">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 print:hidden">
                          Weekly Report List ({weeklyReports.length})
                        </h2>
                        {weeklyReports.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Form
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Week/Year
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Submitted By
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                  </th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider no-print">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {weeklyReports.map((report) => (
                                  <tr key={report._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {report.formTemplate?.title || 'Weekly Report'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">Week {report.weekNumber}</div>
                                      <div className="text-sm text-gray-500">{report.year}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{report.respondent?.name}</div>
                                      <div className="text-sm text-gray-500">{report.respondent?.role}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {getStatusBadge(report.status || 'submitted')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {formatDate(report.submittedAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium no-print">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewReport(report)}
                                      >
                                        View Report
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No Weekly Reports</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              No weekly reports have been submitted for this ward yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* House Visit Reports Section */}
                    {section.id === 'house-visits' && (
                      <div className="p-6 print-break">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 print:hidden">
                          House Visit Report ({houseVisitData.length} clusters)
                        </h2>
                        {houseVisitData.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {houseVisitData.map((cluster) => (
                              <div key={cluster._id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-sm font-medium text-gray-900">
                                      {cluster.name || 'Cluster'}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                      <div className="text-xs text-gray-600">
                                        Total Houses: <span className="font-medium">{cluster.totalHouses || 0}</span>
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Houses Visited: <span className="font-medium text-green-600">{cluster.housesVisited || 0}</span>
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Visit Days: <span className="font-medium">{cluster.visitDays || 0}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-blue-600">
                                      {cluster.completionRate || 0}%
                                    </div>
                                    <div className="text-xs text-gray-500">Progress</div>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${cluster.completionRate || 0}%` }}
                                    ></div>
                                  </div>
                                </div>
                                {cluster.lastUpdated && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    Last Updated: {formatDate(cluster.lastUpdated)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No House Visit Data</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              No house visit data is available for this ward yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Advanced Data Section */}
                    {section.id === 'advanced-data' && (
                      <div className="p-6 print-break">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 print:hidden">Advanced Data</h2>
                        {advancedData ? (
                          <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h3 className="text-sm font-medium text-gray-900 mb-2">Form Information</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Form Title:</span>
                                  <span className="ml-2 font-medium">{advancedData.form?.title || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Version:</span>
                                  <span className="ml-2 font-medium">{advancedData.form?.version || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Submitted By:</span>
                                  <span className="ml-2 font-medium">{advancedData.submittedBy?.name || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Submitted Date:</span>
                                  <span className="ml-2 font-medium">{formatDate(advancedData.submittedAt)}</span>
                                </div>
                              </div>
                            </div>
                            {advancedData.data && Object.keys(advancedData.data).length > 0 && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Data Fields</h3>
                                <div className="space-y-2">
                                  {Object.entries(advancedData.data).map(([key, value]) => (
                                    <div key={key} className="flex justify-between text-sm">
                                      <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                      <span className="font-medium text-gray-900">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No Advanced Data</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              No advanced data has been submitted for this ward yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Clusters Section */}
                    {section.id === 'clusters' && (
                      <div className="p-6 print-break">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 print:hidden">
                          Clusters List ({clustersData.length})
                        </h2>
                        {clustersData.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clustersData.map((cluster) => (
                              <div key={cluster._id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="text-sm font-medium text-gray-900">
                                      {cluster.name}
                                    </h3>
                                    {cluster.clusterNumber && (
                                      <p className="text-xs text-gray-500">Cluster #{cluster.clusterNumber}</p>
                                    )}
                                    {cluster.description && (
                                      <p className="text-xs text-gray-600 mt-1">{cluster.description}</p>
                                    )}
                                    <div className="mt-2 space-y-1">
                                      {cluster.householdCount && (
                                        <div className="text-xs text-gray-600">
                                          Households: <span className="font-medium">{cluster.householdCount}</span>
                                        </div>
                                      )}
                                      {cluster.coordinator && (
                                        <div className="text-xs text-gray-600">
                                          Coordinator: <span className="font-medium">{cluster.coordinator.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    {cluster.isActive !== false ? (
                                      <Badge color="green">Active</Badge>
                                    ) : (
                                      <Badge color="gray">Inactive</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No Clusters</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              No clusters have been created for this ward yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recurring Question Analysis Section */}
                    {section.id === 'recurring' && (
                      <div className="p-6 print-break">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 print:hidden">
                          Recurring Question Wise Analysis ({recurringQuestionsData.length})
                        </h2>
                        {recurringQuestionsData.length > 0 ? (
                          <div className="space-y-4">
                            {recurringQuestionsData.map((item) => (
                              <div key={item._id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="text-sm font-medium text-gray-900">
                                      {item.question?.question || 'Question'}
                                    </h3>
                                    <div className="mt-2 space-y-1 text-xs text-gray-600">
                                      <div>Answer: <span className="font-medium">{item.answer}</span></div>
                                      <div>Form Type: <span className="font-medium">{item.formType}</span></div>
                                      <div>Week {item.weekNumber}, {item.year}</div>
                                      <div>Submitted: {formatDate(item.submittedAt)}</div>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    {item.question?.fieldType && (
                                      <Badge color="blue">{item.question.fieldType}</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No Recurring Question Data</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              No recurring question responses have been recorded for this ward yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Report View Modal */}
        <Modal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedReport(null);
          }}
          title={selectedReport ? `${selectedReport.formTemplate?.title || 'Report'} - Week ${selectedReport.weekNumber}, ${selectedReport.year}` : 'Report Details'}
          size="lg"
        >
          {selectedReport && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Submitted by:</span>
                    <span className="ml-2 font-medium">{selectedReport.respondent?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Role:</span>
                    <span className="ml-2 font-medium">{selectedReport.respondent?.role}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Submitted on:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedReport.submittedAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2">{getStatusBadge(selectedReport.status || 'submitted')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => setShowReportModal(false)}>
                  Close
                </Button>
                <Link 
                  href={session?.user?.role === 'stateAdmin' 
                    ? `/admin/reports/view/${selectedReport._id}` 
                    : `/coordinator/ward-reports/detail/${selectedReport._id}?ward=${wardBasicData?.name}&week=${selectedReport.weekNumber}&year=${selectedReport.year}`
                  }
                >
                  <Button>View Full Report</Button>
                </Link>
              </div>
            </div>
          )}
        </Modal>
      </Layout>
    </>
  );
}