import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function FormsManager() {
  const { data: session } = useSession();
  const [formsData, setFormsData] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkForms = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/debug/check-forms');
      setFormsData(response.data);
    } catch (error) {
      console.error('Error checking forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTestForms = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/debug/create-test-forms');
      console.log('Test forms created:', response.data);
      alert('Test forms created successfully!');
      checkForms(); // Refresh the data
    } catch (error) {
      console.error('Error creating test forms:', error);
      alert('Error creating test forms: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const resetSurveyStructure = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/docker-survey/reset-structure');
      console.log('Survey structure reset:', response.data);
      alert('Survey structure reset successfully!');
    } catch (error) {
      console.error('Error resetting survey structure:', error);
      alert('Error resetting survey structure: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      checkForms();
    }
  }, [session]);

  if (!session) {
    return <Layout><div>Please log in</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forms Manager</h1>
          <p className="text-gray-600">Manage forms and survey structure</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Forms Analysis */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Forms Analysis</h2>
                <div className="flex space-x-2">
                  <Button onClick={checkForms} disabled={loading} size="sm">
                    Refresh
                  </Button>
                  {session.user.role === 'stateAdmin' && (
                    <Button onClick={createTestForms} disabled={loading} size="sm" className="bg-blue-600">
                      Create Test Forms
                    </Button>
                  )}
                  {session.user.role === 'wardAdmin' && (
                    <Button onClick={resetSurveyStructure} disabled={loading} size="sm" className="bg-red-600">
                      Reset Survey Structure
                    </Button>
                  )}
                </div>
              </div>
              
              {formsData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">Total Forms</div>
                      <div className="text-2xl font-bold text-blue-600">{formsData.totalForms}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">State Admin Forms</div>
                      <div className="text-2xl font-bold text-green-600">{formsData.stateAdminForms}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Forms with Weeks</div>
                      <div className="text-2xl font-bold text-purple-600">{formsData.formsWithWeeks}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Unique Weeks</div>
                      <div className="text-2xl font-bold text-orange-600">{formsData.uniqueWeeks?.length || 0}</div>
                    </div>
                  </div>

                  {formsData.uniqueWeeks && formsData.uniqueWeeks.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Available Weeks:</h3>
                      <div className="flex flex-wrap gap-2">
                        {formsData.uniqueWeeks.map((week, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            Week {week.weekNumber}, {week.year}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {formsData.allForms && formsData.allForms.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">All Forms:</h3>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left">Title</th>
                              <th className="px-2 py-1 text-left">Created By</th>
                              <th className="px-2 py-1 text-left">Role</th>
                              <th className="px-2 py-1 text-left">Week</th>
                              <th className="px-2 py-1 text-left">Year</th>
                              <th className="px-2 py-1 text-left">Published</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {formsData.allForms.map((form, index) => (
                              <tr key={index} className={form.role === 'stateAdmin' ? 'bg-green-50' : ''}>
                                <td className="px-2 py-1">{form.title}</td>
                                <td className="px-2 py-1">{form.createdBy}</td>
                                <td className="px-2 py-1">
                                  <span className={`px-1 py-0.5 rounded text-xs ${
                                    form.role === 'stateAdmin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {form.role}
                                  </span>
                                </td>
                                <td className="px-2 py-1">{form.weekNumber || 'N/A'}</td>
                                <td className="px-2 py-1">{form.year || 'N/A'}</td>
                                <td className="px-2 py-1">
                                  <span className={`px-1 py-0.5 rounded text-xs ${
                                    form.isPublished ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
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

                  {formsData.formsWithWeeks === 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <h4 className="font-medium text-yellow-800">No Forms with Week Numbers Found</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        {session.user.role === 'stateAdmin' 
                          ? 'Click "Create Test Forms" to create some test forms with week numbers.'
                          : 'Ask a state admin to create forms with proper week numbers.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading forms data...</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800">Instructions:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
            <li>If you're a <strong>State Admin</strong>: Click "Create Test Forms" to create forms with week numbers</li>
            <li>If you're a <strong>Ward Admin</strong>: After forms are created, click "Reset Survey Structure"</li>
            <li>Go to Docker Survey → Cluster Visits to see the week numbers</li>
            <li>You should see "Week 30, 2025", "Week 31, 2025" etc. instead of "Old Structure"</li>
          </ol>
        </div>
      </div>
    </Layout>
  );
}