import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import DynamicFormBuilder from '../../components/DynamicFormBuilder';
import DynamicFormRenderer from '../../components/DynamicFormRenderer';
import DeleteModal from '../../components/DeleteModal';

export default function WardBasicForms() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewForm, setPreviewForm] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    formId: null,
    formTitle: '',
    isDeleting: false
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchForms();
    }
  }, [status, session, router]);

  const fetchForms = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/ward-basic-forms?includeInactive=true');
      setForms(response.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch forms');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };





  const handlePreview = (form) => {
    setPreviewForm(form);
    setShowPreviewModal(true);
  };

  const openDeleteModal = (form) => {
    setDeleteModal({
      isOpen: true,
      formId: form._id,
      formTitle: form.title,
      isDeleting: false
    });
  };

  const closeDeleteModal = () => {
    if (!deleteModal.isDeleting) {
      setDeleteModal({
        isOpen: false,
        formId: null,
        formTitle: '',
        isDeleting: false
      });
    }
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      await axios.delete(`/api/ward-basic-forms/${deleteModal.formId}`);
      setForms(forms.filter(form => form._id !== deleteModal.formId));
      closeDeleteModal();
    } catch (error) {
      setError('Failed to delete form');
      console.error(error);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };



  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Ward Advance Data - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Advance Data</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage the form for collecting ward advance information
            </p>
          </div>
          {forms.length === 0 && (
            <Button onClick={() => router.push('/admin/ward-basic-forms/create')}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Form
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {forms.length === 0 ? (
          <Card>
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No Ward Advance Data Form</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create the form to collect advance information from wards.
              </p>
              <div className="mt-6">
                <Button onClick={() => router.push('/admin/ward-basic-forms/create')}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Ward Advance Data Form
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-6">
              {forms.map((form) => (
                <div key={form._id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-xl font-semibold text-gray-900">{form.title}</h2>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                        <span className="text-sm text-gray-500">v{form.version}</span>
                      </div>
                      {form.description && (
                        <p className="text-gray-600 mb-4">{form.description}</p>
                      )}
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {form.fields.length} fields
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Created by {form.createdBy?.name}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm0 0v4a2 2 0 002 2h6a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
                          </svg>
                          {new Date(form.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => handlePreview(form)}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                      </Button>
                      <Button
                        onClick={() => router.push(`/admin/ward-basic-forms/edit/${form._id}`)}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Form
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => openDeleteModal(form)}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}



        {/* Preview Modal */}
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title={`Preview: ${previewForm?.title}`}
          size="lg"
        >
          {previewForm && (
            <div className="space-y-4">
              {previewForm.description && (
                <p className="text-gray-600">{previewForm.description}</p>
              )}
              <div className="border-t border-gray-200 pt-4">
                <DynamicFormRenderer
                  fields={previewForm.fields}
                  data={{}}
                  disabled={true}
                />
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Modal */}
        <DeleteModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          title="Delete Form"
          message="Are you sure you want to delete this form? This action cannot be undone and will remove all associated data."
          itemName={deleteModal.formTitle}
          confirmText="Delete Form"
          isLoading={deleteModal.isDeleting}
        />
      </div>
    </Layout>
  );
}