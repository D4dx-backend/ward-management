import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../components/Shimmer';
import { useApiData } from '../../../hooks/useApiData';

export default function CoordinatorReports() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    formType: 'coordinatorReport',
    weekNumber: '',
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchReports();
    }
  }, [status, session, router, filter]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams();
      queryParams.append('formType', filter.formType);
      if (filter.weekNumber) queryParams.append('weekNumber', filter.weekNumber);
      if (filter.year) queryParams.append('year', filter.year);
      
      const response = await fetch(`/api/reports?${queryParams.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setReports(data.reports);
      } else {
        setError(data.message || 'Failed to fetch reports');
      }
    } catch (error) {
      setError('Network error while fetching reports');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout title="Coordinator Reports">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Coordinator Reports</h1>
          <Button onClick={() => router.push('/coordinator/reports/new')}>
            Submit New Report
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <Card className="bg-red-50 text-red-700">
            <p>{error}</p>
          </Card>
        ) : reports.length === 0 ? (
          <Card>
            <p>No reports found. <a href="/coordinator/reports/new" className="text-blue-600 hover:underline">Submit your first report</a></p>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report._id}>
                <h2 className="text-lg font-semibold">{report.title}</h2>
                <p className="text-gray-600">{report.description}</p>
                <p className="text-sm text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}