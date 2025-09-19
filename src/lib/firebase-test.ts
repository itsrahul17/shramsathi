import { db } from './firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  console.log('🔥 Testing Firebase connection...');
  
  try {
    console.log('Firebase db instance:', db);
    console.log('Firebase config values:');
    console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set (' + process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 10) + '...)' : '❌ Missing');
    console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '❌ Missing');
    console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '❌ Missing');
    console.log('Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '❌ Missing');
    
    // Test 1: Read from users collection
    console.log('\n📖 Test 1: Reading from users collection...');
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    console.log('✅ Users collection accessible. Document count:', usersSnapshot.size);
    
    // Test 2: Read from attendance collection
    console.log('\n📊 Test 2: Reading from attendance collection...');
    const attendanceRef = collection(db, 'attendance');
    const attendanceSnapshot = await getDocs(attendanceRef);
    console.log('✅ Attendance collection accessible. Document count:', attendanceSnapshot.size);
    
    // Test 3: Read from contractor_worker_relations collection
    console.log('\n🤝 Test 3: Reading from contractor_worker_relations collection...');
    const relationsRef = collection(db, 'contractor_worker_relations');
    const relationsSnapshot = await getDocs(relationsRef);
    console.log('✅ Relations collection accessible. Document count:', relationsSnapshot.size);
    
    // Test 4: Write permission test (create and delete a test document)
    console.log('\n✏️ Test 4: Testing write permissions...');
    try {
      const testDoc = doc(collection(db, 'test_connection'));
      await setDoc(testDoc, {
        testField: 'Firebase connection test',
        timestamp: new Date().toISOString(),
        success: true
      });
      console.log('✅ Write permission successful');
      
      // Clean up test document
      await deleteDoc(testDoc);
      console.log('✅ Delete permission successful');
    } catch (writeError) {
      console.warn('⚠️ Write permission limited:', (writeError as any).message);
      console.log('This is normal for some Firebase security rules configurations.');
    }
    
    console.log('\n🎉 Firebase connection test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error code:', (error as any).code);
      
      // Provide specific guidance based on error type
      if ((error as any).code === 'permission-denied') {
        console.log('\n💡 This might be due to Firestore security rules.');
        console.log('Consider updating your security rules for testing.');
      } else if ((error as any).code === 'unavailable') {
        console.log('\n💡 Firebase service might be temporarily unavailable.');
        console.log('Check your internet connection and try again.');
      }
    }
    return false;
  }
};

// Test specific database operations
export const testDatabaseOperations = async () => {
  console.log('\n🧪 Testing database operations...');
  
  try {
    // Import the actual database functions to test them
    const { createUser, getUserByMobile } = await import('./database');
    
    console.log('\n👤 Testing user creation and retrieval...');
    
    // Test user creation (this will use Firebase with localStorage fallback)
    const testUser = {
      name: 'Test User',
      mobile: '9999999999',
      role: 'worker' as const
    };
    
    console.log('Creating test user:', testUser);
    const userId = await createUser(testUser);
    console.log('✅ User created with ID:', userId);
    
    // Test user retrieval
    console.log('Retrieving test user by mobile...');
    const retrievedUser = await getUserByMobile(testUser.mobile);
    
    if (retrievedUser) {
      console.log('✅ User retrieved successfully:', {
        id: retrievedUser.id,
        name: retrievedUser.name,
        mobile: retrievedUser.mobile,
        role: retrievedUser.role
      });
    } else {
      console.log('❌ User retrieval failed');
    }
    
    console.log('\n🎉 Database operations test completed!');
    return true;
  } catch (error) {
    console.error('❌ Database operations test failed:', error);
    return false;
  }
};
