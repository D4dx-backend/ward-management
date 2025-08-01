import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import InstructionCard from '../../components/InstructionCard';
import InstructionStats from '../../components/InstructionStats';

export default function WardInstructions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [instructions, setInstructions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({ total: 0, read: 0, unread: 0 });
  const [filteredInstructions, setFilteredInstructions] = useState([]);

  useEffect(() => {
    // Check if user is authenticated and is ward admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchInstructions();
      fetchStats();
    }
  }, [status, session, router]);

  const fetchInstructions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/instructions');
      const instructionsData = response.data.instructions || response.data || [];
      setInstructions(instructionsData);
      setError('');
    } catch (error) {
      console.error('Error fetching instructions:', error);
      setError('Failed to fetch instructions');
      setInstructions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/instructions/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Filter instructions based on active tab
  useEffect(() => {
    let filtered = instructions;
    
    if (activeTab === 'ward_admin') {
      filtered = instructions.filter(instruction => 
        instruction.targetAudience === 'ward_admins' ||
        instruction.targetAudience === 'specific_wards' ||
        instruction.targetAudience === 'ward_or_group' ||
        instruction.targetGroups === 'all_ward_admins' ||
        instruction.targetGroups === 'specific_ward_admins'
      );
    } else if (activeTab === 'coordinator') {
      filtered = instructions.filter(instruction => 
        instruction.targetAudience === 'coordinators' ||
        instruction.targetAudience === 'specific_coordinators' ||
        instruction.targetGroups === 'all_coordinators' ||
        instruction.targetGroups === 'specific_coordinators'
      );
    } else if (activeTab === 'unread') {
      filtered = instructions.filter(instruction => !instruction.isRead);
    } else if (activeTab === 'read') {
      filtered = instructions.filter(instruction => instruction.isRead);
    }
    
    setFilteredInstructions(filtered);
  }, [instructions, activeTab, session]);

  const markAsRead = async (instructionId) => {
    try {
      await axios.post(`/api/instructions/${instructionId}`, {
        action: 'mark_read'
      });
      
      // Update local state
      setInstructions(prev => prev.map(instruction => 
        instruction._id === instructionId 
          ? { ...instruction, isRead: true }
          : instruction
      ));
      
      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
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
        <title>Instructions - Ward Management System</title>
      </Head>

      <div className="space-y-6 overflow-hidden">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Instructions</h1>
            <p className="mt-1 text-sm text-gray-600">Important instructions and announcements for ward administrators</p>
          </div>
          <InstructionStats stats={stats} />
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Instructions', count: instructions.length },
              { key: 'ward_admin', label: 'For Ward Admins', count: instructions.filter(i => 
                i.targetAudience === 'ward_admins' || 
                i.targetAudience === 'specific_wards' ||
                i.targetAudience === 'ward_or_group' ||
                i.targetGroups === 'all_ward_admins' ||
                i.targetGroups === 'specific_ward_admins'
              ).length },
              { key: 'coordinator', label: 'From Coordinators', count: instructions.filter(i => 
                i.targetAudience === 'coordinators' || 
                i.targetAudience === 'specific_coordinators' ||
                i.targetGroups === 'all_coordinators' ||
                i.targetGroups === 'specific_coordinators'
              ).length },
              { key: 'unread', label: 'Unread', count: stats.unread },
              { key: 'read', label: 'Read', count: stats.read }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
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

        {/* Dynamic Instructions */}
        <div className="space-y-4">
          {filteredInstructions.length > 0 ? (
            filteredInstructions.map((instruction) => (
              <InstructionCard
                key={instruction._id}
                instruction={instruction}
                onMarkAsRead={markAsRead}
                session={session}
              />
            ))
          ) : (
            <Card>
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No instructions available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Check back later for important announcements and guidelines.
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Quick Help Section */}
        <Card>
          <div className="p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Help</h2>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Role:</strong> Ward Administrator
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 overflow-hidden">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700 break-words overflow-wrap-anywhere">
                    Need help? Contact your coordinator or state administrator with any questions or issues.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}