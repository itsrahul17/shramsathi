import { logEvent, setUserProperties, setUserId } from 'firebase/analytics';
import { analytics } from './firebase';

// Analytics utility for ShramSathi
export const trackEvent = (eventName: string, parameters: Record<string, any> = {}) => {
  if (!analytics) {
    console.log('📊 Analytics not available, event not tracked:', eventName, parameters);
    return;
  }

  try {
    logEvent(analytics, eventName, parameters);
    console.log('📊 Analytics event tracked:', eventName, parameters);
  } catch (error) {
    console.error('❌ Analytics tracking error:', error);
  }
};

// Set user properties for better analytics
export const setAnalyticsUser = (userId: string, properties: Record<string, any> = {}) => {
  if (!analytics) {
    console.log('📊 Analytics not available, user not set');
    return;
  }

  try {
    setUserId(analytics, userId);
    setUserProperties(analytics, properties);
    console.log('👤 Analytics user set:', userId, properties);
  } catch (error) {
    console.error('❌ Analytics user setup error:', error);
  }
};

// ShramSathi specific tracking events
export const trackUserRegistration = (userType: 'worker' | 'contractor', userId: string) => {
  trackEvent('sign_up', {
    method: 'mobile_otp',
    user_type: userType,
    user_id: userId
  });
  
  setAnalyticsUser(userId, {
    user_type: userType,
    registration_date: new Date().toISOString()
  });
};

export const trackUserLogin = (userType: 'worker' | 'contractor', userId: string) => {
  trackEvent('login', {
    method: 'mobile_otp',
    user_type: userType,
    user_id: userId
  });
};

export const trackAttendanceMarked = (userId: string, attendanceType: string, paymentAmount?: number) => {
  trackEvent('attendance_marked', {
    user_id: userId,
    attendance_type: attendanceType,
    has_payment: paymentAmount ? true : false,
    payment_amount: paymentAmount || 0
  });
};

export const trackContractorConnection = (workerId: string, contractorId: string) => {
  trackEvent('contractor_connected', {
    worker_id: workerId,
    contractor_id: contractorId
  });
};

export const trackWorkerAssignment = (contractorId: string, workerId: string) => {
  trackEvent('worker_assigned', {
    contractor_id: contractorId,
    worker_id: workerId
  });
};

export const trackPaymentHistory = (userId: string, totalPayments: number, paymentDays: number) => {
  trackEvent('payment_history_viewed', {
    user_id: userId,
    total_payments: totalPayments,
    payment_days: paymentDays
  });
};

export const trackDashboardView = (userType: 'worker' | 'contractor', userId: string) => {
  trackEvent('page_view', {
    page_title: `${userType}_dashboard`,
    user_type: userType,
    user_id: userId
  });
};

// Track app errors for better debugging
export const trackError = (error: string, context: string) => {
  trackEvent('app_error', {
    error_message: error,
    context: context,
    timestamp: new Date().toISOString()
  });
};

console.log('📊 ShramSathi Analytics utilities loaded');