import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '../../../../components/Layout';
import WardReportDetailView from '../../../../components/WardReportDetailView';

export default function ViewReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading' || !id) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <WardReportDetailView 
        reportId={id} 
        role="stateAdmin"
        showEditButton={false}
      />
    </Layout>
  );
}