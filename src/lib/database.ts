import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  addDoc,
  updateDoc,
  Timestamp,
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from './firebase';
import { User, AttendanceRecord, ContractorWorkerRelation, AttendanceType } from '@/types';

// Offline sync queue
let syncQueue: any[] = [];
let syncInProgress = false;

// Add item to sync queue
const addToSyncQueue = (operation: string, data: any) => {
  console.log('📋 Adding to sync queue:', operation, data);
  syncQueue.push({ operation, data, timestamp: Date.now() });
  setTempData('sync_queue', syncQueue);
  
  // Try to sync immediately if Firebase is available
  if (!syncInProgress) {
    setTimeout(() => processSyncQueue(), 1000);
  }
};

// Process sync queue (simplified to avoid circular dependencies)
const processSyncQueue = async () => {
  if (syncInProgress || syncQueue.length === 0) return;
  
  console.log('🔄 Processing sync queue...');
  syncInProgress = true;
  
  try {
    // Simple Firebase availability test
    const testRef = doc(db, 'test_connection', 'sync_test');
    await setDoc(testRef, { test: true }, { merge: true });
    
    const itemsToSync = [...syncQueue];
    let syncedCount = 0;
    
    for (const item of itemsToSync) {
      try {
        // Process different types of sync operations
        if (item.operation === 'saveAttendance') {
          // Re-attempt Firebase save for attendance
          console.log('🔄 Syncing attendance:', item.data);
          // Implementation would go here based on the specific data structure
        }
        
        syncedCount++;
        // Remove synced item from queue
        syncQueue = syncQueue.filter(q => q.timestamp !== item.timestamp);
      } catch (error) {
        console.error('❌ Sync failed for item:', item, error);
      }
    }
    
    if (syncedCount > 0) {
      console.log(`✅ Synced ${syncedCount} items to Firebase`);
      setTempData('sync_queue', syncQueue);
    }
  } catch (error) {
    console.log('⚠️ Firebase not available for sync, postponing...');
  } finally {
    syncInProgress = false;
  }
};


// Firebase connection testing
export const testFirebaseConnection = async (): Promise<{connected: boolean, error?: string}> => {
  try {
    console.log('Testing Firebase connection...');
    const testRef = doc(db, 'test_connection', 'test_doc');
    await setDoc(testRef, {
      timestamp: Timestamp.now(),
      test: true
    }, { merge: true });
    
    const testDoc = await getDoc(testRef);
    if (testDoc.exists()) {
      console.log('✅ Firebase connection successful!');
      return { connected: true };
    } else {
      console.log('⚠️ Firebase connection test failed - document not found');
      return { connected: false, error: 'Test document not found' };
    }
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    if (error instanceof Error) {
      return { connected: false, error: error.message };
    }
    return { connected: false, error: 'Unknown connection error' };
  }
};

// Temporary localStorage-based database for MVP testing
const TEMP_DB_PREFIX = 'shramsathi_temp_';

// Helper functions for localStorage database
const getTempData = (key: string) => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(TEMP_DB_PREFIX + key);
  return data ? JSON.parse(data) : null;
};

const setTempData = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEMP_DB_PREFIX + key, JSON.stringify(data));
};

const getAllTempData = (prefix: string) => {
  if (typeof window === 'undefined') return [];
  const items = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(TEMP_DB_PREFIX + prefix)) {
      const data = localStorage.getItem(key);
      if (data) items.push(JSON.parse(data));
    }
  }
  return items;
};

// Initialize sync queue from localStorage (after helper functions are defined)
const initializeSyncQueue = () => {
  if (typeof window !== 'undefined') {
    syncQueue = getTempData('sync_queue') || [];
    if (syncQueue.length > 0) {
      console.log('📋 Found', syncQueue.length, 'items in sync queue');
      setTimeout(() => processSyncQueue(), 2000);
    }
  }
};

// Initialize sync queue when module loads
initializeSyncQueue();

// Collections
const USERS_COLLECTION = 'users';
const ATTENDANCE_COLLECTION = 'attendance';
const RELATIONS_COLLECTION = 'contractor_worker_relations';

