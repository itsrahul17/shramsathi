// Firebase debugging utilities
// Run these functions in the browser console to diagnose Firebase issues

import { testFirebaseConnection } from '../lib/firebase-test';
import { testFirebaseConnection as testConnection, createUser, saveAttendance, getUserByMobile } from '../lib/database';
import app from '../lib/firebase';

export const debugFirebase = {
  // Basic connection test
  async testConnection() {
    console.log('🔍 FIREBASE CONNECTION TEST');
    console.log('============================');
    
    const result = await testConnection();
    if (result.connected) {
      console.log('✅ Firebase connection: SUCCESS');
    } else {
      console.log('❌ Firebase connection: FAILED');
      console.log('Error:', result.error);
    }
    return result;
  },

  // Environment check
  checkEnvironment() {
    console.log('🔍 ENVIRONMENT VARIABLES CHECK');
    console.log('===============================');
    
    // In Next.js, process.env is statically replaced at build time.
    // Dynamic access like process.env[varName] returns undefined in the browser.
    // So instead, read the actual Firebase app options that were initialized.
    const opts = (app as any)?.options || {};

    const mapping = [
      { name: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: opts.apiKey },
      { name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', value: opts.authDomain },
      { name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', value: opts.projectId },
      { name: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', value: opts.storageBucket },
      { name: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', value: opts.messagingSenderId },
      { name: 'NEXT_PUBLIC_FIREBASE_APP_ID', value: opts.appId },
    ];

    const results = mapping.map(item => ({
      name: item.name,
      value: item.value,
      status: item.value ? '✅ SET' : '❌ MISSING'
    }));

    console.table(results);

    const missing = results.filter(r => !r.value);
    if (missing.length > 0) {
      console.log('❌ Missing Firebase config fields in initialized app options:', missing.map(m => m.name));
      console.log('App options seen by the browser:', opts);
      return false;
    } else {
      console.log('✅ Firebase app options are present');
      return true;
    }
  },

  // Test user operations
  async testUserOperations() {
    console.log('🔍 USER OPERATIONS TEST');
    console.log('========================');
    
    const testUser = {
      name: 'Debug Test User',
      mobile: `debug${Date.now()}`,
      role: 'worker' as const,
      skill: 'Testing'
    };

    try {
      console.log('Creating test user...', testUser);
      const userId = await createUser(testUser);
      console.log('✅ User created successfully:', userId);

      console.log('Retrieving user by mobile...');
      const retrievedUser = await getUserByMobile(testUser.mobile);
      
      if (retrievedUser) {
        console.log('✅ User retrieved successfully:', {
          id: retrievedUser.id,
          name: retrievedUser.name,
          mobile: retrievedUser.mobile
        });
        return { success: true, userId, user: retrievedUser };
      } else {
        console.log('❌ User retrieval failed');
        return { success: false, error: 'User retrieval failed' };
      }
    } catch (error) {
      console.log('❌ User operations failed:', error);
      return { success: false, error };
    }
  },

  // Test attendance operations
  async testAttendanceOperations(userId?: string) {
    console.log('🔍 ATTENDANCE OPERATIONS TEST');
    console.log('==============================');
    
    // Use provided userId or create a test user
    let testUserId = userId;
    if (!testUserId) {
      const userResult = await this.testUserOperations();
      if (!userResult.success) {
        console.log('❌ Cannot test attendance without a valid user');
        return { success: false, error: 'No valid user for testing' };
      }
      testUserId = userResult.userId;
    }

    try {
      const testDate = new Date().toISOString().split('T')[0]; // Today
      const attendanceData = {
        userId: testUserId!,
        date: testDate,
        attendanceType: 'P',
        paymentAmount: 500
      };

      console.log('Saving test attendance...', attendanceData);
      const result = await saveAttendance(
        attendanceData.userId,
        attendanceData.date,
        attendanceData.attendanceType,
        attendanceData.paymentAmount
      );

      if (result.success) {
        console.log('✅ Attendance saved successfully:', result.data);
        return { success: true, data: result.data };
      } else {
        console.log('❌ Attendance save failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.log('❌ Attendance operations failed:', error);
      return { success: false, error };
    }
  },

  // Full diagnostic test
  async runFullDiagnostic() {
    console.log('🚀 FULL FIREBASE DIAGNOSTIC');
    console.log('============================');
    
    const results = {
      environment: false,
      connection: false,
      userOps: false,
      attendanceOps: false
    };

    // Environment check
    console.log('\n1. Checking environment variables...');
    results.environment = this.checkEnvironment();

    if (!results.environment) {
      console.log('❌ Environment check failed. Cannot proceed with Firebase tests.');
      return results;
    }

    // Connection test
    console.log('\n2. Testing Firebase connection...');
    const connectionResult = await this.testConnection();
    results.connection = connectionResult.connected;

    if (!results.connection) {
      console.log('❌ Connection test failed:', connectionResult.error);
      console.log('🔧 Possible solutions:');
      console.log('   - Enable Firestore API in Firebase Console');
      console.log('   - Check Firebase security rules');
      console.log('   - Verify internet connection');
      console.log('   - Visit: https://console.firebase.google.com/project/shramsathi-ea4b0/firestore');
    }

    // User operations test
    console.log('\n3. Testing user operations...');
    const userResult = await this.testUserOperations();
    results.userOps = userResult.success;

    // Attendance operations test  
    if (userResult.success) {
      console.log('\n4. Testing attendance operations...');
      const attendanceResult = await this.testAttendanceOperations(userResult.userId);
      results.attendanceOps = attendanceResult.success;
    } else {
      console.log('\n4. Skipping attendance test (user operations failed)');
    }

    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('======================');
    console.table(results);
    
    const allPassed = Object.values(results).every(Boolean);
    if (allPassed) {
      console.log('🎉 All tests passed! Firebase is working correctly.');
    } else {
      console.log('❌ Some tests failed. Check the logs above for details.');
    }

    return results;
  },

  // Quick localStorage check
  checkLocalStorage() {
    console.log('🔍 LOCALSTORAGE DATA CHECK');
    console.log('===========================');
    
    const keys = Object.keys(localStorage).filter(key => key.startsWith('shramsathi_temp_'));
    console.log('Found', keys.length, 'localStorage entries');
    
    const data: any = {};
    keys.forEach(key => {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || '{}');
      } catch (e) {
        data[key] = 'Invalid JSON';
      }
    });
    
    console.table(data);
    return data;
  }
};

// Make available globally in the browser
if (typeof window !== 'undefined') {
  (window as any).debugFirebase = debugFirebase;
  console.log('🔧 Debug utilities loaded. Available as window.debugFirebase');
  console.log('Usage:');
  console.log('  debugFirebase.checkEnvironment()');
  console.log('  debugFirebase.testConnection()');
  console.log('  debugFirebase.testUserOperations()');
  console.log('  debugFirebase.runFullDiagnostic()');
  console.log('  debugFirebase.checkLocalStorage()');
}