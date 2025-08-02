import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Card from './Card';
import Button from './Button';
import Link from 'next/link';

export default function CoordinatorFormTracker({ compact = false }) {
  const { data: session } = useSession();
  const [formStats, setFormStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.user?.role === 'coordinator') {
      fetchFormStats();
    }
  }, [session]);

  const fetchFormStats = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/coordinator/form-statistics');
      setFormStats(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching form stats:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError('Failed to load form statistics');
      
      // Mock data for development
      setFormStats({
        overview: {
          totalWards: 12,
          totalForms: 8,
          totalSubmissions: 156,
          pendingSubmissions: 24,
          completionRate: 86.7
        },
        wardWiseStats: [
          { wardName: 'Ward 1', completionRate: 95, pendingForms: 1 },
          { wardName: 'Ward 2', completionRate: 75, pendingForms: 3 },
          { wardName: 'Ward 3', completionRate: 60, pendingForms: 4 }
        ],
        formWiseStats: [
          { formTitle: 'Weekly Report', completionRate: 90, pendingCount: 2 },
          { formTitle: 'Infrastructure Survey', completionRate: 75, pendingCount: 4 },
          { formTitle: 'Health Survey', completionRate: 65, pendingCount: 6 }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !formStats) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Form Statistics</h3>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">{error || 'No form statistics available'}</p>
            <Button onClick={fetchFormStats} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Form Statistics</h3>
            <Link href="/coordinator/form-statistics">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formStats.overview.totalWards}</div>
              <div className="text-sm text-gray-600">Wards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formStats.overview.totalForms}</div>
              <div className="text-sm text-gray-600">Forms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formStats.overview.totalSubmissions}</div>
              <div className="text-sm text-gray-600">Submitted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{formStats.overview.pendingSubmissions}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Overall Completion</span>
              <span>{formStats.overview.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  formStats.overview.completionRate >= 80 ? 'bg-green-500' :
                  formStats.overview.completionRate >= 60 ? 'bg-blue-500' :
                  formStats.overview.completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${formStats.overview.completionRate}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Top Pending Wards</h4>
            {formStats.wardWiseStats
              .filter(ward => ward.pendingForms > 0)
              .sort((a, b) => b.pendingForms - a.pendingForms)
              .slice(0, 3)
              .map((ward, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{ward.wardName}</span>
                  <span className="text-red-600 font-medium">{ward.pendingForms} pending</span>
                </div>
              ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Form Submission Overview</h3>
          <Link href="/coordinator/form-statistics">
            <Button variant="outline" size="sm">View Detailed Statistics</Button>
          </Link>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{formStats.overview.totalWards}</div>
            <div className="text-sm text-blue-800">Total Wards</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{formStats.overview.totalForms}</div>
            <div className="text-sm text-purple-800">Active Forms</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{formStats.overview.totalSubmissions}</div>
            <div className="text-sm text-green-800">Submissions</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{formStats.overview.pendingSubmissions}</div>
            <div className="text-sm text-yellow-800">Pending</div>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">{formStats.overview.completionRate}%</div>
            <div className="text-sm text-indigo-800">Completion</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ward Performance */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Ward Performance</h4>
            <div className="space-y-3">
              {formStats.wardWiseStats.slice(0, 5).map((ward, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{ward.wardName}</div>
                    <div className="text-xs text-gray-500">{ward.pendingForms} forms pending</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      ward.completionRate >= 90 ? 'text-green-600' :
                      ward.completionRate >= 75 ? 'text-blue-600' :
                      ward.completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {ward.completionRate}%
                    </div>
                    <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                      <div
                        className={`h-1 rounded-full ${
                          ward.completionRate >= 90 ? 'bg-green-500' :
                          ward.completionRate >= 75 ? 'bg-blue-500' :
                          ward.completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${ward.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Performance */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Form Performance</h4>
            <div className="space-y-3">
              {formStats.formWiseStats.slice(0, 5).map((form, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{form.formTitle}</div>
                    <div className="text-xs text-gray-500">{form.pendingCount} wards pending</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      form.completionRate >= 90 ? 'text-green-600' :
                      form.completionRate >= 75 ? 'text-blue-600' :
                      form.completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {form.completionRate}%
                    </div>
                    <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                      <div
                        className={`h-1 rounded-full ${
                          form.completionRate >= 90 ? 'bg-green-500' :
                          form.completionRate >= 75 ? 'bg-blue-500' :
                          form.completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${form.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}