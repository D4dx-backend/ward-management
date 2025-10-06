import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import SearchInput from '../../components/SearchInput';
import Modal from '../../components/Modal';
import WardClusterVisitStatus from '../../components/WardClusterVisitStatus';
import { usePersistedData } from '../../lib/simpleCache';

export default function WardVisits() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [showVisitStatusModal, setShowVisitStatusModal] = useState(false);
  const [filter, setFilter] = useState({
    ward: '',
    month: '',
    year: new Date().getFullYear()
  });

  const [formData, setFormData] = useState({
    ward: '',
    visitDate: new Date().toISOString().split('T')[0],
    purpose: '',
    findingsAndRecommendations: '',
    guest: ''
  });

  // Use persistent data hooks to prevent unnecessary reloading
  const { 
    data: visits = [], 
    loading: visitsLoading, 
    error: visitsError, 
    refresh: refreshVisits 
  } = usePersistedData(
    'coordinator_ward_visits',
    async () => {
      const response = await axios.get('/api/ward-visits');
      return response.data || [];
    },
    {
      ttl: 60 * 60 * 1000, // Cache for 1 hour
      dependencies: [status, session?.user?.role]
    }
  );

  const { 
    data: wards = [], 
    loading: wardsLoading, 
    error: wardsError 
  } = usePersistedData(
    'coordinator_wards',
    async () => {
      const response = await axios.get('/api/coordinator/wards');
      return response.data || [];
    },
    {
      ttl: 60 * 60 * 1000, // Cache for 1 hour
      dependencies: [status, session?.user?.role]
    }
  );

  const isLoading = visitsLoading || wardsLoading;

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (visitsError || wardsError) {
      setError(`Failed to load data: ${visitsError?.message || wardsError?.message || 'Unknown error'}`);
    } else {
      setError('');
    }
  }, [visitsError, wardsError]);

  useEffect(() => {
    // Filter visits based on search term and filters
    let filtered = visits || [];

    if (searchTerm) {
      filtered = filtered.filter(visit =>
        visit.ward?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.findingsAndRecommendations?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.findings?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.recommendations?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.guest?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter.ward) {
      filtered = filtered.filter(visit => visit.ward?._id === filter.ward);
    }

    if (filter.month) {
      filtered = filtered.filter(visit => {
        const visitDate = new Date(visit.visitDate);
        return visitDate.getMonth() + 1 === parseInt(filter.month);
      });
    }

    if (filter.year) {
      filtered = filtered.filter(visit => {
        const visitDate = new Date(visit.visitDate);
        return visitDate.getFullYear() === parseInt(filter.year);
      });
    }

    setFilteredVisits(filtered);
  }, [visits, searchTerm, filter]);

  // Refresh function that updates both visits and wards
  const refreshData = async () => {
    try {
      await refreshVisits();
      setSuccess('Data refreshed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to refresh data. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.ward || !formData.visitDate || !formData.purpose) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      if (editingVisit) {
        // Update existing visit
        const response = await axios.put(`/api/ward-visits?visitId=${editingVisit._id}`, formData);
        // Refresh the visits data to get the updated visit
        await refreshVisits();
        setError('');
        setSuccess('Visit updated successfully!');
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      } else {
        // Create new visit
        const response = await axios.post('/api/ward-visits', formData);
        console.log('Visit created:', response.data);
        setSuccess('Visit recorded successfully!');
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
        
        // Refresh data to ensure consistency
        await refreshVisits();
      }
      
      // Reset form
      setFormData({
        ward: '',
        visitDate: new Date().toISOString().split('T')[0],
        purpose: '',
        findingsAndRecommendations: '',
        guest: ''
      });
      
      setShowAddForm(false);
      setEditingVisit(null);
    } catch (error) {
      console.error('Error saving visit:', error);
      console.error('Error details:', error.response?.data);
      setError(`Failed to save visit: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (visit) => {
    setEditingVisit(visit);
    setFormData({
      ward: visit.ward._id,
      visitDate: visit.visitDate.split('T')[0],
      purpose: visit.purpose,
      findingsAndRecommendations: visit.findingsAndRecommendations || (visit.findings && visit.recommendations ? `${visit.findings}\n\nRecommendations:\n${visit.recommendations}` : visit.findings || visit.recommendations || ''),
      guest: visit.guest || ''
    });
    setShowAddForm(true);
  };


  const handleCancel = () => {
    setShowAddForm(false);
    setEditingVisit(null);
    setFormData({
      ward: '',
      visitDate: new Date().toISOString().split('T')[0],
      purpose: '',
      findingsAndRecommendations: '',
      guest: ''
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateString, timeString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${timeString}`;
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
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
            <p className="mt-1 text-sm text-gray-600">Record and manage visits to wards under your coordination</p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={() => setShowVisitStatusModal(true)} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Ward Visit Status
            </Button>
            <Button onClick={() => setShowAddForm(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Record Visit
            </Button>
            <Link href="/">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">
                <strong>Ward Visits:</strong> Record and track visits to wards under your coordination. 
                Visits are clearly marked to show whether they were conducted by you (Coordinator) or the Ward Administrator.
              </p>
            </div>
          </div>
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

        {/* Add Visit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingVisit ? 'Edit Ward Visit' : 'Record Ward Visit'}
                </h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ward <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="ward"
                      value={formData.ward}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Ward</option>
                      {Array.isArray(wards) && wards.map((ward) => (
                        <option key={ward._id} value={ward._id}>
                          {ward.name} (Ward #{ward.wardNumber})
                        </option>
                      ))}
                    </select>
                  </div>

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
                      Guest
                    </label>
                    <input
                      type="text"
                      name="guest"
                      value={formData.guest}
                      onChange={handleInputChange}
                      placeholder="Enter guest name if any, otherwise leave blank for coordinator"
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
                    rows={2}
                    placeholder="Describe the purpose of your visit..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Findings & Recommendations
                  </label>
                  <textarea
                    name="findingsAndRecommendations"
                    value={formData.findingsAndRecommendations}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="What did you observe during the visit and your recommendations..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>


                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (editingVisit ? 'Updating...' : 'Recording...') : (editingVisit ? 'Update Visit' : 'Record Visit')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search visits..."
                className="md:col-span-1"
              />
              
              <div>
                <select
                  name="ward"
                  value={filter.ward}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Wards</option>
                  {Array.isArray(wards) && wards.map((ward) => (
                    <option key={ward._id} value={ward._id}>{ward.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="month"
                  value={filter.month}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="year"
                  value={filter.year}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>{year}</option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Enhanced Visits Table */}
        <Card>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                {/* Enhanced Table Header */}
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Ward & Visit Info</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Conducted By</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Visit Date</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Purpose & Findings</span>
                      </div>
                    </th>
                  </tr>
                </thead>

                {/* Enhanced Table Body */}
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVisits.map((visit, index) => (
                    <tr key={visit._id} className={`hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {/* Ward & Visit Info */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {visit.ward?.name?.charAt(0) || 'W'}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {visit.ward?.name}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                  Ward #{visit.ward?.wardNumber}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Conducted By */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              visit.recordedByRole === 'coordinator' || visit.recordedBy?.role === 'coordinator'
                                ? 'bg-blue-100' 
                                : 'bg-green-100'
                            }`}>
                              <svg className={`w-4 h-4 ${
                                visit.recordedByRole === 'coordinator' || visit.recordedBy?.role === 'coordinator'
                                  ? 'text-blue-600' 
                                  : 'text-green-600'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {visit.recordedByRole === 'coordinator' || visit.recordedBy?.role === 'coordinator'
                                  ? 'Coordinator' 
                                  : 'Ward Admin'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {visit.recordedByRole === 'coordinator' || visit.recordedBy?.role === 'coordinator'
                                  ? (visit.recordedBy?.name || visit.coordinator?.name || 'Unknown Coordinator')
                                  : (visit.recordedBy?.name || visit.ward?.wardAdmin?.name || 'Ward Admin')}
                              </div>
                            </div>
                          </div>
                          <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            visit.recordedByRole === 'coordinator' || visit.recordedBy?.role === 'coordinator'
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {visit.recordedByRole === 'coordinator' || visit.recordedBy?.role === 'coordinator'
                              ? 'Coordinator Visit' 
                              : 'Ward Admin Visit'}
                          </div>
                        </div>
                      </td>

                      {/* Visit Date */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatDate(visit.visitDate)}
                            </div>
                          </div>
                          {visit.guest && (
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="truncate max-w-[150px]" title={visit.guest}>
                                Guest: {visit.guest}
                              </span>
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            by {visit.recordedByRole === 'coordinator' || visit.recordedBy?.role === 'coordinator'
                              ? (visit.recordedBy?.name || visit.coordinator?.name || 'Unknown Coordinator')
                              : visit.recordedByRole === 'stateAdmin' || visit.recordedBy?.role === 'stateAdmin'
                              ? (visit.recordedBy?.name || 'State Admin')
                              : (visit.recordedBy?.name || visit.ward?.wardAdmin?.name || 'Ward Admin')}
                          </div>
                        </div>
                      </td>

                      {/* Purpose & Findings */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="space-y-3 max-w-sm">
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Purpose</div>
                            <div className="text-sm text-gray-900 line-clamp-2" title={visit.purpose}>
                              {visit.purpose}
                            </div>
                          </div>
                          {(visit.findingsAndRecommendations || visit.findings || visit.recommendations) && (
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Findings & Recommendations</div>
                              <div className="text-sm text-gray-600 line-clamp-3" title={visit.findingsAndRecommendations || (visit.findings && visit.recommendations ? `${visit.findings}\n\nRecommendations:\n${visit.recommendations}` : visit.findings || visit.recommendations || '')}>
                                {visit.findingsAndRecommendations || (visit.findings && visit.recommendations ? `${visit.findings}\n\nRecommendations:\n${visit.recommendations}` : visit.findings || visit.recommendations || '')}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>


                    </tr>
                  ))}

                  {/* Empty State */}
                  {filteredVisits.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">No ward visits found</h3>
                          <p className="text-sm text-gray-500">
                            {searchTerm || filter.ward || filter.month ? 'No visits match your current filters' : 'No ward visits have been recorded yet'}
                          </p>
                          {!searchTerm && !filter.ward && !filter.month && (
                            <Button
                              onClick={() => setShowAddForm(true)}
                              className="mt-4"
                              size="sm"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Record First Visit
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Enhanced Table Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-xs text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Active Visit</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Coordinator Visit</span>
                    <span>Your Visit</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ward Incharge Record</span>
                    <span>Ward Record</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Showing {filteredVisits.length} of {visits?.length || 0} visits
                </div>
              </div>
            </div>
          </div>
        </Card>


        {/* Ward Visit Status Modal */}
        <Modal
          isOpen={showVisitStatusModal}
          onClose={() => setShowVisitStatusModal(false)}
          title="Ward Visit Status"
          size="xl"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              House visit tracking across all wards under your coordination
            </p>
            <WardClusterVisitStatus />
          </div>
        </Modal>
      </div>
    </Layout>
  );
}