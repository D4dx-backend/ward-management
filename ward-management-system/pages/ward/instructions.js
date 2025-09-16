import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useApiData } from '../../hooks/useApiData';
import Layout from '../../components/Layout';

export default function WardInstructionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/instructions');
  }, [router]);

  return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
}