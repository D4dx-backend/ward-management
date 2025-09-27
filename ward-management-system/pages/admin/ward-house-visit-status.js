import Layout from '../../components/Layout';
import AdminWardClusterVisitStatus from '../../components/AdminWardClusterVisitStatus';
import Head from 'next/head';

export default function WardHouseVisitStatusPage() {
  return (
    <Layout>
      <Head>
        <title>Ward House Visit Status</title>
      </Head>
      <h1 className="text-2xl font-bold mb-4">Ward House Visit Status</h1>
      <AdminWardClusterVisitStatus />
    </Layout>
  );
}