// Generate contractor code
export const generateContractorCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Fix existing contractor account without contractorId
export const ensureContractorCode = async (userId: string): Promise<string> => {
  try {
    console.log('🔧 Ensuring contractor code for user:', userId);
    
    // First check if user already has contractorId in localStorage
    const localUser = getTempData(`user_${userId}`);
    if (localUser && localUser.contractorId) {
      console.log('✅ Contractor code already exists locally:', localUser.contractorId);
      return localUser.contractorId;
    }
    
    // Generate new contractor code
    const newContractorCode = generateContractorCode();
    console.log('🆔 Generated new contractor code:', newContractorCode);
    
    // Test Firebase connection
    const connectionTest = await testFirebaseConnection();
    
    if (connectionTest.connected) {
      try {
        // Update in Firebase
        console.log('🔥 Updating contractor code in Firebase...');
        await updateDoc(doc(db, USERS_COLLECTION, userId), {
          contractorId: newContractorCode
        });
        console.log('✅ Successfully updated in Firebase');
      } catch (firebaseError) {
        console.error('❌ Firebase update failed:', firebaseError);
      }
    } else {
      console.warn('⚠️ Firebase not available, updating locally only');
    }
    
    // Always update in localStorage
    if (localUser) {
      localUser.contractorId = newContractorCode;
      setTempData(`user_${userId}`, localUser);
      console.log('💾 Updated contractor code in localStorage');
    }
    
    // Also update the auth context localStorage
    const authUser = localStorage.getItem('shramsathi_user');
    if (authUser) {
      try {
        const parsedAuthUser = JSON.parse(authUser);
        if (parsedAuthUser.id === userId) {
          parsedAuthUser.contractorId = newContractorCode;
          localStorage.setItem('shramsathi_user', JSON.stringify(parsedAuthUser));
          console.log('🔄 Updated auth context with contractor code');
        }
      } catch (error) {
        console.error('Error updating auth context:', error);
      }
    }
    
    return newContractorCode;
  } catch (error) {
    console.error('❌ Error ensuring contractor code:', error);
    throw error;
  }
};

// User operations
export const createUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<string> => {
  console.log('👤 Creating user:', userData);
  
  // Check if Firebase-first mode is enabled
  const firebaseFirst = localStorage.getItem('shramsathi_firebase_first') === 'true';
  console.log(firebaseFirst ? '🔥 Firebase-first mode enabled' : '💾 Using mixed mode');
  
  // Test Firebase connection first
  const connectionTest = await testFirebaseConnection();
  if (!connectionTest.connected) {
    if (firebaseFirst) {
      console.error('❌ Firebase-first mode enabled but Firebase not available:', connectionTest.error);
      throw new Error('Firebase connection required in Firebase-first mode. Please check your connection.');
    } else {
      console.warn('⚠️ Firebase not available, creating user locally:', connectionTest.error);
      return createUserLocal(userData);
    }
  }
  
  try {
    console.log('🔥 Creating user document in Firestore...');
    // Create user document in Firestore
    const userRef = doc(collection(db, USERS_COLLECTION));
    const userId = userRef.id;
    console.log('🆔 Generated userId:', userId);
    
    const newUser: User = {
      ...userData,
      id: userId,
      createdAt: new Date(),
      ...(userData.role === 'contractor' && { contractorId: generateContractorCode() })
    };
    console.log('📦 Prepared user data:', newUser);
    
    // Save to Firestore
    console.log('💾 Saving to Firestore...');
    await setDoc(userRef, {
      ...newUser,
      createdAt: Timestamp.fromDate(newUser.createdAt)
    });
    console.log('✅ Successfully saved to Firestore');
    
    // Also store in localStorage as backup for offline functionality
    console.log('💾 Caching in localStorage...');
    setTempData(`user_${userId}`, newUser);
    setTempData(`mobile_${userData.mobile}`, userId);
    console.log('✅ Successfully cached in localStorage');
    
    console.log('🎉 User created successfully:', { id: userId, name: newUser.name, role: newUser.role });
    return userId;
  } catch (error) {
    console.error('❌ Firebase error creating user:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error code:', (error as any).code);
    }
    
    // Try to fallback to localStorage only
    console.log('💾 Attempting localStorage fallback...');
    return createUserLocal(userData);
  }
};

