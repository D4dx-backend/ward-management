import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import ClusterDataCollector from '../../components/ClusterDataCollector';
import RecurringQuestionRenderer from '../../components/RecurringQuestionRenderer';
import { useApiData } from '../../hooks/useApiData';

export default function EnhancedWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userWards, setUserWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [recurringQuestions, setRecurringQuestions] = useState([]);
  const [clusterQuestions, setClusterQuestions] = useState([]);
  const [importedQuestions, setImportedQuestions] = useState([]);
  const [formData, setFormData] = useState({});
  const [clusterData, setClusterData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentWeek, setCurrentWeek] = useState(null);
  const [currentYear, setCurrentYear] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get current week and year
      const now = new Date();
      const weekNumber = getWeekNumber(now);
      const year = now.getFullYear();
      setCurrentWeek(weekNumber);
      setCurrentYear(year);
      
      // Get user's wards
      const wardsResponse = await axios.get('/api/wards');
      setUserWards(wardsResponse.data);
      
      // Get recurring questions applicable to ward reports
      const questionsResponse = await axios.get('/api/recurring-questions', {
        params: {
          formType: 'wardReport',
          isActive: true
        }
      });
      
      // Separate regular questions from cluster-applicable questions
      const allQuestions = questionsResponse.data;
      const regularQuestions = allQuestions.filter(q => !q.applicableToClusters);
      const clusterApplicableQuestions = allQuestions.filter(q => q.applicableToClusters);
      
      setRecurringQuestions(regularQuestions);
      setClusterQuestions(clusterApplicableQuestions);
      
      setError('');
    } catch (error) {
      setError('Failed to fetch data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const handleImportQuestions = () => {
    // Import next 3 questions from recurring questions
    const availableQuestions = recurringQuestions.filter(q => 
      !importedQuestions.find(imported => imported._id === q._id)
    );
    
    const questionsToImport = availableQuestions.slice(0, 3);
    setImportedQuestions([...importedQuestions, ...questionsToImport]);
  };

  const handleQuestionComplete = (questionId, answer) => {
    setFormData({
      ...formData,
      [questionId]: answer
    });
  };

  const handleClusterDataChange = (data) => {
    setClusterData(data);
  };

  const handleSubmit = async () => {
    if (!selectedWard) {
      setError('Please select a ward');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const submissionData = {
        wardId: selectedWard,
        formType: 'wardReport',
        weekNumber: currentWeek,
        year: currentYear,
        regularAnswers: formData,
        clusterData: clusterData,
        submittedAt: new Date()
      };

      // Here you would typically submit to your API
      console.log('Submitting data:', submissionData);
      
      setSuccess('Enhanced ward report submitted successfully!');
      
    } catch (error) {
      setError('Failed to submit report');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || isLoading) {
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
      <Head>
        <title>Enhanced Ward Report - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enhanced Ward Report</h1>
          <p className="mt-1 text-sm text-gray-600">
            Submit your weekly ward report with recurring questions and cluster data collection
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Ward Selection */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Select Ward</h2>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a ward...</option>
              {userWards.map((ward) => (
                <option key={ward._id} value={ward._id}>
                  {ward.name} - {ward.district}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {selectedWard && (
          <>
            {/* Regular Recurring Questions */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Recurring Questions</h2>
                  <Button
                    onClick={handleImportQuestions}
                    variant="outline"
                    size="sm"
                    disabled={recurringQuestions.length === 0}
                  >
                    Import Next 3 Questions
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {importedQuestions.map((question) => (
                    <RecurringQuestionRenderer
                      key={question._id}
                      question={question}
                      formType="wardReport"
                      weekNumber={currentWeek}
                      year={currentYear}
                      wardId={selectedWard}
                      onComplete={handleQuestionComplete}
                    />
                  ))}
                  
                  {importedQuestions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>Click "Import Next 3 Questions" to add questions to this form.</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Cluster Data Collection */}
            {clusterQuestions.length > 0 && (
              <Card>
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Cluster Data Collection</h2>
                  <ClusterDataCollector
                    wardId={selectedWard}
                    questions={[]}
                    recurringQuestions={clusterQuestions}
                    formType="wardReport"
                    weekNumber={currentWeek}
                    year={currentYear}
                    onDataChange={handleClusterDataChange}
                  />
                </div>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || importedQuestions.length === 0}
                size="lg"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Enhanced Report'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}