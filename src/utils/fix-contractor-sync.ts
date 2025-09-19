// Utility to fix contractor data sync issues
export const fixContractorSync = () => {
  console.log('🔧 Fixing contractor sync...');
  
  // Get current auth user
  const authUser = localStorage.getItem('shramsathi_user');
  if (!authUser) {
    console.log('❌ No auth user found');
    return;
  }
  
  try {
    const user = JSON.parse(authUser);
    console.log('👤 Current auth user:', user);
    
    if (user.role !== 'contractor') {
      console.log('❌ Current user is not a contractor');
      return;
    }
    
    // Check localStorage data for this user
    const localUserKey = `shramsathi_temp_user_${user.id}`;
    const localUserData = localStorage.getItem(localUserKey);
    
    if (localUserData) {
      const localUser = JSON.parse(localUserData);
      console.log('💾 Local user data:', localUser);
      
      if (localUser.contractorId && (!user.contractorId || user.contractorId === 'NOT SET')) {
        console.log('🔄 Syncing contractor ID from local to auth...');
        user.contractorId = localUser.contractorId;
        localStorage.setItem('shramsathi_user', JSON.stringify(user));
        console.log('✅ Contractor ID synced:', localUser.contractorId);
        
        // Reload the page to reflect changes
        setTimeout(() => {
          console.log('🔄 Reloading page...');
          window.location.reload();
        }, 1000);
      } else {
        console.log('⚠️ No sync needed or contractor ID already set');
      }
    } else {
      console.log('❌ No local user data found');
    }
  } catch (error) {
    console.error('❌ Error fixing contractor sync:', error);
  }
};

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).fixContractorSync = fixContractorSync;
  console.log('🔧 Fix function available: window.fixContractorSync()');
}