// Local user creation fallback
const createUserLocal = (userData: Omit<User, 'id' | 'createdAt'>): string => {
  try {
    const userId = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    const newUser: User = {
      ...userData,
      id: userId,
      createdAt: new Date(),
      ...(userData.role === 'contractor' && { contractorId: generateContractorCode() })
    };
    
    setTempData(`user_${userId}`, newUser);
    setTempData(`mobile_${userData.mobile}`, userId);
    
    console.log('✅ User created locally:', { id: userId, name: newUser.name, role: newUser.role });
    return userId;
  } catch (fallbackError) {
    console.error('❌ Local user creation failed:', fallbackError);
    throw new Error('Failed to create user both in Firebase and locally: ' + (fallbackError instanceof Error ? fallbackError.message : 'Unknown error'));
  }
};

// Authentication with password
export const authenticateUser = async (mobile: string, password: string): Promise<User | null> => {
  try {
    const user = await getUserByMobile(mobile);
    if (!user) {
      console.log('User not found for mobile:', mobile);
      return null;
    }
    
    if (user.password !== password) {
      console.log('Invalid password for user:', mobile);
      return null;
    }
    
    console.log('User authenticated successfully:', user.name);
    return user;
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
};

export const getUserByMobile = async (mobile: string): Promise<User | null> => {
  try {
    // First try Firebase
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('mobile', '==', mobile));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();
      const user = {
        ...data,
        createdAt: data.createdAt.toDate()
      } as User;
      
      // Also cache in localStorage
      setTempData(`user_${user.id}`, user);
      setTempData(`mobile_${mobile}`, user.id);
      
      console.log('User found in Firebase:', user);
      return user;
    }
    
    // Fallback to localStorage if not found in Firebase
    const userId = getTempData(`mobile_${mobile}`);
    if (!userId) return null;
    
    const userData = getTempData(`user_${userId}`);
    if (!userData) return null;
    
    // Convert date string back to Date object if needed
    if (typeof userData.createdAt === 'string') {
      userData.createdAt = new Date(userData.createdAt);
    }
    
    console.log('User found in localStorage:', userData);
    return userData as User;
  } catch (error) {
    console.error('Error fetching user:', error);
    // Fallback to localStorage on Firebase error
    const userId = getTempData(`mobile_${mobile}`);
    if (userId) {
      const userData = getTempData(`user_${userId}`);
      if (userData) {
        if (typeof userData.createdAt === 'string') {
          userData.createdAt = new Date(userData.createdAt);
        }
        return userData as User;
      }
    }
    return null;
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (!userDoc.exists()) return null;
    
    const data = userDoc.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate()
    } as User;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
};

