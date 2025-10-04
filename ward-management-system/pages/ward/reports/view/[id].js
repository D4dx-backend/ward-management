import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '../../../../components/Layout';
import WardReportDetailView from '../../../../components/WardReportDetailView';

export default function ViewWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated' && session?.user?.role !== 'wardAdmin') {
      console.error('Access denied: User role is', session?.user?.role, 'but wardAdmin is required');
      router.push('/ward');
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role]);

  // Show loading while checking authentication or if no ID
  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  // If not authenticated, don't render anything (redirect will happen)
  if (status === 'unauthenticated') {
    return null;
  }

  // If wrong role, don't render anything (redirect will happen)
  if (session?.user?.role !== 'wardAdmin') {
    return null;
  }

  // If no ID yet, show loading
  if (!id) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading report...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <WardReportDetailView 
        reportId={id} 
        role="wardAdmin"
        showEditButton={true}
      />
    </Layout>
  );
}