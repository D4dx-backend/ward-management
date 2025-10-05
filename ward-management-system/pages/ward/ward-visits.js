import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

export default function WardVisits() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    purpose: '',
    findings: '',
    guestVisit: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchVisits();
    }
  }, [status, session, router]);

  const fetchVisits = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching visits for user:', session?.user);
      const response = await axios.get('/api/ward-visits/ward-admin');
      console.log('API response:', response.data);
      setVisits(response.data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
      console.error('Error details:', error.response?.data);
      setError(`Unable to load visits: ${error.response?.data?.message || error.message}`);
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
        purpose: '',
        findings: '',
        guestVisit: ''
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
      purpose: '',
      findings: '',
      guestVisit: ''
    });
  };

  const handleViewVisit = (visit) => {
    setSelectedVisit(visit);
    setShowVisitModal(true);
  };

  const handleCloseVisitModal = () => {
    setShowVisitModal(false);
    setSelectedVisit(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Not specified';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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

      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">Ward Visits</h1>
            <p className="mt-1 text-sm text-gray-600 break-words">Record visits to your ward</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
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
            <div className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 break-words">Record New Visit</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Guest Visit
                    </label>
                    <input
                      type="text"
                      name="guestVisit"
                      value={formData.guestVisit}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter guest name (leave empty for Ward Admin)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Findings & Recommendations
                  </label>
                  <textarea
                    name="findings"
                    value={formData.findings}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter findings and recommendations..."
                  />
                </div>


                <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto order-1 sm:order-2">
                    {isSubmitting ? 'Recording...' : 'Record Visit'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Simple Visits List */}
        <Card>
          <div className="p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 break-words">Visit History</h2>
            
            {visits.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-500 break-words">No visits recorded yet</p>
                <p className="text-sm text-gray-400 mt-1 break-words">Click "Record New Visit" to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visit Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Guest Visit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purpose
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visits.map((visit) => (
                      <tr 
                        key={visit._id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewVisit(visit)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(visit.visitDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {visit.guestVisit && visit.guestVisit.trim() !== '' 
                            ? visit.guestVisit 
                            : (visit.visitTime && visit.visitTime.trim() !== '' && !visit.visitTime.match(/^\d{1,2}:\d{2}$/))
                              ? visit.visitTime
                            : (visit.purpose && visit.purpose.trim() !== '' 
                              ? visit.purpose
                              : (visit.recordedByRole === 'coordinator' ? 'Coordinator' : 'Ward Admin')
                            )
                          }
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate">
                            {visit.purpose}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className="text-blue-600 hover:text-blue-900">
                            View Details
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Visit Details Modal */}
        <Modal
          isOpen={showVisitModal}
          onClose={handleCloseVisitModal}
          title="Visit Details"
          size="lg"
        >
          {selectedVisit && (
            <div className="space-y-4 sm:space-y-6">
              {/* Visit Header */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 break-words">Visit Date</label>
                    <div className="text-sm text-gray-900 break-words">{formatDate(selectedVisit.visitDate)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 break-words">Guest Visit</label>
                    <div className="text-sm text-gray-900 break-words">{selectedVisit.guestVisit}</div>
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 break-words">Purpose of Visit</label>
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{selectedVisit.purpose}</p>
                </div>
              </div>

              {/* Findings & Recommendations */}
              {selectedVisit.findings && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 break-words">Findings & Recommendations</label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{selectedVisit.findings}</p>
                  </div>
                </div>
              )}


              {/* Additional Information */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 break-words">Additional Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 break-words">Recorded on:</span>
                    <span className="ml-2 text-gray-900 break-words">
                      {selectedVisit.createdAt ? new Date(selectedVisit.createdAt).toLocaleString() : 'Not available'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 break-words">Last updated:</span>
                    <span className="ml-2 text-gray-900 break-words">
                      {selectedVisit.updatedAt ? new Date(selectedVisit.updatedAt).toLocaleString() : 'Not available'}
                    </span>
                  </div>
                  {selectedVisit.recordedByRole && (
                    <div>
                      <span className="text-gray-600 break-words">Recorded by:</span>
                      <span className="ml-2 text-gray-900 break-words">
                        {selectedVisit.recordedByRole === 'coordinator' ? 'Coordinator' : selectedVisit.recordedByRole === 'stateAdmin' ? 'State Admin' : 'Ward Admin'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={handleCloseVisitModal} className="w-full sm:w-auto order-2 sm:order-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}