// Contractor-Worker relationship operations
export const assignWorkerToContractor = async (
  workerId: string, 
  contractorCode: string
): Promise<boolean> => {
  try {
    console.log('Assigning worker to contractor:', { workerId, contractorCode });
    
    // Check if worker is local-only (ID starts with 'local_')
    const isLocalWorker = workerId.startsWith('local_');
    
    // Test Firebase connection first
    const connectionTest = await testFirebaseConnection();
    
    if (!connectionTest.connected || isLocalWorker) {
      console.log('⚠️ Using localStorage-only assignment:', 
        !connectionTest.connected ? 'Firebase unavailable' : 'Worker is local-only');
      return await assignWorkerToContractorLocal(workerId, contractorCode);
    }
    
    try {
      // Find contractor by code in Firebase
      const usersRef = collection(db, USERS_COLLECTION);
      const contractorQuery = query(
        usersRef, 
        where('role', '==', 'contractor'),
        where('contractorId', '==', contractorCode)
      );
      const contractorSnapshot = await getDocs(contractorQuery);
      
      if (contractorSnapshot.empty) {
        console.log('Contractor not found in Firebase, trying localStorage...');
        return await assignWorkerToContractorLocal(workerId, contractorCode);
      }
      
      const contractorDoc = contractorSnapshot.docs[0];
      const contractor = contractorDoc.data() as User;
      
      // Check if relation already exists in Firebase
      const relationQuery = query(
        collection(db, RELATIONS_COLLECTION),
        where('contractorId', '==', contractor.id),
        where('workerId', '==', workerId)
      );
      const existingRelationSnapshot = await getDocs(relationQuery);
      
      if (!existingRelationSnapshot.empty) {
        console.log('Relation already exists in Firebase');
        return true;
      }
      
      // Create new relation in Firebase
      const relationData: ContractorWorkerRelation = {
        id: '', // Will be set by Firestore
        contractorId: contractor.id,
        workerId: workerId,
        contractorCode: contractorCode,
        createdAt: new Date()
      };
      
      const relationRef = await addDoc(collection(db, RELATIONS_COLLECTION), {
        ...relationData,
        createdAt: Timestamp.fromDate(relationData.createdAt)
      });
      
      relationData.id = relationRef.id;
      
      // Update worker's contractorCode field in Firebase
      await updateDoc(doc(db, USERS_COLLECTION, workerId), {
        contractorCode: contractorCode
      });
      console.log('✅ Updated worker in Firebase');
      
      // Also cache in localStorage for offline functionality
      const relationKey = `relation_${contractor.id}_${workerId}`;
      setTempData(relationKey, relationData);
      
      const worker = getTempData(`user_${workerId}`);
      if (worker) {
        worker.contractorCode = contractorCode;
        setTempData(`user_${workerId}`, worker);
        
        // Also update in auth context if this is the current user
        const authUser = localStorage.getItem('shramsathi_user');
        if (authUser) {
          try {
            const parsedAuthUser = JSON.parse(authUser);
            if (parsedAuthUser.id === workerId) {
              parsedAuthUser.contractorCode = contractorCode;
              localStorage.setItem('shramsathi_user', JSON.stringify(parsedAuthUser));
              console.log('🔄 Updated auth context with contractor code');
            }
          } catch (error) {
            console.error('Error updating auth context:', error);
          }
        }
      }
      
      console.log('Worker assigned to contractor successfully in Firebase:', relationData);
      return true;
    } catch (firebaseError) {
      console.error('Firebase error, falling back to localStorage:', firebaseError);
      return await assignWorkerToContractorLocal(workerId, contractorCode);
    }
  } catch (error) {
    console.error('Error assigning worker to contractor:', error);
    return false;
  }
};

// Local fallback function for contractor-worker assignment
const assignWorkerToContractorLocal = async (
  workerId: string, 
  contractorCode: string
): Promise<boolean> => {
  try {
    console.log('💾 Attempting local contractor-worker assignment...');
    console.log('🔍 Looking for contractor with code:', contractorCode);
    console.log('🔍 Worker ID:', workerId);
    
    // Find contractor by code in localStorage
    const allUsers = getAllTempData('user_');
    console.log('💾 Total users in localStorage:', allUsers.length);
    
    // Debug: show all contractors
    const allContractors = allUsers.filter(user => user.role === 'contractor');
    console.log('👷 All contractors found:', allContractors.map(c => ({ id: c.id, name: c.name, contractorId: c.contractorId })));
    
    let contractor = allUsers.find(user => 
      user.role === 'contractor' && user.contractorId === contractorCode
    );
    
    console.log('🔍 Contractor found with exact match:', contractor ? { id: contractor.id, name: contractor.name, contractorId: contractor.contractorId } : 'NOT FOUND');
    
    // If not found locally, try to search Firebase and cache locally
    if (!contractor) {
      console.log('🔍 Contractor not found locally, searching Firebase...');
      try {
        const usersRef = collection(db, USERS_COLLECTION);
        const contractorQuery = query(
          usersRef, 
          where('role', '==', 'contractor'),
          where('contractorId', '==', contractorCode)
        );
        const contractorSnapshot = await getDocs(contractorQuery);
        
        if (!contractorSnapshot.empty) {
          const contractorDoc = contractorSnapshot.docs[0];
          const contractorData = contractorDoc.data();
          contractor = {
            ...contractorData,
            createdAt: contractorData.createdAt.toDate()
          } as User;
          
          // Cache contractor locally for future use
          setTempData(`user_${contractor.id}`, contractor);
          console.log('✅ Found contractor in Firebase and cached locally');
        }
      } catch (firebaseError) {
        console.error('❌ Firebase search failed:', firebaseError);
      }
    }
    
    if (!contractor) {
      console.error('❌ Contractor not found with code:', contractorCode);
      return false;
    }
    
    // Check if relation already exists
    const relationKey = `relation_${contractor.id}_${workerId}`;
    const existingRelation = getTempData(relationKey);
    
    if (existingRelation) return true; // Already assigned
    
    // Create new relation
    const relationData: ContractorWorkerRelation = {
      id: relationKey,
      contractorId: contractor.id,
      workerId: workerId,
      contractorCode: contractorCode,
      createdAt: new Date()
    };
    
    setTempData(relationKey, relationData);
    
    // Update worker's contractorCode field
    const worker = getTempData(`user_${workerId}`);
    if (worker) {
      worker.contractorCode = contractorCode;
      setTempData(`user_${workerId}`, worker);
      
      // Also update in auth context if this is the current user
      const authUser = localStorage.getItem('shramsathi_user');
      if (authUser) {
        try {
          const parsedAuthUser = JSON.parse(authUser);
          if (parsedAuthUser.id === workerId) {
            parsedAuthUser.contractorCode = contractorCode;
            localStorage.setItem('shramsathi_user', JSON.stringify(parsedAuthUser));
            console.log('🔄 Updated auth context with contractor code');
          }
        } catch (error) {
          console.error('Error updating auth context:', error);
        }
      }
    }
    
    console.log('Worker assigned to contractor successfully in localStorage:', relationData);
    return true;
  } catch (error) {
    console.error('Error in localStorage fallback:', error);
    return false;
  }
};

