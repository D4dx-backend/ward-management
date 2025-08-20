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
import { ShimmerDashboard, ShimmerTable, ShimmerCard } from '../../components/Shimmer';

import { usePersistedData } from '../../lib/simpleCache';

export default function CoordinatorWards() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [filteredWards, setFilteredWards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Use persistent data hook to prevent unnecessary reloading
  const { 
    data: wards = [], 
    loading: isLoading, 
    error: dataError, 
    refresh: refreshWards 
  } = usePersistedData(
    'coordinator_wards_detailed',
    async () => {
      try {
        const response = await axios.get('/api/coordinator/wards-detailed');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching detailed wards:', error);
        // Fallback to basic wards API
        const basicResponse = await axios.get('/api/coordinator/wards');
        return basicResponse.data || [];
      }
    },
    {
      ttl: 60 * 60 * 1000, // Cache for 1 hour
      dependencies: [status, session?.user?.role]
    }
  );

  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (dataError) {
      setError(`Failed to load wards: ${dataError.message || 'Unknown error'}`);
    } else {
      setError('');
    }
  }, [dataError]);

  useEffect(() => {
    // Filter wards based on search term
    let filtered = wards;

    if (searchTerm) {
      filtered = filtered.filter(ward =>
        ward.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.wardNumber?.toString().includes(searchTerm)
      );
    }

    setFilteredWards(filtered);
  }, [wards, searchTerm]);

  const handleWardClick = (ward) => {
    // Navigate to dedicated ward profile page instead of modal
    router.push(`/coordinator/wards/${ward._id}?name=${encodeURIComponent(ward.name)}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Wards - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Wards</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and monitor wards under your coordination
            </p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={refreshWards} variant="outline" disabled={isLoading}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Link href="/">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
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

        {/* Search and Filters */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search wards by name, district, or number..."
                className="md:w-96"
              />
              <div className="text-sm text-gray-600">
                {filteredWards.length} of {wards.length} wards
              </div>
            </div>
          </div>
        </Card>

        {/* Wards Grid */}
        {filteredWards.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No wards found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'No wards are assigned to you yet.'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWards.map((ward) => (
              <Card key={ward._id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-6" onClick={() => handleWardClick(ward)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {ward.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Ward #{ward.wardNumber} • {ward.district}
                      </p>
                    </div>
                    <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(ward.status || 'active')}`}>
                      {(ward.status || 'active').charAt(0).toUpperCase() + (ward.status || 'active').slice(1)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Population:</span>
                        <div className="font-medium text-gray-900">
                          {ward.population?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Households:</span>
                        <div className="font-medium text-gray-900">
                          {ward.totalHouseholds?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Clusters:</span>
                        <div className="font-medium text-gray-900">
                          {ward.totalClusters || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Visit:</span>
                        <div className="font-medium text-gray-900">
                          {formatDate(ward.lastVisitDate)}
                        </div>
                      </div>
                    </div>

                    {ward.wardAdmin && (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-sm">
                          <span className="text-gray-500">Ward Admin:</span>
                          <div className="font-medium text-gray-900">
                            {ward.wardAdmin.name}
                          </div>
                          {ward.wardAdmin.mobileNumber && (
                            <div className="text-gray-600">
                              {ward.wardAdmin.mobileNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Click to view detailed profile
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}


      </div>
    </Layout>
  );
}