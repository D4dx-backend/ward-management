import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import FormSubmissionsList from '../../components/FormSubmissionsList';
export default function CoordinatorFormSubmissions() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'coordinator') {
    return null;
  }

  return (
    <Layout>
      <Head>
        <title>Form Submissions - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Form Submissions</h1>
            <p className="mt-1 text-sm text-gray-600">
              View and manage all form submissions from your wards
            </p>
          </div>
        </div>

        <FormSubmissionsList />
      </div>
    </Layout>
  );
}