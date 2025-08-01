import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function RecurringExports() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    schedule: 'daily',
    type: 'all',
    format: 'csv',
    email: ''
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    if (session.user.role !== 'stateAdmin') {
      router.push('/dashboard');
      return;
    }
    
    // In a real implementation, you'd fetch existing schedules
    setLoading(false);
  }, [session, status]);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/recurring-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setSchedules(prev => [...prev, result.schedule]);
        setShowCreateForm(false);
        setFormData({
          schedule: 'daily',
          type: 'all',
          format: 'csv',
          email: ''
        });
      } else {
        console.error('Failed to create schedule');
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const handleTestExport = async (type, format) => {
    try {
      const response = await fetch(`/api/admin/recurring-export?type=${type}&format=${format}`);
      
      if (response.ok) {
        if (format === 'csv') {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `test-export-${type}-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `test-export-${type}-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Error testing export:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Recurring Exports</h1>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Create New Schedule
          </button>
        </div>

        {/* Test Export Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Exports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Ward Status</h3>
              <p className="text-sm text-gray-600 mb-3">Export current ward status with login activity</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleTestExport('ward-status', 'csv')}
                  className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => handleTestExport('ward-status', 'json')}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Download JSON
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Relationships</h3>
              <p className="text-sm text-gray-600 mb-3">Export all relationships with MongoDB IDs</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleTestExport('relationships', 'csv')}
                  className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => handleTestExport('relationships', 'json')}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Download JSON
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Form Responses</h3>
              <p className="text-sm text-gray-600 mb-3">Export all form responses with IDs</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleTestExport('forms', 'csv')}
                  className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => handleTestExport('forms', 'json')}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Download JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Schedule Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create Recurring Export</h3>
                
                <form onSubmit={handleCreateSchedule} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule
                    </label>
                    <select
                      value={formData.schedule}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Export Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="all">All Data</option>
                      <option value="ward-status">Ward Status Only</option>
                      <option value="relationships">Relationships Only</option>
                      <option value="forms">Form Responses Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Format
                    </label>
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Send exports to this email"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Create Schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Existing Schedules */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Schedules</h2>
            
            {schedules.length === 0 ? (
              <p className="text-gray-500">No recurring export schedules configured.</p>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {schedule.schedule.charAt(0).toUpperCase() + schedule.schedule.slice(1)} Export
                        </h3>
                        <p className="text-sm text-gray-600">
                          Type: {schedule.type} • Format: {schedule.format.toUpperCase()}
                        </p>
                        {schedule.email && (
                          <p className="text-sm text-gray-600">
                            Email: {schedule.email}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Created: {new Date(schedule.createdAt).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-800 text-sm">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Export Information</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Ward Status:</strong> Includes ward details, login activity, and report submission status</li>
            <li>• <strong>Relationships:</strong> Complete hierarchy with MongoDB IDs for clusters, wards, panchayaths, districts, and coordinators</li>
            <li>• <strong>Form Responses:</strong> All form submissions with ward ID and coordinator ID included</li>
            <li>• <strong>Recurring Exports:</strong> Automated exports can be scheduled and optionally emailed</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}