export const getWorkersByContractor = async (contractorId: string): Promise<User[]> => {
  try {
    console.log('Fetching workers for contractor:', contractorId);
    
    // First try Firebase
    try {
      const relationQuery = query(
        collection(db, RELATIONS_COLLECTION),
        where('contractorId', '==', contractorId)
      );
      const relationSnapshot = await getDocs(relationQuery);
      
      if (relationSnapshot.empty) {
        console.log('No relations found in Firebase, trying localStorage...');
        return await getWorkersByContractorLocal(contractorId);
      }
      
      const workerIds = relationSnapshot.docs.map(doc => doc.data().workerId);
      
      if (workerIds.length === 0) return [];
      
      // Get all workers from Firebase
      const workers: User[] = [];
      for (const workerId of workerIds) {
        const workerDoc = await getDoc(doc(db, USERS_COLLECTION, workerId));
        if (workerDoc.exists()) {
          const data = workerDoc.data();
          const worker = {
            ...data,
            createdAt: data.createdAt.toDate()
          } as User;
          workers.push(worker);
          
          // Also cache in localStorage
          setTempData(`user_${workerId}`, worker);
        }
      }
      
      console.log('Fetched workers from Firebase:', workers.length);
      return workers;
    } catch (firebaseError) {
      console.error('Firebase error, falling back to localStorage:', firebaseError);
      return await getWorkersByContractorLocal(contractorId);
    }
  } catch (error) {
    console.error('Error fetching workers by contractor:', error);
    return [];
  }
};

// Local fallback function for getting workers by contractor
const getWorkersByContractorLocal = async (contractorId: string): Promise<User[]> => {
  try {
    const allRelations = getAllTempData('relation_');
    const contractorRelations = allRelations.filter(relation => 
      relation.contractorId === contractorId
    );
    
    const workerIds = contractorRelations.map(relation => relation.workerId);
    
    if (workerIds.length === 0) return [];
    
    // Get all workers from localStorage
    const workers: User[] = [];
    for (const workerId of workerIds) {
      const worker = getTempData(`user_${workerId}`);
      if (worker) {
        // Convert date string back to Date object if needed
        if (typeof worker.createdAt === 'string') {
          worker.createdAt = new Date(worker.createdAt);
        }
        workers.push(worker as User);
      }
    }
    
    console.log('Fetched workers from localStorage:', workers.length);
    return workers;
  } catch (error) {
    console.error('Error in localStorage fallback:', error);
    return [];
  }
};

