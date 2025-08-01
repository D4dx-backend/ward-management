import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function SystemStatus() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [systemStatus, setSystemStatus] = useState({
    database: 'checking',
    whatsapp: 'checking',
    forms: 'checking',
    clusters: 'checking',
    users: 'checking',
    wards: 'checking'
  });
  const [details, setDetails] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  if (status === 'loading') {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (session.user.role !== 'stateAdmin') {
    router.push('/');
    return null;
  }

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setIsLoading(true);
    const newStatus = {};
    const newDetails = {};

    // Check Database Connection
    try {
      const response = await axios.get('/api/users');
      newStatus.database = 'healthy';
      newDetails.database = `Connected successfully. Found ${response.data.length} users.`;
    } catch (error) {
      newStatus.database = 'error';
      newDetails.database = `Database connection failed: ${error.message}`;
    }

    // Check WhatsApp API
    try {
      const response = await axios.post('/api/debug-whatsapp', {
        recipient: '1234567890',
        message: 'System status check'
      });
      newStatus.whatsapp = response.data.success ? 'healthy' : 'warning';
      newDetails.whatsapp = response.data.success 
        ? 'WhatsApp API is configured and working'
        : `WhatsApp API issue: ${response.data.error}`;
    } catch (error) {
      newStatus.whatsapp = 'error';
      newDetails.whatsapp = `WhatsApp API error: ${error.message}`;
    }

    // Check Forms System
    try {
      const response = await axios.get('/api/forms');
      newStatus.forms = 'healthy';
      newDetails.forms = `Forms system working. Found ${response.data.length} forms.`;
    } catch (error) {
      newStatus.forms = 'error';
      newDetails.forms = `Forms system error: ${error.message}`;
    }

    // Check Clusters System
    try {
      const response = await axios.get('/api/clusters');
      newStatus.clusters = 'healthy';
      newDetails.clusters = `Clusters system working. Found ${response.data.length} clusters.`;
    } catch (error) {
      newStatus.clusters = 'error';
      newDetails.clusters = `Clusters system error: ${error.message}`;
    }

    // Check Users System
    try {
      const response = await axios.get('/api/users');
      const users = response.data;
      const stateAdmins = users.filter(u => u.role === 'stateAdmin').length;
      const coordinators = users.filter(u => u.role === 'coordinator').length;
      const wardAdmins = users.filter(u => u.role === 'wardAdmin').length;
      
      newStatus.users = 'healthy';
      newDetails.users = `Users: ${stateAdmins} State Admins, ${coordinators} Coordinators, ${wardAdmins} Ward Admins`;
    } catch (error) {
      newStatus.users = 'error';
      newDetails.users = `Users system error: ${error.message}`;
    }

    // Check Wards System
    try {
      const response = await axios.get('/api/wards');
      const wards = response.data;
      const activeWards = wards.filter(w => w.isActive).length;
      const wardsWithAdmins = wards.filter(w => w.wardAdmin).length;
      
      newStatus.wards = 'healthy';
      newDetails.wards = `${wards.length} total wards, ${activeWards} active, ${wardsWithAdmins} with admins`;
    } catch (error) {
      newStatus.wards = 'error';
      newDetails.wards = `Wards system error: ${error.message}`;
    }

    setSystemStatus(newStatus);
    setDetails(newDetails);
    setIsLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
    }
  };

  const systemComponents = [
    { key: 'database', name: 'Database Connection', description: 'MongoDB connection and basic queries' },
    { key: 'users', name: 'User Management', description: 'User creation, authentication, and role management' },
    { key: 'wards', name: 'Ward Management', description: 'Ward creation and admin assignments' },
    { key: 'clusters', name: 'Cluster Management', description: 'Cluster creation and coordinator assignments' },
    { key: 'forms', name: 'Form System', description: 'Form creation, submission, and response handling' },
    { key: 'whatsapp', name: 'WhatsApp Integration', description: 'DXing API for password reset and notifications' }
  ];

  const overallStatus = Object.values(systemStatus).every(s => s === 'healthy') ? 'healthy' :
                       Object.values(systemStatus).some(s => s === 'error') ? 'error' : 'warning';

  return (
    <Layout>
      <Head>
        <title>System Status - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Status</h1>
            <p className="mt-1 text-sm text-gray-600">Monitor the health of all system components</p>
          </div>
          <Button onClick={checkSystemStatus} disabled={isLoading}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Checking...' : 'Refresh Status'}
          </Button>
        </div>

        {/* Overall Status */}
        <Card>
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {getStatusIcon(overallStatus)}
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Overall System Status: 
                  <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(overallStatus)}`}>
                    {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                  </span>
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Last checked: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Component Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {systemComponents.map((component) => (
            <Card key={component.key}>
              <div className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {getStatusIcon(systemStatus[component.key])}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">{component.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(systemStatus[component.key])}`}>
                        {systemStatus[component.key].charAt(0).toUpperCase() + systemStatus[component.key].slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{component.description}</p>
                    {details[component.key] && (
                      <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                        {details[component.key]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Feature Checklist */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Implemented Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">Core Features</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    User Management (State Admin, Coordinator, Ward Admin)
                  </li>
                  <li className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Ward Management with Admin Assignments
                  </li>
                  <li className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cluster Management under Wards
                  </li>
                  <li className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Dynamic Form Creation with Multiple Field Types
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">Advanced Features</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    WhatsApp Integration for Password Reset
                  </li>
                  <li className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    4-digit PIN System for Non-Admin Users
                  </li>
                  <li className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Self-Service Password Reset
                  </li>
                  <li className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Multi-select Form Fields
                  </li>
                  <li className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Detailed Excel Export with Analytics
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}