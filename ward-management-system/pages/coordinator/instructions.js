import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CoordinatorInstructionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/instructions');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
    </div>
  );
}