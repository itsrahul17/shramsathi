// Utility to check current storage mode and data location
export const checkStorageMode = async () => {
  console.log('📊 STORAGE MODE CHECK');
  console.log('==================');
  
  // Check if Firebase-first mode is enabled
  const firebaseFirst = localStorage.getItem('shramsathi_firebase_first') === 'true';
  console.log('🔥 Firebase-first mode:', firebaseFirst ? 'ENABLED' : 'DISABLED');
  
  // Test Firebase connection
  try {
    const { testFirebaseConnection } = await import('@/lib/database');
    const result = await testFirebaseConnection();
    console.log('🔌 Firebase connection:', result.connected ? 'CONNECTED' : 'DISCONNECTED');
    if (!result.connected) {
      console.log('❌ Firebase error:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing Firebase:', error);
  }
  
  // Check localStorage data
  const localKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('shramsathi_temp_')) {
      localKeys.push(key);
    }
  }
  
  console.log('💾 localStorage data:', localKeys.length, 'items');
  
  // Categorize the data
  const userKeys = localKeys.filter(key => key.includes('user_'));
  const relationKeys = localKeys.filter(key => key.includes('relation_'));
  const attendanceKeys = localKeys.filter(key => key.includes('attendance_'));
  
  console.log('👤 Users in localStorage:', userKeys.length);
  console.log('🔗 Relations in localStorage:', relationKeys.length);
  console.log('📅 Attendance records in localStorage:', attendanceKeys.length);
  
  // Check current user
  const authUser = localStorage.getItem('shramsathi_user');
  if (authUser) {
    try {
      const user = JSON.parse(authUser);
      console.log('🔐 Current logged in user:', {
        id: user.id,
        name: user.name,
        role: user.role,
        mobile: user.mobile,
        isLocal: user.id.startsWith('local_') || user.id.startsWith('user_'),
        isFirebase: !user.id.startsWith('local_') && !user.id.startsWith('user_')
      });
    } catch (error) {
      console.error('❌ Error parsing auth user:', error);
    }
  }
  
  // Summary
  console.log('');
  console.log('📋 SUMMARY:');
  if (firebaseFirst) {
    console.log('✅ You are in Firebase-first mode');
    console.log('✅ New accounts will be created in Firebase');
    console.log('✅ Data is synced to localStorage as backup');
  } else {
    console.log('⚠️  You are in mixed mode (localStorage + Firebase)');
    console.log('⚠️  Some data might be local-only');
  }
  
  return {
    firebaseFirst,
    localStorageItems: localKeys.length,
    users: userKeys.length,
    relations: relationKeys.length,
    attendance: attendanceKeys.length
  };
};

export const checkDataLocation = () => {
  console.log('🔍 DATA LOCATION CHECK');
  console.log('====================');
  
  // Get current user
  const authUser = localStorage.getItem('shramsathi_user');
  if (!authUser) {
    console.log('❌ No user logged in');
    return;
  }
  
  const user = JSON.parse(authUser);
  const userId = user.id;
  
  console.log('👤 Current user ID:', userId);
  
  // Determine storage type based on ID pattern
  if (userId.startsWith('local_')) {
    console.log('💾 User type: LOCAL ONLY');
    console.log('⚠️  This user exists only in localStorage');
  } else if (userId.startsWith('user_')) {
    console.log('🔄 User type: MIXED (created locally, may be in Firebase)');
    console.log('⚠️  This user was created with mixed mode');
  } else {
    console.log('🔥 User type: FIREBASE');
    console.log('✅ This user was created in Firebase');
  }
  
  // Check localStorage backup
  const localUserData = localStorage.getItem(`shramsathi_temp_user_${userId}`);
  console.log('💾 localStorage backup:', localUserData ? 'EXISTS' : 'NOT FOUND');
  
  // For contractors, check workers
  if (user.role === 'contractor') {
    const relationKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`relation_${userId}_`)) {
        relationKeys.push(key);
      }
    }
    console.log('👥 Connected workers:', relationKeys.length);
  }
  
  // For workers, check contractor connection
  if (user.role === 'worker' && user.contractorCode) {
    console.log('🔗 Connected to contractor:', user.contractorCode);
  }
};

// Make functions available globally
if (typeof window !== 'undefined') {
  (window as any).checkStorageMode = checkStorageMode;
  (window as any).checkDataLocation = checkDataLocation;
  
  console.log('🔧 Storage check functions available:');
  console.log('- window.checkStorageMode() - Check current storage configuration');
  console.log('- window.checkDataLocation() - Check where your current data is stored');
}