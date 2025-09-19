// Debug utility for contractor-worker connection
export const debugContractorConnection = () => {
  console.log('🔍 DEBUG: Contractor-Worker Connection Status');
  
  // Check current user in auth context
  const authUser = localStorage.getItem('shramsathi_user');
  if (authUser) {
    try {
      const user = JSON.parse(authUser);
      console.log('👤 Current user:', {
        id: user.id,
        name: user.name,
        role: user.role,
        contractorCode: user.contractorCode || 'NOT SET'
      });
    } catch (error) {
      console.error('❌ Error parsing auth user:', error);
    }
  }
  
  // Check localStorage data
  console.log('💾 localStorage data:');
  const localStorageKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('shramsathi_temp_')) {
      localStorageKeys.push(key);
    }
  }
  
  console.log('📁 Found keys:', localStorageKeys);
  
  // Check relations
  const relationKeys = localStorageKeys.filter(key => key.includes('relation_'));
  console.log('🔗 Relation keys:', relationKeys);
  
  relationKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const relation = JSON.parse(data);
        console.log('🤝 Relation:', relation);
      } catch (error) {
        console.error('❌ Error parsing relation:', error);
      }
    }
  });
  
  // Check all users in localStorage
  const userKeys = localStorageKeys.filter(key => key.includes('user_'));
  console.log('👥 User keys found:', userKeys.length);
  
  userKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const user = JSON.parse(data);
        if (user.role === 'contractor') {
          console.log('👷 Contractor found:', {
            id: user.id,
            name: user.name,
            contractorId: user.contractorId || 'NOT SET'
          });
        }
      } catch (error) {
        console.error('❌ Error parsing user:', error);
      }
    }
  });
};

// Auto-run debug on module load
if (typeof window !== 'undefined') {
  (window as any).debugContractorConnection = debugContractorConnection;
  console.log('🔧 Debug function available: window.debugContractorConnection()');
}