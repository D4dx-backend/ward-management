import ClusterQuestionExample from '../components/ClusterQuestionExample';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../components/Shimmer';
import { useApiData } from '../hooks/useApiData';

export default function TestClusterQuestions() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ClusterQuestionExample />
    </div>
  );
}