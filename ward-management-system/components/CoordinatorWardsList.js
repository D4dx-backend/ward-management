import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Modal from './Modal';
import Button from './Button';

const CoordinatorWardsList = ({ wards = [], title = "My Wards" }) => {
  const [expandedWard, setExpandedWard] = useState(null);
  const [wardClusters, setWardClusters] = useState({});
  const [loadingClusters, setLoadingClusters] = useState({});
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [selectedWardClusters, setSelectedWardClusters] = useState([]);
  const [selectedWardName, setSelectedWardName] = useState('');

  const fetchWardClusters = async (wardId) => {
    if (wardClusters[wardId] || loadingClusters[wardId]) return;

    setLoadingClusters(prev => ({ ...prev, [wardId]: true }));
    
    try {
      const response = await axios.get(`/api/coordinator/wards/${wardId}/clusters`);
      setWardClusters(prev => ({ 
        ...prev, 
        [wardId]: response.data.clusters || [] 
      }));
    } catch (error) {
      console.error('Error fetching ward clusters:', error);
      // Set empty array on error to prevent repeated requests
      setWardClusters(prev => ({ ...prev, [wardId]: [] }));
    } finally {
      setLoadingClusters(prev => ({ ...prev, [wardId]: false }));
    }
  };

  const handleWardClick = (ward) => {
    if (expandedWard === ward._id) {
      setExpandedWard(null);
    } else {
      setExpandedWard(ward._id);
      fetchWardClusters(ward._id);
    }
  };

  const handleViewAllClusters = (ward) => {
    setSelectedWardClusters(wardClusters[ward._id] || []);
    setSelectedWardName(ward.name);
    setShowClusterModal(true);
  };

  const getClusterStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {wards.length}
              </span>
            </div>
            <Link href="/coordinator/wards" className="text-sm text-blue-600 hover:text-blue-800">
              View all
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {wards.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0a2 2 0 002 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v16z" />
                </svg>
                <p className="mt-2 text-sm">No wards assigned</p>
              </div>
            </div>
          ) : (
            wards.map((ward) => (
              <div key={ward._id} className="hover:bg-gray-50">
                <div 
                  className="px-4 py-3 cursor-pointer"
                  onClick={() => handleWardClick(ward)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex-shrink-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          ward.hasAdmin ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          <svg className={`w-3 h-3 ${
                            ward.hasAdmin ? 'text-green-600' : 'text-yellow-600'
                          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0a2 2 0 002 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v16z" />
                          </svg>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {ward.name} (Ward #{ward.wardNumber})
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            ward.hasAdmin 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {ward.hasAdmin ? 'Active' : 'No Admin'}
                          </span>
                          {/* Cluster count badge */}
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {ward.clusterCount || 0} clusters
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {ward.panchayath}, {ward.district}
                        </p>
                        {ward.hasAdmin && ward.adminName && (
                          <p className="text-xs text-gray-400">
                            Admin: {ward.adminName}
                            {ward.adminMobile && ` (${ward.adminMobile})`}
                          </p>
                        )}
                        {ward.population && (
                          <p className="text-xs text-gray-400">
                            Population: {ward.population.toLocaleString()}
                            {ward.area && ` • Area: ${ward.area} sq km`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link 
                        href={`/coordinator/ward-profile/${ward._id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Details
                      </Link>
                      <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedWard === ward._id ? 'rotate-90' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded cluster view */}
                {expandedWard === ward._id && (
                  <div className="px-4 pb-3 bg-gray-50 border-t border-gray-200">
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Clusters</h4>
                        {wardClusters[ward._id] && wardClusters[ward._id].length > 3 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewAllClusters(ward);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View all {wardClusters[ward._id].length}
                          </button>
                        )}
                      </div>
                      
                      {loadingClusters[ward._id] ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : wardClusters[ward._id] && wardClusters[ward._id].length > 0 ? (
                        <div className="space-y-2">
                          {wardClusters[ward._id].slice(0, 3).map((cluster) => (
                            <div key={cluster._id} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm text-gray-900">{cluster.name}</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getClusterStatusColor(cluster.status)}`}>
                                  {cluster.status || 'active'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {cluster.householdCount || 0} households
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <p className="mt-1 text-xs text-gray-500">No clusters found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cluster Details Modal */}
      <Modal
        isOpen={showClusterModal}
        onClose={() => setShowClusterModal(false)}
        title={`${selectedWardName} - All Clusters`}
        size="lg"
      >
        <div className="space-y-4">
          {selectedWardClusters.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No clusters found for this ward</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {selectedWardClusters.map((cluster) => (
                <div key={cluster._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{cluster.name}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getClusterStatusColor(cluster.status)}`}>
                          {cluster.status || 'active'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Households:</span> {cluster.householdCount || 0}
                        </div>
                        <div>
                          <span className="font-medium">Population:</span> {cluster.population || 0}
                        </div>
                        {cluster.area && (
                          <div>
                            <span className="font-medium">Area:</span> {cluster.area} sq km
                          </div>
                        )}
                        {cluster.lastVisited && (
                          <div>
                            <span className="font-medium">Last Visited:</span> {new Date(cluster.lastVisited).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {cluster.description && (
                        <p className="text-xs text-gray-500 mt-2">{cluster.description}</p>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      <Link
                        href={`/coordinator/clusters/${cluster._id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setShowClusterModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CoordinatorWardsList;