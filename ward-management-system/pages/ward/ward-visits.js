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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="ml-2 block text-sm text-gray-700 break-words">
                    Follow-up required
                  </label>
                </div>

                {formData.followUpRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <div className="space-y-3 sm:space-y-4">
                {visits.map((visit) => (
                  <div 
                    key={visit._id} 
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200"
                    onClick={() => handleViewVisit(visit)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 mb-2">
                          <span className="text-sm font-medium text-gray-900 break-words">
                            {new Date(visit.visitDate).toLocaleDateString()}
                          </span>
                          <span className="text-sm text-gray-500 break-words">
                            {visit.visitTime}
                          </span>
                          {visit.followUpRequired && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 self-start">
                              Follow-up Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 mb-2 break-words">
                          {visit.purpose.length > 100 ? `${visit.purpose.substring(0, 100)}...` : visit.purpose}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs text-gray-500">
                            <span className="break-words">
                              Visitor: {visit.recordedByRole === 'coordinator' 
                                ? (visit.recordedBy?.name || visit.coordinator?.name || 'Unknown Coordinator')
                                : visit.recordedByRole === 'stateAdmin'
                                ? (visit.recordedBy?.name || 'State Admin')
                                : (visit.recordedBy?.name || 'Ward Admin')}
                            </span>
                            {visit.attendees && (
                              <span className="break-words">Attendees: {visit.attendees.length > 30 ? `${visit.attendees.substring(0, 30)}...` : visit.attendees}</span>
                            )}
                          </div>
                          <div className="flex items-center text-blue-600 self-start sm:self-auto">
                            <span className="text-xs mr-1">View Details</span>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1 break-words">Visit Time</label>
                    <div className="text-sm text-gray-900 break-words">{formatTime(selectedVisit.visitTime)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 break-words">Visitor</label>
                    <div className="text-sm text-gray-900">
                      {selectedVisit.recordedByRole === 'coordinator' 
                        ? (selectedVisit.recordedBy?.name || selectedVisit.coordinator?.name || 'Unknown Coordinator')
                        : selectedVisit.recordedByRole === 'stateAdmin'
                        ? (selectedVisit.recordedBy?.name || 'State Admin')
                        : (selectedVisit.recordedBy?.name || 'Ward Admin')}
                    </div>
                  </div>
                  {selectedVisit.followUpRequired && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 break-words">Follow-up Status</label>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 self-start">
                          Follow-up Required
                        </span>
                        {selectedVisit.followUpDate && (
                          <span className="text-sm text-gray-600 break-words">
                            Due: {new Date(selectedVisit.followUpDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 break-words">Purpose of Visit</label>
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{selectedVisit.purpose}</p>
                </div>
              </div>

              {/* Findings */}
              {selectedVisit.findings && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 break-words">Findings</label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{selectedVisit.findings}</p>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedVisit.recommendations && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 break-words">Recommendations</label>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{selectedVisit.recommendations}</p>
                  </div>
                </div>
              )}

              {/* Attendees */}
              {selectedVisit.attendees && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 break-words">Attendees</label>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
                    <p className="text-sm text-gray-900 break-words">{selectedVisit.attendees}</p>
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
                {selectedVisit.followUpRequired && (
                  <Button 
                    onClick={() => {
                      // Future: Add follow-up action functionality
                      alert('Follow-up functionality will be implemented soon');
                    }}
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    Mark Follow-up Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}