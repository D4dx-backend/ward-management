import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';

export default function ClusterFormsDebug() {
  const { data: session } = useSession();
  const [formsData, setFormsData] = useState(null);
  const [surveyData, setSurveyData] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkForms = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/debug/forms-check');
      setFormsData(response.data);
    } catch (error) {
      console.error('Error checking forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSurvey = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/docker-survey/my-ward');
      setSurveyData(response.data);
    } catch (error) {
      console.error('Error checking survey:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'wardAdmin') {
      checkForms();
      checkSurvey();
    }
  }, [session]);

  if (!session) {
    return <Layout><div>Please log in</div></Layout>;
  }

  if (session.user.role !== 'wardAdmin') {
    return <Layout><div>Access denied. Ward admin only.</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cluster Forms Debug</h1>
          <p className="text-gray-600">Debug information for cluster survey forms</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Forms Data */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Forms Analysis</h2>
                <Button onClick={checkForms} disabled={loading} size="sm">
                  Refresh
                </Button>
              </div>
              
              {formsData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
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

                  {formsData.sampleForms && formsData.sampleForms.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Sample Forms:</h3>
                      <div className="space-y-2">
                        {formsData.sampleForms.map((form, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                            <div><strong>{form.title}</strong></div>
                            <div>By: {form.createdBy} ({form.role})</div>
                            <div>Week: {form.weekNumber || 'N/A'}, Year: {form.year || 'N/A'}</div>
                          </div>
                        ))}
                      </div>
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

          {/* Survey Data */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Survey Analysis</h2>
                <Button onClick={checkSurvey} disabled={loading} size="sm">
                  Refresh
                </Button>
              </div>
              
              {surveyData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">Clusters</div>
                      <div className="text-2xl font-bold text-blue-600">{surveyData.clusterVisits?.length || 0}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Form Weeks</div>
                      <div className="text-2xl font-bold text-green-600">
                        {surveyData.clusterVisits?.[0]?.formWeeks?.length || 0}
                      </div>
                    </div>
                  </div>

                  {surveyData.clusterVisits?.[0]?.formWeeks && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Survey Weeks:</h3>
                      <div className="flex flex-wrap gap-2">
                        {surveyData.clusterVisits[0].formWeeks.map((week, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                            Week {week.weekNumber}, {week.year}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {surveyData.clusterVisits && surveyData.clusterVisits.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Clusters:</h3>
                      <div className="space-y-1">
                        {surveyData.clusterVisits.map((cluster, index) => (
                          <div key={index} className="text-sm">
                            {cluster.clusterName} - {Object.keys(cluster.weeklyData || {}).length} weeks
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <h4 className="font-medium text-gray-700 mb-2">Raw Data:</h4>
                    <pre className="text-xs overflow-auto max-h-40">
                      {JSON.stringify(surveyData.clusterVisits?.[0], null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading survey data...</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}