import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function WardVisitsSimple() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitTime: '10:00',
    purpose: '',
    findings: '',
    recommendations: '',
    followUpRequired: false,
    followUpDate: '',
    attendees: ''
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated') {
      if (session?.user?.role !== 'wardAdmin') {
        router.push('/');
        return;
      }
      fetchVisits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role]);

  const fetchVisits = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/ward-visits/ward-admin');
      setVisits(response.data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
      setError('Unable to load visits. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/ward-visits/ward-admin', formData);
      setSuccess('Ward visit recorded successfully!');
      setShowForm(false);
      setFormData({
        visitDate: new Date().toISOString().split('T')[0],
        visitTime: '10:00',
        purpose: '',
        findings: '',
        recommendations: '',
        followUpRequired: false,
        followUpDate: '',
        attendees: ''
      });
      fetchVisits();
    } catch (error) {
      console.error('Error saving visit:', error);
      setError('Unable to save ward visit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      visitDate: new Date().toISOString().split('T')[0],
      visitTime: '10:00',
      purpose: '',
      findings: '',
      recommendations: '',
      followUpRequired: false,
      followUpDate: '',
      attendees: ''
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Ward Visits - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Visits</h1>
            <p className="mt-1 text-sm text-gray-600">Record visits to your ward</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Record New Visit'}
          </Button>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Simple Form */}
        {showForm && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Record New Visit</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visit Date *
                    </label>
                    <input
                      type="date"
                      name="visitDate"
                      value={formData.visitDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visit Time
                    </label>
                    <input
                      type="time"
                      name="visitTime"
                      value={formData.visitTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose of Visit *
                  </label>
                  <textarea
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the purpose of the visit..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Findings
                  </label>
                  <textarea
                    name="findings"
                    value={formData.findings}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Key findings from the visit..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recommendations
                  </label>
                  <textarea
                    name="recommendations"
                    value={formData.recommendations}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Recommendations or action items..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attendees
                  </label>
                  <input
                    type="text"
                    name="attendees"
                    value={formData.attendees}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="List of attendees..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="followUpRequired"
                    checked={formData.followUpRequired}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Follow-up required
                  </label>
                </div>

                {formData.followUpRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      name="followUpDate"
                      value={formData.followUpDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Recording...' : 'Record Visit'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Simple Visits List */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Visit History</h2>
            
            {visits.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No visits recorded yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Record New Visit" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {visits.map((visit) => (
                  <div key={visit._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(visit.visitDate).toLocaleDateString()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {visit.visitTime}
                          </span>
                          {visit.followUpRequired && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Follow-up Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{visit.purpose}</p>
                        {visit.findings && (
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Findings:</strong> {visit.findings}
                          </p>
                        )}
                        {visit.recommendations && (
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Recommendations:</strong> {visit.recommendations}
                          </p>
                        )}
                        {visit.attendees && (
                          <p className="text-sm text-gray-600">
                            <strong>Attendees:</strong> {visit.attendees}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}