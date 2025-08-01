import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';
import Layout from '../../components/Layout';

export default function WardInstructionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/instructions');
  }, [router]);

  return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
}