// Attendance operations
export const saveAttendance = async (
  userId: string,
  date: string,
  attendanceType: AttendanceType,
  paymentAmount?: number
): Promise<{success: boolean, error?: string, data?: AttendanceRecord}> => {
  try {
    console.log('💾 Saving attendance:', { userId, date, attendanceType, paymentAmount });
    
    // Test Firebase connection first
    const connectionTest = await testFirebaseConnection();
    if (!connectionTest.connected) {
      console.warn('⚠️ Firebase not available, using localStorage:', connectionTest.error);
      const result = await saveAttendanceLocal(userId, date, attendanceType, paymentAmount);
      return result;
    }
    
    // Try Firebase
    try {
      console.log('🔍 Checking for existing attendance record...');
      // Check if attendance record already exists in Firebase
      const attendanceQuery = query(
        collection(db, ATTENDANCE_COLLECTION),
        where('userId', '==', userId),
        where('date', '==', date)
      );
      const existingSnapshot = await getDocs(attendanceQuery);
      
      let attendanceData: AttendanceRecord;
      
      if (!existingSnapshot.empty) {
        console.log('🔄 Updating existing attendance record...');
        // Update existing record
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();
        
        attendanceData = {
          id: existingDoc.id,
          userId,
          date,
          attendanceType,
          paymentAmount: paymentAmount || 0,
          updatedAt: new Date(),
          createdAt: existingData.createdAt.toDate()
        };
        
        await updateDoc(existingDoc.ref, {
          attendanceType,
          paymentAmount: paymentAmount || 0,
          updatedAt: Timestamp.fromDate(attendanceData.updatedAt)
        });
        
        console.log('✅ Attendance updated in Firebase:', attendanceData);
      } else {
        console.log('➕ Creating new attendance record...');
        // Create new record
        attendanceData = {
          id: '', // Will be set by Firestore
          userId,
          date,
          attendanceType,
          paymentAmount: paymentAmount || 0,
          updatedAt: new Date(),
          createdAt: new Date()
        };
        
        const attendanceRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), {
          userId,
          date,
          attendanceType,
          paymentAmount: paymentAmount || 0,
          updatedAt: Timestamp.fromDate(attendanceData.updatedAt),
          createdAt: Timestamp.fromDate(attendanceData.createdAt)
        });
        
        attendanceData.id = attendanceRef.id;
        console.log('✅ Attendance created in Firebase:', attendanceData);
      }
      
      // Also save to localStorage for offline functionality
      const attendanceKey = `attendance_${userId}_${date}`;
      setTempData(attendanceKey, attendanceData);
      console.log('💾 Cached in localStorage:', attendanceKey);
      
      return { success: true, data: attendanceData };
    } catch (firebaseError) {
      console.error('❌ Firebase error, falling back to localStorage:', firebaseError);
      const result = await saveAttendanceLocal(userId, date, attendanceType, paymentAmount);
      // Add Firebase error info to the result
      if (result.success) {
        result.error = `Firebase failed (${firebaseError instanceof Error ? firebaseError.message : 'unknown'}), saved locally`;
      }
      return result;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error saving attendance:', errorMsg);
    return { success: false, error: errorMsg };
  }
};

// Local fallback function for saving attendance
const saveAttendanceLocal = async (
  userId: string,
  date: string,
  attendanceType: AttendanceType,
  paymentAmount?: number
): Promise<{success: boolean, error?: string, data?: AttendanceRecord}> => {
  try {
    console.log('💾 Saving to localStorage fallback...');
    const attendanceKey = `attendance_${userId}_${date}`;
    const existingAttendance = getTempData(attendanceKey);
    
    const attendanceData: AttendanceRecord = {
      id: attendanceKey,
      userId,
      date,
      attendanceType,
      paymentAmount: paymentAmount || 0,
      updatedAt: new Date(),
      createdAt: existingAttendance?.createdAt || new Date()
    };
    
    // Convert dates to strings for localStorage
    if (typeof attendanceData.createdAt === 'string') {
      attendanceData.createdAt = new Date(attendanceData.createdAt);
    }
    if (typeof attendanceData.updatedAt === 'string') {
      attendanceData.updatedAt = new Date(attendanceData.updatedAt);
    }
    
    // Save to localStorage
    setTempData(attendanceKey, attendanceData);
    
    console.log('✅ Attendance saved to localStorage:', attendanceData);
    return { success: true, data: attendanceData };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown localStorage error';
    console.error('❌ Error in localStorage fallback:', errorMsg);
    return { success: false, error: errorMsg };
  }
};

