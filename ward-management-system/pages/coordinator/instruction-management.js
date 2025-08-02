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
import Pagination from '../../components/Pagination';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';
import usePagination from '../../hooks/usePagination';

export default function CoordinatorInstructionManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [instructions, setInstructions] = useState([]);
  const [filteredInstructions, setFilteredInstructions] = useState([]);
  const [wardAdmins, setWardAdmins] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedInstruction, setSelectedInstruction] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Pagination using custom hook
  const {
    currentPage,
    itemsPerPage,
    paginatedData: paginatedInstructions,
    totalPages,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    resetPagination,
  } = usePagination(filteredInstructions, 10);

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
    // Filter instructions based on search term, status, and priority
    let filtered = instructions;

    if (searchTerm) {
      filtered = filtered.filter(instruction =>
        instruction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instruction.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(instruction => {
        const stats = instruction.readingStats;
        if (statusFilter === 'all_read') {
          return stats.totalWardAdmins > 0 && stats.readCount === stats.totalWardAdmins;
        } else if (statusFilter === 'partially_read') {
          return stats.readCount > 0 && stats.readCount < stats.totalWardAdmins;
        } else if (statusFilter === 'unread') {
          return stats.readCount === 0;
        } else if (statusFilter === 'has_replies') {
          return stats.replyCount > 0;
        }
        return true;
      });
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(instruction => instruction.priority === priorityFilter);
    }

    setFilteredInstructions(filtered);
    resetPagination();
  }, [instructions, searchTerm, statusFilter, priorityFilter, resetPagination]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch instructions targeted to ward admins in coordinator's district
      const [instructionsRes, wardAdminsRes] = await Promise.all([
        axios.get('/api/coordinator/instructions'),
        axios.get('/api/users/coordinator-district')
      ]);

      setInstructions(instructionsRes.data);
      setWardAdmins(wardAdminsRes.data);
      setError('');
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch instruction data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStatus = (instruction) => {
    setSelectedInstruction(instruction);
    setShowStatusModal(true);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (stats) => {
    if (stats.totalWardAdmins === 0) return 'bg-gray-100 text-gray-800';
    if (stats.readCount === stats.totalWardAdmins) return 'bg-green-100 text-green-800';
    if (stats.readCount > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusText = (stats) => {
    if (stats.totalWardAdmins === 0) return 'No Recipients';
    if (stats.readCount === stats.totalWardAdmins) return 'All Read';
    if (stats.readCount > 0) return 'Partially Read';
    return 'Unread';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <Head>
        <title>Instruction Management - Ward Management System</title>
      </Head>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Instruction Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor instructions sent to ward admins and track their responses
            </p>
          </div>
          <Link href="/instructions" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            View All Instructions
          </Link>
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

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <SearchInput
                  onSearch={setSearchTerm}
                  placeholder="Search instructions..."
                  className="w-full"
                />
              </div>
              
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="all_read">All Read</option>
                  <option value="partially_read">Partially Read</option>
                  <option value="unread">Unread</option>
                  <option value="has_replies">Has Replies</option>
                </select>
              </div>

              <div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <div className="flex items-center">
                {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setPriorityFilter('all');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              Showing {paginatedInstructions.length} of {totalItems} instructions
            </div>
          </div>
        </Card>

        {/* Instructions List */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instruction
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responses
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedInstructions.map((instruction) => (
                  <tr key={instruction._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {instruction.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {instruction.description.substring(0, 100)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(instruction.priority)}`}>
                        {instruction.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(instruction.readingStats)}`}>
                          {getStatusText(instruction.readingStats)}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {instruction.readingStats.readCount}/{instruction.readingStats.totalWardAdmins} read
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {instruction.readingStats.replyCount} replies
                      </div>
                      {instruction.readingStats.replyCount > 0 && (
                        <div className="text-xs text-gray-500">
                          from {instruction.readingStats.uniqueRepliers} ward admins
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(instruction.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewStatus(instruction)}
                        >
                          View Status
                        </Button>
                        <Link href={`/instructions/${instruction._id}`} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          View Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {totalItems === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                            ? 'No instructions found matching your filters' 
                            : 'No instructions found'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </Card>

        {/* Status Modal */}
        {showStatusModal && selectedInstruction && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Instruction Status: {selectedInstruction.title}
                </h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedInstruction.readingStats.totalWardAdmins}
                        </div>
                        <div className="text-sm text-gray-600">Total Recipients</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedInstruction.readingStats.readCount}
                        </div>
                        <div className="text-sm text-gray-600">Read</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedInstruction.readingStats.replyCount}
                        </div>
                        <div className="text-sm text-gray-600">Replies</div>
                      </div>
                    </div>
                  </div>

                  {/* Ward Admin Status */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Ward Admin Status</h4>
                    <div className="space-y-2">
                      {selectedInstruction.wardAdminStatus?.map((status) => (
                        <div key={status.wardAdminId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {status.wardAdminName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {status.wardName ? `${status.wardName} (Ward #${status.wardNumber})` : 'No ward assigned'}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              status.hasRead ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {status.hasRead ? 'Read' : 'Unread'}
                            </span>
                            {status.hasReplied && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Replied
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowStatusModal(false)}
                >
                  Close
                </Button>
                <Link href={`/instructions/${selectedInstruction._id}`} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  View Full Details
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}