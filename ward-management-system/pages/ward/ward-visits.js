import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function WardVisits() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitTime: '10:00',
    purpose: '',
    findings: '',
    recommendations: '',
    followUpRequired: false,
    followUpDate: '',
    attendees: '',
    remarks: ''
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
      const response = await axios.get('/api/ward-visits/ward-admin');
      setVisits(response.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching visits:', error);
      setError('Failed to fetch ward visits');
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
      if (editingVisit) {
        // Update existing visit
        await axios.put(`/api/ward-visits/ward-admin?visitId=${editingVisit._id}`, formData);
        setSuccess('Ward visit updated successfully!');
      } else {
        // Create new visit
        await axios.post('/api/ward-visits/ward-admin', formData);
        setSuccess('Ward visit recorded successfully!');
      }
      
      setShowForm(false);
      setEditingVisit(null);
      setFormData({
        visitDate: new Date().toISOString().split('T')[0],
        visitTime: '10:00',
        purpose: '',
        findings: '',
        recommendations: '',
        followUpRequired: false,
        followUpDate: '',
        attendees: '',
        remarks: ''
      });
      fetchVisits();
    } catch (error) {
      console.error('Error saving visit:', error);
      setError(error.response?.data?.message || 'Failed to save ward visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (visit) => {
    setEditingVisit(visit);
    setFormData({
      visitDate: visit.visitDate.split('T')[0],
      visitTime: visit.visitTime,
      purpose: visit.purpose,
      findings: visit.findings || '',
      recommendations: visit.recommendations || '',
      followUpRequired: visit.followUpRequired,
      followUpDate: visit.followUpDate ? visit.followUpDate.split('T')[0] : '',
      attendees: visit.attendees || '',
      remarks: visit.remarks || ''
    });
    setShowForm(true);
  };

  const handleView = (visit) => {
    setSelectedVisit(visit);
    setShowViewModal(true);
  };

  const handleDelete = (visit) => {
    setVisitToDelete(visit);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/ward-visits/ward-admin?visitId=${visitToDelete._id}`);
      setSuccess('Ward visit deleted successfully!');
      setShowDeleteModal(false);
      setVisitToDelete(null);
      fetchVisits();
    } catch (error) {
      console.error('Error deleting visit:', error);
      setError(error.response?.data?.message || 'Failed to delete ward visit');
      setShowDeleteModal(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVisit(null);
    setFormData({
      visitDate: new Date().toISOString().split('T')[0],
      visitTime: '10:00',
      purpose: '',
      findings: '',
      recommendations: '',
      followUpRequired: false,
      followUpDate: '',
      attendees: '',
      remarks: ''
    });
  };

  const formatDateTime = (date, time) => {
    const visitDate = new Date(date);
    return `${visitDate.toLocaleDateString()} at ${time}`;
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Ward Visits Record - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Visits Record</h1>
            <p className="mt-1 text-sm text-gray-600">Record visits to your ward by coordinators and officials</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showForm ? 'Cancel' : 'Record New Visit'}
          </Button>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{success}</p>
              </div>
            </div>
          </div>
        )}

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

        {/* Visit Recording Form */}
        {showForm && (
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingVisit ? 'Edit Visit' : 'Record New Visit'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {editingVisit ? 'Update visit information' : 'Document visits by coordinators or officials to your ward'}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visit Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="visitDate"
                    value={formData.visitDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose of Visit <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the purpose of the visit..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Findings
                </label>
                <textarea
                  name="findings"
                  value={formData.findings}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Document key findings from the visit..."
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any recommendations or action items..."
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="List of people who attended the visit..."
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional remarks or notes..."
                />
              </div>

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
                  {isSubmitting ? (editingVisit ? 'Updating...' : 'Recording...') : (editingVisit ? 'Update Visit' : 'Record Visit')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Visits List */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Visit History</h2>
            <p className="text-sm text-gray-600 mt-1">All recorded visits to your ward</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visit Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Follow-up
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recorded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visits.map((visit) => (
                  <tr key={visit._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDateTime(visit.visitDate, visit.visitTime)}
                        </div>
                        {visit.attendees && (
                          <div className="text-sm text-gray-500">
                            Attendees: {visit.attendees}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{visit.purpose}</div>
                      {visit.findings && (
                        <div className="text-sm text-gray-500 mt-1">
                          Findings: {visit.findings.substring(0, 100)}
                          {visit.findings.length > 100 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {visit.followUpRequired ? (
                        <div>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Required
                          </span>
                          {visit.followUpDate && (
                            <div className="text-xs text-gray-500 mt-1">
                              Due: {new Date(visit.followUpDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Not Required
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(visit.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(visit)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleEdit(visit)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(visit)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visits.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="mt-2 text-sm">No ward visits recorded yet</p>
                        <p className="mt-1 text-sm text-gray-400">
                          Click "Record New Visit" to document your first visit
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* View Details Modal */}
        {showViewModal && selectedVisit && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Visit Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Visit Date & Time</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDateTime(selectedVisit.visitDate, selectedVisit.visitTime)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Attendees</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedVisit.attendees || 'Not specified'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Purpose</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVisit.purpose}</p>
                </div>

                {selectedVisit.findings && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Key Findings</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedVisit.findings}</p>
                  </div>
                )}

                {selectedVisit.recommendations && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Recommendations</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedVisit.recommendations}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Follow-up Required</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedVisit.followUpRequired ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {selectedVisit.followUpRequired && selectedVisit.followUpDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedVisit.followUpDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {selectedVisit.remarks && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Additional Remarks</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedVisit.remarks}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Recorded by:</span> {selectedVisit.coordinator?.name || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Recorded on:</span> {new Date(selectedVisit.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedVisit);
                  }}
                >
                  Edit Visit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && visitToDelete && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">Delete Visit</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete this visit record? This action cannot be undone.
                  </p>
                  <div className="mt-2 p-2 bg-gray-50 rounded text-left">
                    <p className="text-xs text-gray-600">
                      <strong>Date:</strong> {formatDateTime(visitToDelete.visitDate, visitToDelete.visitTime)}
                    </p>
                    <p className="text-xs text-gray-600">
                      <strong>Purpose:</strong> {visitToDelete.purpose.substring(0, 50)}...
                    </p>
                  </div>
                </div>
                <div className="items-center px-4 py-3">
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmDelete}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}