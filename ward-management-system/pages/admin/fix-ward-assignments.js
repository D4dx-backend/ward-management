import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function FixWardAssignments() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [fixResult, setFixResult] = useState(null);
  const [error, setError] = useState('');

  if (status === 'loading') {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (session.user.role !== 'stateAdmin') {
    router.push('/');
    return null;
  }

  useEffect(() => {
    if (status === 'authenticated' && session.user.role === 'stateAdmin') {
      testConnection();
    }
  }, [status, session]);

  const testConnection = async () => {
    try {
      const response = await axios.get('/api/test-connection');
      console.log('Connection test successful:', response.data);
      checkAssignments();
    } catch (error) {
      console.error('Connection test failed:', error);
      setError('Failed to connect to server: ' + (error.response?.data?.message || error.message));
      setIsLoading(false);
    }
  };

  const checkAssignments = async () => {
    setIsLoading(true);
    setError('');
    setCheckResult(null);

    try {
      const response = await axios.get('/api/wards/check-assignments');
      setCheckResult(response.data);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixAssignments = async () => {
    setIsFixing(true);
    setError('');
    setFixResult(null);

    try {
      const response = await axios.post('/api/wards/fix-duplicate-assignments');
      setFixResult(response.data);
      // Refresh the check after fixing
      await checkAssignments();
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Fix Ward Incharge Assignments - Ward Management System</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fix Ward Incharge Assignments</h1>
          <p className="mt-1 text-sm text-gray-600">
            Check and fix duplicate Ward Incharge assignments. Each Ward Incharge should only be assigned to one ward.
          </p>
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

        {/* Loading State */}
        {isLoading && (
          <Card>
            <div className="p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Checking Ward Assignments...</h3>
                  <p className="mt-2 text-sm text-gray-500">Please wait while we analyze the Ward Incharge assignments.</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Check Results */}
        {!isLoading && checkResult && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Current Assignment Status</h2>
              
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{checkResult.summary.totalWardsWithAdmins}</div>
                  <div className="text-sm text-blue-800">Wards with Admins</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{checkResult.summary.totalUniqueAdmins}</div>
                  <div className="text-sm text-green-800">Unique Ward Incharges</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{checkResult.summary.duplicateAdminsFound}</div>
                  <div className="text-sm text-yellow-800">Duplicate Admins</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{checkResult.summary.totalDuplicateAssignments}</div>
                  <div className="text-sm text-red-800">Extra Assignments</div>
                </div>
              </div>

              {/* Fix Button */}
              {checkResult.summary.duplicateAdminsFound > 0 && (
                <div className="mb-6">
                  <Button
                    onClick={handleFixAssignments}
                    disabled={isFixing}
                    variant="danger"
                    className="w-full"
                  >
                    {isFixing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Fixing Assignments...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Fix Duplicate Assignments ({checkResult.summary.totalDuplicateAssignments} to remove)
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Duplicate Assignments Details */}
              {checkResult.duplicateAssignments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Ward Incharges with Multiple Assignments:</h3>
                  <div className="space-y-3">
                    {checkResult.duplicateAssignments.map((duplicate, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                        <div className="font-medium text-yellow-800">
                          {duplicate.wardAdmin.name} ({duplicate.wardAdmin.email})
                        </div>
                        <div className="text-sm text-yellow-700 mt-1">
                          Assigned to {duplicate.assignedWards.length} wards:
                        </div>
                        <ul className="text-sm text-yellow-700 ml-4 mt-1">
                          {duplicate.assignedWards.map((ward, wardIndex) => (
                            <li key={wardIndex}>• {ward.name} ({ward.district})</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Issues Found */}
              {checkResult.summary.duplicateAdminsFound === 0 && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        No duplicate Ward Incharge assignments found!
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        All Ward Incharges are correctly assigned to only one ward each.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Refresh Button */}
              <div className="mt-4">
                <Button
                  onClick={checkAssignments}
                  variant="outline"
                  disabled={isLoading}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Check
                </Button>
              </div>
            </div>
          </Card>
        )}

        {result && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Assignment Check Results</h2>
              
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{result.summary.totalWardsChecked}</div>
                  <div className="text-sm text-blue-800">Total Wards Checked</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{result.summary.duplicateAdminsFound}</div>
                  <div className="text-sm text-yellow-800">Duplicate Admins Found</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{result.summary.assignmentsFixed}</div>
                  <div className="text-sm text-green-800">Assignments Fixed</div>
                </div>
              </div>

              {/* Duplicate Assignments Found */}
              {result.duplicateAssignments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Duplicate Assignments Found:</h3>
                  <div className="space-y-3">
                    {result.duplicateAssignments.map((duplicate, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                        <div className="font-medium text-yellow-800">
                          {duplicate.wardAdmin.name} ({duplicate.wardAdmin.email})
                        </div>
                        <div className="text-sm text-yellow-700 mt-1">
                          Was assigned to {duplicate.assignedWards.length} wards:
                        </div>
                        <ul className="text-sm text-yellow-700 ml-4 mt-1">
                          {duplicate.assignedWards.map((ward, wardIndex) => (
                            <li key={wardIndex}>• {ward.name}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fixed Assignments */}
              {result.fixedAssignments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Assignments Fixed:</h3>
                  <div className="space-y-2">
                    {result.fixedAssignments.map((fix, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <div className="text-sm text-green-800">
                          <strong>{fix.wardAdminName}</strong> removed from ward <strong>{fix.wardName}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Issues Found */}
              {result.duplicateAssignments.length === 0 && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        No duplicate Ward Incharge assignments found!
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        All Ward Incharges are correctly assigned to only one ward each.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}