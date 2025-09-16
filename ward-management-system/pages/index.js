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
    if (session.user.role === 'coordinator') {
      router.push('/coordinator');
    } else if (session.user.role === 'wardAdmin') {
      router.push('/ward');
    } else if (session.user.role === 'stateAdmin') {
      router.push('/admin');
    } else {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

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