import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function FormResponses() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to forms list for now
    router.push('/admin/forms');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
    </div>
  );
}