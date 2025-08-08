import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function WardCheck() {
  const { data: session } = useSession();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkWardAssignment = async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/users/${session.user.id}`);
      setUserInfo(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch user info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      checkWardAssignment();
    }
  }, [session]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ward Assignment Check</h1>
          <p className="text-sm text-gray-600 mt-1">
            Debug page to check ward assignment for current user
          </p>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">User Information</h2>
              <Button onClick={checkWardAssignment} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {userInfo && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Basic Info</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">ID:</span> {userInfo._id}</p>
                      <p><span className="font-medium">Name:</span> {userInfo.name}</p>
                      <p><span className="font-medium">Email:</span> {userInfo.email}</p>
                      <p><span className="font-medium">Role:</span> {userInfo.role}</p>
                      <p><span className="font-medium">District:</span> {userInfo.district || 'Not set'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Ward Assignment</h3>
                    {userInfo.ward ? (
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Ward ID:</span> {userInfo.ward._id}</p>
                        <p><span className="font-medium">Ward Name:</span> {userInfo.ward.name}</p>
                        <p><span className="font-medium">Ward Number:</span> {userInfo.ward.wardNumber}</p>
                        <p><span className="font-medium">Panchayath:</span> {userInfo.ward.panchayath}</p>
                        <p><span className="font-medium">District:</span> {userInfo.ward.district}</p>
                      </div>
                    ) : (
                      <p className="text-red-600 text-sm">No ward assigned</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Raw Data</h3>
                  <pre className="text-xs text-gray-600 overflow-auto">
                    {JSON.stringify(userInfo, null, 2)}
                  </pre>
                </div>

                {userInfo.ward && (
                  <div className="mt-4">
                    <Button 
                      onClick={() => window.location.href = '/ward/docker-survey'}
                      className="mr-2"
                    >
                      Go to Docker Survey
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = `/api/docker-survey/my-ward`}
                    >
                      Test Survey API
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}