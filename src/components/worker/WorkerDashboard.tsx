'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  IndianRupee, 
  History, 
  Plus,
  LogOut,
  Settings,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AttendanceRecord, AttendanceType } from '@/types';
import { saveAttendance, getAttendanceByUser, assignWorkerToContractor, testFirebaseConnection } from '@/lib/database';
import { calculateMonthlyDihaadiStats, getAttendanceDescription } from '@/utils/dihaadi-utils';
import '@/utils/debug-firebase'; // Load debug utilities
import '@/utils/debug-contractor-connection'; // Load contractor debug utilities
import '@/utils/debug-and-fix-relations'; // Load advanced debug utilities
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

export default function WorkerDashboard() {
  const { user, logout, setUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [contractorCode, setContractorCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Attendance form states
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceType>('P');
  const [paymentAmount, setPaymentAmount] = useState('');

  const attendanceOptions: { value: AttendanceType; label: string; description: string }[] = [
    { value: 'A', label: 'A', description: 'Absent (0 hours)' },
    { value: '1/2P', label: '1/2P', description: '4 hours (0.5 dihaadi)' },
    { value: 'P', label: 'P', description: '8 hours (1 dihaadi)' },
    { value: 'P1/2', label: 'P1/2', description: '12 hours (1.5 dihaadi)' },
    { value: '2P', label: '2P', description: '16 hours (2 dihaadi)' }
  ];

  useEffect(() => {
    loadAttendanceRecords();
    // Test Firebase connection on load
    testFirebaseConnection().then((result) => {
      if (!result.connected) {
        console.warn('Firebase connection failed on load:', result.error);
        setMessage('Warning: Using offline mode. Data will be saved locally.');
        setTimeout(() => setMessage(''), 5000);
      } else {
        console.log('Firebase connection verified on load');
      }
    });
  }, [user]);

  const loadAttendanceRecords = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const records = await getAttendanceByUser(user.id);
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceForDate = (date: Date): AttendanceRecord | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendanceRecords.find(record => record.date === dateStr);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const existing = getAttendanceForDate(date);
    if (existing) {
      setSelectedAttendance(existing.attendanceType as AttendanceType);
      setPaymentAmount(existing.paymentAmount?.toString() || '');
    } else {
      setSelectedAttendance('P');
      setPaymentAmount('');
    }
    setShowAttendanceModal(true);
  };

  const handleAttendanceSave = async () => {
    if (!selectedDate || !user) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const amount = paymentAmount ? parseFloat(paymentAmount) : undefined;

    setLoading(true);
    try {
      const result = await saveAttendance(user.id, dateStr, selectedAttendance, amount);
      if (result.success) {
        setMessage('Attendance saved successfully!' + (result.error ? ' (' + result.error + ')' : ''));
        await loadAttendanceRecords();
        setShowAttendanceModal(false);
        setTimeout(() => setMessage(''), 5000); // Longer timeout to show any warnings
      } else {
        setMessage('Failed to save attendance: ' + (result.error || 'Unknown error'));
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      setMessage('Error saving attendance: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleContractorAssignment = async () => {
    if (!user || !contractorCode.trim()) return;

    setLoading(true);
    try {
      const success = await assignWorkerToContractor(user.id, contractorCode.trim().toUpperCase());
      if (success) {
        // Update user context with contractor code
        const updatedUser = { ...user, contractorCode: contractorCode.trim().toUpperCase() };
        setUser(updatedUser);
        
        setMessage('Successfully connected to contractor!');
        setContractorCode('');
        setShowContractorModal(false);
        setTimeout(() => setMessage(''), 5000);
        
        console.log('✅ Worker connected to contractor:', contractorCode.trim().toUpperCase());
      } else {
        setMessage('Invalid contractor code. Please check and try again.');
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error connecting to contractor:', error);
      setMessage('Error connecting to contractor.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const renderCalendar = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    // Get days from previous month to fill the grid
    const startDay = start.getDay();
    const previousMonthDays = [];
    for (let i = startDay - 1; i >= 0; i--) {
      const day = new Date(start);
      day.setDate(day.getDate() - (i + 1));
      previousMonthDays.push(day);
    }

    // Get days from next month to fill the grid
    const totalCells = Math.ceil((previousMonthDays.length + days.length) / 7) * 7;
    const nextMonthDays = [];
    for (let i = 0; i < totalCells - previousMonthDays.length - days.length; i++) {
      const day = new Date(end);
      day.setDate(day.getDate() + (i + 1));
      nextMonthDays.push(day);
    }

    const allDays = [...previousMonthDays, ...days, ...nextMonthDays];

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        {allDays.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const attendance = getAttendanceForDate(day);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={index}
              onClick={() => isCurrentMonth && handleDateClick(day)}
              className={`
                aspect-square flex flex-col items-center justify-center text-sm rounded-lg
                ${isCurrentMonth ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-300'}
                ${isToday ? 'bg-blue-100 border-2 border-blue-500' : ''}
                ${attendance ? 'bg-green-50 border border-green-200' : ''}
                ${!isCurrentMonth ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
              disabled={!isCurrentMonth}
            >
              <span className="font-medium">{day.getDate()}</span>
              {attendance && (
                <span className={`
                  text-xs mt-1 px-1 rounded
                  ${attendance.attendanceType === 'A' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
                `}>
                  {attendance.attendanceType}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const getMonthlyStats = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return calculateMonthlyDihaadiStats(attendanceRecords, monthStart, monthEnd);
  };

  const stats = getMonthlyStats();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">ShramSathi</h1>
              <p className="text-sm text-gray-600">Welcome, {user.name}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {message && (
        <div className="px-4 py-2">
          <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {message}
          </div>
        </div>
      )}

      {/* Contractor Status */}
      {user.contractorCode && (
        <div className="px-4 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Connected to Contractor</h3>
                  <p className="text-xs text-blue-600">Contractor Code: <span className="font-mono font-semibold">{user.contractorCode}</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowContractorModal(true)}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.formattedDihaadiUnits}</div>
              <div className="text-sm text-gray-600">Total Dihaadi</div>
              <div className="text-xs text-gray-500 mt-1">{stats.presentDays} present days</div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">₹{stats.totalPayments}</div>
              <div className="text-sm text-gray-600">Total Earned</div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.totalDays}</div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Next
              </button>
            </div>
          </div>
          {renderCalendar()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setShowContractorModal(true)}
            className="bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" />
            {user.contractorCode ? 'Change Contractor' : 'Connect to Contractor'}
          </button>
          <button
            onClick={() => setShowPaymentHistoryModal(true)}
            className="bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700 flex items-center justify-center gap-2"
          >
            <History className="w-4 h-4" />
            Payment History
          </button>
        </div>
      </div>

      {/* Attendance Modal */}
      {showAttendanceModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Mark Attendance - {format(selectedDate, 'dd MMM yyyy')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendance
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {attendanceOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedAttendance(option.value)}
                      className={`p-3 border rounded-lg text-center ${
                        selectedAttendance === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (Optional)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter amount received"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAttendanceSave}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contractor Code Modal */}
      {showContractorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {user.contractorCode ? 'Change Contractor' : 'Connect to Contractor'}
            </h3>
            
            {user.contractorCode && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Currently connected to: <span className="font-mono font-semibold">{user.contractorCode}</span>
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contractor Code
                </label>
                <input
                  type="text"
                  value={contractorCode}
                  onChange={(e) => setContractorCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="Enter 6-digit contractor code"
                  maxLength={6}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Get this code from your contractor
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowContractorModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleContractorAssignment}
                disabled={loading || contractorCode.length !== 6}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Payment History</h3>
              <button
                onClick={() => setShowPaymentHistoryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-96">
              {attendanceRecords.filter(record => record.paymentAmount && record.paymentAmount > 0).length > 0 ? (
                <div className="space-y-3">
                  {attendanceRecords
                    .filter(record => record.paymentAmount && record.paymentAmount > 0)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(record => (
                      <div 
                        key={record.id} 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-800">
                              {format(new Date(record.date), 'dd')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(record.date), 'MMM')}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              {format(new Date(record.date), 'EEEE, dd MMMM yyyy')}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`
                                px-2 py-1 rounded text-xs font-medium
                                ${record.attendanceType === 'A' 
                                  ? 'bg-red-100 text-red-600' 
                                  : 'bg-green-100 text-green-600'
                                }
                              `}>
                                {record.attendanceType}
                              </span>
                              <span className="text-sm text-gray-500">
                                {
                                  record.attendanceType === 'A' ? 'Absent' :
                                  record.attendanceType === '1/2P' ? 'Half Day' :
                                  record.attendanceType === 'P' ? 'Full Day' :
                                  record.attendanceType === 'P1/2' ? 'One & Half Day' :
                                  record.attendanceType === '2P' ? 'Double Day' : record.attendanceType
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600">
                            ₹{record.paymentAmount}
                          </div>
                          <div className="text-xs text-gray-500">
                            Payment received
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-600 mb-2">No Payment History</h4>
                  <p className="text-gray-500 mb-4">
                    You haven't received any payments yet. Payments will appear here when you add them to your attendance records.
                  </p>
                </div>
              )}
            </div>
            
            {attendanceRecords.filter(record => record.paymentAmount && record.paymentAmount > 0).length > 0 && (
              <div className="mt-4 pt-4 border-t bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Total Payments:</span>
                  <span className="text-xl font-bold text-green-600">
                    ₹{attendanceRecords.reduce((sum, record) => sum + (record.paymentAmount || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Payment Days:</span>
                  <span className="text-sm font-medium text-gray-700">
                    {attendanceRecords.filter(record => record.paymentAmount && record.paymentAmount > 0).length} days
                  </span>
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={() => setShowPaymentHistoryModal(false)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
