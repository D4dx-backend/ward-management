import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ClusterTableManager from '../../components/ClusterTableManager';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function CoordinatorClusters() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'coordinator') {
      router.push('/');
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  if (loading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Cluster Management</h1>
            <ClusterTableManager userRole="coordinator" />
          </div>
        </div>
      </div>
    </Layout>
  );
}