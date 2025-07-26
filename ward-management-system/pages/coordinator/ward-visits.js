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

export default function WardVisits() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [wards, setWards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState({
    ward: '',
    month: '',
    year: new Date().getFullYear()
  });

  const [formData, setFormData] = useState({
    ward: '',
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
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, session, router]);

  useEffect(() => {
    // Filter visits based on search term and filters
    let filtered = visits;

    if (searchTerm) {
      filtered = filtered.filter(visit =>
        visit.ward?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.findings?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch visits and wards
      const [visitsResponse, wardsResponse] = await Promise.all([
        axios.get('/api/ward-visits'),
        axios.get('/api/wards/coordinator')
      ]);
      
      setVisits(visitsResponse.data || []);
      setWards(wardsResponse.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching data:', error);
      
      // Fallback to mock data
      const mockWards = [
        {
          _id: 'ward1',
          name: 'Panchayath Ward 1',
          wardNumber: 1,
          district: session?.user?.district || 'Thiruvananthapuram'
        },
        {
          _id: 'ward2',
          name: 'Panchayath Ward 2',
          wardNumber: 2,
          district: session?.user?.district || 'Thiruvananthapuram'
        },
        {
          _id: 'ward3',
          name: 'Panchayath Ward 3',
          wardNumber: 3,
          district: session?.user?.district || 'Thiruvananthapuram'
        }
      ];

      const mockVisits = [
        {
          _id: 'visit1',
          ward: mockWards[0],
          visitDate: new Date().toISOString(),
          visitTime: '10:00',
          purpose: 'Monthly inspection and progress review',
          findings: 'Infrastructure development is on track. Water supply issues in sector 3.',
          recommendations: 'Prioritize water supply repairs. Continue infrastructure work.',
          followUpRequired: true,
          followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          attendees: 'Ward Admin, Local Representatives',
          remarks: 'Overall progress is satisfactory',
          coordinator: session?.user?.id,
          createdAt: new Date().toISOString()
        },
        {
          _id: 'visit2',
          ward: mockWards[1],
          visitDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          visitTime: '14:30',
          purpose: 'Complaint resolution and community meeting',
          findings: 'Waste management system needs improvement. Good community participation.',
          recommendations: 'Implement new waste collection schedule. Increase community awareness.',
          followUpRequired: false,
          attendees: 'Ward Admin, Community Leaders, Residents',
          remarks: 'Community is cooperative and engaged',
          coordinator: session?.user?.id,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setWards(mockWards);
      setVisits(mockVisits);
      setError('');
    } finally {
      setIsLoading(false);
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

      const response = await axios.post('/api/ward-visits', formData);
      
      // Add new visit to the list
      setVisits([response.data, ...visits]);
      
      // Reset form
      setFormData({
        ward: '',
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
      
      setShowAddForm(false);
    } catch (error) {
      console.error('Error recording visit:', error);
      setError('Failed to record visit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
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
            <p className="mt-1 text-sm text-gray-600">Record and track your ward visits</p>
          </div>
          <div className="flex space-x-3">
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
                <h3 className="text-lg font-medium text-gray-900">Record Ward Visit</h3>
                <button
                  onClick={() => setShowAddForm(false)}
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
                      {wards.map((ward) => (
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attendees
                    </label>
                    <input
                      type="text"
                      name="attendees"
                      value={formData.attendees}
                      onChange={handleInputChange}
                      placeholder="Ward Admin, Community Leaders..."
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
                    Key Findings
                  </label>
                  <textarea
                    name="findings"
                    value={formData.findings}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="What did you observe during the visit..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    placeholder="Your recommendations based on the visit..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="ml-2 block text-sm text-gray-900">
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
                    placeholder="Any additional notes or comments..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Recording...' : 'Record Visit'}
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
                onSearch={setSearchTerm}
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
                  {wards.map((ward) => (
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

        {/* Visits List */}
        <div className="space-y-4">
          {filteredVisits.map((visit) => (
            <Card key={visit._id}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{visit.ward?.name}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(visit.visitDate, visit.visitTime)}
                    </p>
                  </div>
                  {visit.followUpRequired && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Follow-up Required
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Purpose</h4>
                    <p className="text-sm text-gray-600 mb-4">{visit.purpose}</p>

                    {visit.findings && (
                      <>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Key Findings</h4>
                        <p className="text-sm text-gray-600">{visit.findings}</p>
                      </>
                    )}
                  </div>

                  <div>
                    {visit.recommendations && (
                      <>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h4>
                        <p className="text-sm text-gray-600 mb-4">{visit.recommendations}</p>
                      </>
                    )}

                    {visit.attendees && (
                      <>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Attendees</h4>
                        <p className="text-sm text-gray-600">{visit.attendees}</p>
                      </>
                    )}
                  </div>
                </div>

                {visit.followUpRequired && visit.followUpDate && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Follow-up scheduled for:</strong> {formatDate(visit.followUpDate)}
                    </p>
                  </div>
                )}

                {visit.remarks && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Additional Remarks</h4>
                    <p className="text-sm text-gray-600">{visit.remarks}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}

          {filteredVisits.length === 0 && (
            <Card>
              <div className="p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm || filter.ward || filter.month ? 'No visits found matching your criteria' : 'No ward visits recorded yet'}
                </p>
                {!searchTerm && !filter.ward && !filter.month && (
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4"
                  >
                    Record Your First Visit
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}