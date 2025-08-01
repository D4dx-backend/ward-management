import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function FormTemplatesCheck() {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkFormTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/debug/formtemplates-direct');
      setData(response.data);
    } catch (error) {
      console.error('Error checking FormTemplates:', error);
      alert('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const resetSurveyStructure = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/docker-survey/reset-structure');
      console.log('Survey structure reset:', response.data);
      alert(`Survey structure reset successfully! Found ${response.data.formWeeksFound} form weeks and ${response.data.clustersFound} clusters.`);
    } catch (error) {
      console.error('Error resetting survey structure:', error);
      alert('Error resetting survey structure: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      checkFormTemplates();
    }
  }, [session]);

  if (!session) {
    return <Layout><div>Please log in</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FormTemplate Collection Check</h1>
          <p className="text-gray-600">Direct analysis of FormTemplate documents in database</p>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">FormTemplate Analysis</h2>
              <div className="flex space-x-2">
                <Button onClick={checkFormTemplates} disabled={loading} size="sm">
                  Refresh Data
                </Button>
                {session.user.role === 'wardAdmin' && (
                  <Button onClick={resetSurveyStructure} disabled={loading} size="sm" className="bg-red-600">
                    Reset Survey Structure
                  </Button>
                )}
              </div>
            </div>
            
            {data ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">{data.totalForms}</div>
                    <div className="text-sm text-blue-700">Total Forms</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">{data.stateAdminForms}</div>
                    <div className="text-sm text-green-700">State Admin Forms</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">{data.stateAdminFormsWithWeeks}</div>
                    <div className="text-sm text-purple-700">State Admin + Weeks</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded">
                    <div className="text-2xl font-bold text-orange-600">{data.uniqueWeeksCount}</div>
                    <div className="text-sm text-orange-700">Unique Weeks</div>
                  </div>
                </div>

                {/* Available Weeks */}
                {data.sortedWeeks && data.sortedWeeks.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Available Form Weeks:</h3>
                    <div className="flex flex-wrap gap-2">
                      {data.sortedWeeks.map((week, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          Week {week.weekNumber}, {week.year}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample Forms */}
                {data.sampleForms && data.sampleForms.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Sample Forms:</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border border-gray-200 rounded">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left border-b">Title</th>
                            <th className="px-3 py-2 text-left border-b">Week</th>
                            <th className="px-3 py-2 text-left border-b">Year</th>
                            <th className="px-3 py-2 text-left border-b">Created By</th>
                            <th className="px-3 py-2 text-left border-b">Role</th>
                            <th className="px-3 py-2 text-left border-b">Published</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.sampleForms.map((form, index) => (
                            <tr key={index} className={form.createdByRole === 'stateAdmin' ? 'bg-green-50' : ''}>
                              <td className="px-3 py-2 border-b">{form.title}</td>
                              <td className="px-3 py-2 border-b">{form.weekNumber || 'N/A'}</td>
                              <td className="px-3 py-2 border-b">{form.year || 'N/A'}</td>
                              <td className="px-3 py-2 border-b">{form.createdBy}</td>
                              <td className="px-3 py-2 border-b">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  form.createdByRole === 'stateAdmin' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {form.createdByRole}
                                </span>
                              </td>
                              <td className="px-3 py-2 border-b">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  form.isPublished 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {form.isPublished ? 'Yes' : 'No'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {data.stateAdminFormsWithWeeks === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-medium text-yellow-800">No State Admin Forms with Week Numbers</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      The cluster survey needs forms created by state admins that have weekNumber and year fields.
                      {data.totalForms > 0 
                        ? ' You have forms, but they may not be created by state admins or may be missing week numbers.'
                        : ' No forms found in the database.'
                      }
                    </p>
                  </div>
                )}

                {data.stateAdminFormsWithWeeks > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded">
                    <h4 className="font-medium text-green-800">✅ Forms Found!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Found {data.stateAdminFormsWithWeeks} state admin forms with week numbers. 
                      Click "Reset Survey Structure" to use these weeks in your cluster survey.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading FormTemplate data...</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}