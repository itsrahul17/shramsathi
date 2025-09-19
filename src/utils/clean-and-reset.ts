// Clean storage and reset to Firebase-first approach
export const cleanAllData = () => {
  console.log('🧹 CLEANING ALL DATA...');
  
  // Get all localStorage keys
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      allKeys.push(key);
    }
  }
  
  // Count shramsathi data
  const shramsathiKeys = allKeys.filter(key => 
    key.startsWith('shramsathi_temp_') || 
    key.startsWith('shramsathi_user') ||
    key === 'shramsathi_user'
  );
  
  console.log('📊 Found data to clean:');
  console.log('- Total localStorage keys:', allKeys.length);
  console.log('- Shramsathi keys:', shramsathiKeys.length);
  
  // Show what we're about to delete
  shramsathiKeys.forEach(key => {
    console.log(`🗑️ Will remove: ${key}`);
  });
  
  // Confirm before deleting
  const confirm = window.confirm(
    `This will remove ${shramsathiKeys.length} localStorage items for Shramsathi.\n\n` +
    'This includes:\n' +
    '- All user accounts\n' +
    '- All attendance records\n' +
    '- All contractor-worker relations\n' +
    '- Current login session\n\n' +
    'You will need to create new accounts after this.\n\n' +
    'Continue?'
  );
  
  if (!confirm) {
    console.log('❌ Cleanup cancelled by user');
    return false;
  }
  
  // Delete all shramsathi data
  shramsathiKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ Removed: ${key}`);
  });
  
  console.log('🎉 Cleanup completed!');
  console.log('📄 Page will reload in 3 seconds...');
  
  // Reload page after cleanup
  setTimeout(() => {
    window.location.reload();
  }, 3000);
  
  return true;
};

export const enableFirebaseFirst = () => {
  console.log('🔥 Enabling Firebase-first mode...');
  
  // Set a flag to prefer Firebase over localStorage
  localStorage.setItem('shramsathi_firebase_first', 'true');
  console.log('✅ Firebase-first mode enabled');
  
  console.log('📋 New behavior:');
  console.log('- All new accounts will be created in Firebase');
  console.log('- Data will sync to localStorage as backup');
  console.log('- Relations will be stored in Firebase');
  console.log('- Authentication will check Firebase first');
  
  return true;
};

export const checkFirebaseConnection = async () => {
  console.log('🔌 Checking Firebase connection...');
  
  try {
    // Import Firebase utilities
    const { testFirebaseConnection } = await import('@/lib/database');
    const result = await testFirebaseConnection();
    
    if (result.connected) {
      console.log('✅ Firebase connection successful');
      console.log('🔥 Firebase is ready for clean setup');
      return true;
    } else {
      console.log('❌ Firebase connection failed:', result.error);
      console.log('⚠️ You may need to check your Firebase configuration');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing Firebase:', error);
    return false;
  }
};

export const fullReset = async () => {
  console.log('🚀 FULL RESET: Clean data + Firebase-first setup');
  
  // Step 1: Check Firebase
  const firebaseReady = await checkFirebaseConnection();
  if (!firebaseReady) {
    console.log('⚠️ Firebase is not ready. Please fix Firebase connection first.');
    return false;
  }
  
  // Step 2: Clean all data
  const cleaned = cleanAllData();
  if (!cleaned) {
    console.log('❌ Cleanup cancelled');
    return false;
  }
  
  // Step 3: Enable Firebase-first mode
  enableFirebaseFirst();
  
  console.log('🎉 Full reset completed!');
  console.log('📋 Next steps:');
  console.log('1. Page will reload automatically');
  console.log('2. Create new contractor account');
  console.log('3. Create new worker account');
  console.log('4. Connect worker to contractor');
  console.log('5. Everything will be stored in Firebase!');
  
  return true;
};

// Make functions available globally
if (typeof window !== 'undefined') {
  (window as any).cleanAllData = cleanAllData;
  (window as any).enableFirebaseFirst = enableFirebaseFirst;
  (window as any).checkFirebaseConnection = checkFirebaseConnection;
  (window as any).fullReset = fullReset;
  
  console.log('🔧 Reset functions available:');
  console.log('- window.cleanAllData() - Remove all local data');
  console.log('- window.enableFirebaseFirst() - Enable Firebase-first mode');  
  console.log('- window.checkFirebaseConnection() - Test Firebase');
  console.log('- window.fullReset() - Do everything at once');
}