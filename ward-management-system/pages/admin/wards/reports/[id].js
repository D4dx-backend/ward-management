import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import { formatWeekPeriod } from '../../../../lib/weekUtils';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../../components/Shimmer';
import { useApiData } from '../../../../hooks/useApiData';

export default function WardReports() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [ward, setWard] = useState(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is authenticated and is state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchWardAndReports();
    }
  }, [status, session, router, id]);

  const fetchWardAndReports = async () => {
    try {
      setIsLoading(true);
      
      // Fetch ward details
      const wardResponse = await axios.get(`/api/wards/${id}`);
      setWard(wardResponse.data);
      
      // Fetch reports for this ward
      const reportsResponse = await axios.get(`/api/responses?wardId=${id}`);
      setReports(reportsResponse.data);
      
      setError('');
    } catch (error) {
      setError('Failed to fetch ward reports');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
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
            <Link href="/admin/wards" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Back to Wards</Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!ward) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Ward Not Found</h1>
            <p className="text-gray-600 mb-4">The requested ward could not be found.</p>
            <Link href="/admin/wards" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Back to Wards</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Ward Reports - {ward.name} - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/admin/wards" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-4">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Wards
              </Link>
            <h1 className="text-2xl font-bold text-gray-900">Reports for {ward.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Ward #{ward.wardNumber} • {ward.panchayath}, {ward.district}
            </p>
          </div>
        </div>

        {/* Ward Information */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ward Information</h2>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Ward Incharge</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {ward.wardAdmin?.name || 'Not assigned'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Coordinator</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {ward.coordinator?.name || 'Not assigned'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Population</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {ward.population ? ward.population.toLocaleString() : 'Not specified'}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        {/* Reports List */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Submitted Reports ({reports.length})
            </h2>
            
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report._id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            {report.formTemplate?.title || 'Ward Report'}
                          </h3>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Ward Report
                          </span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Period:</span> Week {report.weekNumber}, {report.year}
                            <div className="text-xs text-gray-500">
                              {(() => {
                                try {
                                  return formatWeekPeriod(report.weekNumber, report.year);
                                } catch (error) {
                                  return `Week ${report.weekNumber} of ${report.year}`;
                                }
                              })()}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Submitted by:</span> {report.respondent?.name || 'Unknown'}
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span> {new Date(report.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Link href={`/admin/reports/view/${report._id}`} className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          View Report
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Reports Found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No reports have been submitted for this ward yet.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}