export const getAttendanceByUser = async (
  userId: string, 
  startDate?: string, 
  endDate?: string
): Promise<AttendanceRecord[]> => {
  try {
    console.log('Fetching attendance for user:', { userId, startDate, endDate });
    
    // First try Firebase
    try {
      let attendanceQueryRef = query(
        collection(db, ATTENDANCE_COLLECTION),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      
      // Add date range filters if provided
      if (startDate) {
        attendanceQueryRef = query(attendanceQueryRef, where('date', '>=', startDate));
      }
      if (endDate) {
        attendanceQueryRef = query(attendanceQueryRef, where('date', '<=', endDate));
      }
      
      const attendanceSnapshot = await getDocs(attendanceQueryRef);
      
      if (attendanceSnapshot.empty) {
        console.log('No attendance found in Firebase, trying localStorage...');
        return await getAttendanceByUserLocal(userId, startDate, endDate);
      }
      
      const userAttendance: AttendanceRecord[] = attendanceSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          date: data.date,
          attendanceType: data.attendanceType,
          paymentAmount: data.paymentAmount,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as AttendanceRecord;
      });
      
      // Also cache in localStorage
      userAttendance.forEach(record => {
        const attendanceKey = `attendance_${userId}_${record.date}`;
        setTempData(attendanceKey, record);
      });
      
      console.log('Fetched attendance from Firebase:', userAttendance.length);
      return userAttendance;
    } catch (firebaseError) {
      const code = (firebaseError as any)?.code || '';
      const message = (firebaseError as any)?.message || '';
      if (code === 'failed-precondition' || message.includes('requires an index')) {
        console.warn('Index not ready yet, using fallback query (userId only) and local filtering...');
        return await getAttendanceByUserFirebaseFallback(userId, startDate, endDate);
      }
      console.error('Firebase error, falling back to localStorage:', firebaseError);
      return await getAttendanceByUserLocal(userId, startDate, endDate);
    }
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }
};

// Fallback query that avoids composite index by querying only userId and filtering client-side
const getAttendanceByUserFirebaseFallback = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceRecord[]> => {
  try {
    const simpleQuery = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(simpleQuery);
    const records: AttendanceRecord[] = snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        date: data.date,
        attendanceType: data.attendanceType,
        paymentAmount: data.paymentAmount,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
      } as AttendanceRecord;
    });

    // Client-side filter and sort
    let filtered = records;
    if (startDate || endDate) {
      filtered = filtered.filter(r => {
        const d = r.date;
        const afterStart = !startDate || d >= startDate;
        const beforeEnd = !endDate || d <= endDate;
        return afterStart && beforeEnd;
      });
    }
    filtered.sort((a, b) => b.date.localeCompare(a.date));

    // Cache
    filtered.forEach(record => {
      const attendanceKey = `attendance_${userId}_${record.date}`;
      setTempData(attendanceKey, record);
    });

    console.log('Fetched attendance via fallback query (no composite index):', filtered.length);
    return filtered;
  } catch (e) {
    console.warn('Fallback Firebase query failed, using localStorage:', e);
    return await getAttendanceByUserLocal(userId, startDate, endDate);
  }
};

// Local fallback function for getting attendance
const getAttendanceByUserLocal = async (
  userId: string, 
  startDate?: string, 
  endDate?: string
): Promise<AttendanceRecord[]> => {
  try {
    const allAttendance = getAllTempData('attendance_');
    
    // Filter by userId
    let userAttendance = allAttendance.filter(record => record.userId === userId);
    
    // Filter by date range if provided
    if (startDate || endDate) {
      userAttendance = userAttendance.filter(record => {
        const recordDate = record.date;
        const afterStart = !startDate || recordDate >= startDate;
        const beforeEnd = !endDate || recordDate <= endDate;
        return afterStart && beforeEnd;
      });
    }
    
    // Convert date strings back to Date objects if needed
    userAttendance.forEach(record => {
      if (typeof record.createdAt === 'string') {
        record.createdAt = new Date(record.createdAt);
      }
      if (typeof record.updatedAt === 'string') {
        record.updatedAt = new Date(record.updatedAt);
      }
    });
    
    // Sort by date descending
    userAttendance.sort((a, b) => b.date.localeCompare(a.date));
    
    console.log('Fetched attendance from localStorage:', userAttendance.length);
    return userAttendance as AttendanceRecord[];
  } catch (error) {
    console.error('Error in localStorage fallback:', error);
    return [];
  }
};
