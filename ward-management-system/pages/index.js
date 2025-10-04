import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useApiData } from '../hooks/useApiData';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Redirect to role-specific dashboards
    const role = session?.user?.role;
    if (role === 'coordinator') {
      router.push('/coordinator');
    } else if (role === 'wardAdmin') {
      router.push('/ward');
    } else if (role === 'stateAdmin') {
      router.push('/admin');
    } else {
      router.push('/auth/signin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]); // Remove router from dependencies to prevent loops

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return null; // This will redirect before rendering
}