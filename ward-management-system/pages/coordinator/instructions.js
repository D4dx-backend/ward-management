import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';

export default function CoordinatorInstructions() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Instructions - Ward Management System</title>
      </Head>

      <div className="space-y-6 overflow-hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coordinator Instructions</h1>
          <p className="mt-1 text-sm text-gray-600">Guidelines and instructions for coordinators</p>
        </div>

        {/* Getting Started */}
        <Card>
          <div className="p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
            <div className="max-w-none overflow-hidden">
              <p className="text-gray-700 mb-4 break-words overflow-wrap-anywhere">
                Welcome to the Ward Management System! As a coordinator, you are responsible for managing wards 
                in your district and overseeing ward administrators.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Important:</strong> You can only manage wards within your assigned district: <strong>{session?.user?.district}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Ward Management */}
        <Card>
          <div className="p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ward Management</h2>
            <div className="space-y-4 overflow-hidden">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Creating New Wards</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 break-words">
                  <li className="break-words overflow-wrap-anywhere">Navigate to Manage Wards</li>
                  <li className="break-words overflow-wrap-anywhere">Click Create Ward button</li>
                  <li className="break-words overflow-wrap-anywhere">Fill required ward information</li>
                  <li className="break-words overflow-wrap-anywhere">Assign Ward Admin optionally</li>
                  <li className="break-words overflow-wrap-anywhere">Add population area details</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Assigning Ward Administrators</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 break-words">
                  <li className="break-words overflow-wrap-anywhere">One ward admin per ward</li>
                  <li className="break-words overflow-wrap-anywhere">Same district admins only</li>
                  <li className="break-words overflow-wrap-anywhere">Reassign admins anytime easily</li>
                  <li className="break-words overflow-wrap-anywhere">Admins submit ward reports</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Report Management */}
        <Card>
          <div className="p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Management</h2>
            <div className="space-y-4 overflow-hidden">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Submitting Coordinator Reports</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 break-words">
                  <li className="break-words overflow-wrap-anywhere">Submit weekly coordinator reports</li>
                  <li className="break-words overflow-wrap-anywhere">Navigate to Submit Report</li>
                  <li className="break-words overflow-wrap-anywhere">Select current week form</li>
                  <li className="break-words overflow-wrap-anywhere">Fill all required fields</li>
                  <li className="break-words overflow-wrap-anywhere">Review before final submission</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Monitoring Ward Reports</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 break-words">
                  <li className="break-words overflow-wrap-anywhere">View district ward reports</li>
                  <li className="break-words overflow-wrap-anywhere">Monitor submission status deadlines</li>
                  <li className="break-words overflow-wrap-anywhere">Follow up overdue reports</li>
                  <li className="break-words overflow-wrap-anywhere">Review reports for completeness</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* User Management */}
        <Card>
          <div className="p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Management</h2>
            <div className="space-y-4 overflow-hidden">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Managing Ward Administrators</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 break-words">
                  <li className="break-words overflow-wrap-anywhere">Create new admin accounts</li>
                  <li className="break-words overflow-wrap-anywhere">Assign admins to wards</li>
                  <li className="break-words overflow-wrap-anywhere">Monitor admin login activity</li>
                  <li className="break-words overflow-wrap-anywhere">Ensure proper ward access</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Best Practices */}
        <Card>
          <div className="p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Best Practices</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Regular Tasks</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 break-words">
                  <li className="break-words overflow-wrap-anywhere">Submit weekly reports timely</li>
                  <li className="break-words overflow-wrap-anywhere">Review ward reports regularly</li>
                  <li className="break-words overflow-wrap-anywhere">Monitor admin login activity</li>
                  <li className="break-words overflow-wrap-anywhere">Keep ward info updated</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Communication</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 break-words">
                  <li className="break-words overflow-wrap-anywhere">Maintain regular contact with ward admins</li>
                  <li className="break-words overflow-wrap-anywhere">Provide guidance on report submission</li>
                  <li className="break-words overflow-wrap-anywhere">Report issues to state administrators</li>
                  <li className="break-words overflow-wrap-anywhere">Keep contact information current</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <div className="p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Troubleshooting</h2>
            <div className="space-y-4 overflow-hidden">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Common Issues</h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg overflow-hidden">
                    <p className="font-medium text-gray-900 text-sm break-words">Cannot create ward</p>
                    <p className="text-gray-700 text-sm mt-1 break-words overflow-wrap-anywhere">
                      Ensure all required fields are filled and you have permission to create wards in your district.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg overflow-hidden">
                    <p className="font-medium text-gray-900 text-sm break-words">Cannot submit report</p>
                    <p className="text-gray-700 text-sm mt-1 break-words overflow-wrap-anywhere">
                      Check that the form is still active and within the submission period. Ensure all required fields are completed.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg overflow-hidden">
                    <p className="font-medium text-gray-900 text-sm break-words">Ward admin cannot access ward</p>
                    <p className="text-gray-700 text-sm mt-1 break-words overflow-wrap-anywhere">
                      Verify that the ward admin is properly assigned to the ward and has the correct role permissions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card>
          <div className="p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 overflow-hidden">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700 break-words overflow-wrap-anywhere">
                    If you encounter any issues or need assistance, please contact your state administrator 
                    or system support team. Include details about the problem and any error messages you received.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}