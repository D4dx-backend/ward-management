import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import MenuAdmin from '../../components/MenuAdmin';
import { useApiData } from '../../hooks/useApiData';

export default function MenuAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'stateAdmin') {
      router.push('/');
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!session || session.user.role !== 'stateAdmin') {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Administration</h1>
            <p className="text-gray-600">Manage navigation menus and categories for all user roles</p>
          </div>
        </div>

        <MenuAdmin />
      </div>
    </Layout>
  );
}