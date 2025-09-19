'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthPage from '@/components/auth/AuthPage';
import WorkerDashboard from '@/components/worker/WorkerDashboard';
import ContractorDashboard from '@/components/contractor/ContractorDashboard';
import { testFirebaseConnection, testDatabaseOperations } from '@/lib/firebase-test';

export default function Home() {
  const { user, isLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      setShowAuth(true);
    }
  }, [user, isLoading]);

  useEffect(() => {
    // Test Firebase connection and database operations when app loads
    const runTests = async () => {
      console.log('\n=== FIREBASE INTEGRATION TESTS ===');
      
      const connectionSuccess = await testFirebaseConnection();
      console.log('\n🔥 Firebase connection test result:', connectionSuccess);
      
      if (connectionSuccess) {
        const dbSuccess = await testDatabaseOperations();
        console.log('\n💾 Database operations test result:', dbSuccess);
      }
      
      console.log('\n=== TESTS COMPLETED ===\n');
    };
    
    runTests();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">ShramSathi</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showAuth || !user) {
    return <AuthPage onSuccess={() => setShowAuth(false)} />;
  }

  // Route based on user role
  if (user.role === 'worker') {
    return <WorkerDashboard />;
  }

  if (user.role === 'contractor') {
    return <ContractorDashboard />;
  }

  return null;
}
