'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Eye, 
  LogOut, 
  Copy, 
  CheckCircle,
  Calendar,
  IndianRupee,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { User, AttendanceRecord } from '@/types';
import { getWorkersByContractor, getAttendanceByUser, ensureContractorCode } from '@/lib/database';
import { calculateMonthlyDihaadiStats } from '@/utils/dihaadi-utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import '@/utils/fix-contractor-sync'; // Load contractor sync fix utility
import '@/utils/debug-and-fix-relations'; // Load advanced debug utilities

export default function ContractorDashboard() {
  const { user, logout, setUser } = useAuth();
  const [workers, setWorkers] = useState<User[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<User | null>(null);
  const [workerAttendance, setWorkerAttendance] = useState<AttendanceRecord[]>([]);
  const [workerStats, setWorkerStats] = useState<{[key: string]: {totalDays: number, presentDays: number, totalPayments: number, totalDihaadiUnits: number, formattedDihaadiUnits: string}}>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [view, setView] = useState<'workers' | 'calendar' | 'payments'>('workers');

  useEffect(() => {
    initializeContractor();
  }, [user]);

  const initializeContractor = async () => {
    if (!user || user.role !== 'contractor') return;
    
    try {
      // Check if contractor data exists in localStorage but not in auth context
      const localUser = localStorage.getItem(`shramsathi_temp_user_${user.id}`);
      if (localUser) {
        try {
          const parsedLocalUser = JSON.parse(localUser);
          if (parsedLocalUser.contractorId && !user.contractorId) {
            console.log('🔄 Syncing contractor ID from localStorage to auth context');
            const updatedUser = { ...user, contractorId: parsedLocalUser.contractorId };
            setUser(updatedUser);
            
            // Also update the auth localStorage
            const authUser = localStorage.getItem('shramsathi_user');
            if (authUser) {
              const parsedAuthUser = JSON.parse(authUser);
              parsedAuthUser.contractorId = parsedLocalUser.contractorId;
              localStorage.setItem('shramsathi_user', JSON.stringify(parsedAuthUser));
            }
            
            console.log('✅ Contractor data synced:', parsedLocalUser.contractorId);
            await loadWorkers();
            return;
          }
        } catch (error) {
          console.error('Error syncing contractor data:', error);
        }
      }
      
      // Ensure contractor has a contractor code
      if (!user.contractorId) {
        console.log('🔧 Contractor missing contractorId, generating one...');
        const contractorCode = await ensureContractorCode(user.id);
        
        // Update user in auth context with the new contractor code
        const updatedUser = { ...user, contractorId: contractorCode };
        setUser(updatedUser);
        
        // Also update the auth localStorage to ensure consistency
        const authUser = localStorage.getItem('shramsathi_user');
        if (authUser) {
          try {
            const parsedAuthUser = JSON.parse(authUser);
            parsedAuthUser.contractorId = contractorCode;
            localStorage.setItem('shramsathi_user', JSON.stringify(parsedAuthUser));
            console.log('🔄 Synced contractor code in auth context');
          } catch (error) {
            console.error('Error syncing auth context:', error);
          }
        }
        
        console.log('✅ Contractor code added:', contractorCode);
        setMessage('Contractor code generated successfully!');
        setTimeout(() => setMessage(''), 3000);
        
        // Load workers after getting the code
        await loadWorkers();
        return;
      }
      
      // Load workers if contractor code exists
      await loadWorkers();
    } catch (error) {
      console.error('Error initializing contractor:', error);
      setMessage('Error initializing contractor dashboard. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const loadWorkers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const workersList = await getWorkersByContractor(user.id);
      setWorkers(workersList);
      
      // Load statistics for each worker
      const statsPromises = workersList.map(async (worker) => {
        const stats = await getWorkerStats(worker);
        return { workerId: worker.id, stats };
      });
      
      const statsResults = await Promise.all(statsPromises);
      const statsMap = statsResults.reduce((acc, { workerId, stats }) => {
        acc[workerId] = stats;
        return acc;
      }, {} as {[key: string]: {totalDays: number, presentDays: number, totalPayments: number, totalDihaadiUnits: number, formattedDihaadiUnits: string}});
      
      setWorkerStats(statsMap);
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkerAttendance = async (workerId: string) => {
    setLoading(true);
    try {
      const records = await getAttendanceByUser(workerId);
      setWorkerAttendance(records);
    } catch (error) {
      console.error('Error loading worker attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyContractorCode = () => {
    if (user?.contractorId) {
      navigator.clipboard.writeText(user.contractorId);
      setMessage('Contractor code copied to clipboard!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleWorkerSelect = async (worker: User) => {
    setSelectedWorker(worker);
    await loadWorkerAttendance(worker.id);
    setView('calendar');
  };

  const getAttendanceForDate = (date: Date): AttendanceRecord | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return workerAttendance.find(record => record.date === dateStr);
  };

  const renderWorkersList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">My Workers</h2>
        <div className="text-sm text-gray-600">
          Total: {workers.length} workers
        </div>
      </div>

      {workers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Workers Assigned</h3>
          <p className="text-gray-500 mb-4">
            Share your contractor code with workers to get started
          </p>
          <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-600 mb-2">Your Contractor Code:</p>
            <div className="flex items-center gap-2">
              <code className="bg-white px-3 py-2 rounded border text-lg font-mono">
                {user?.contractorId}
              </code>
              <button
                onClick={copyContractorCode}
                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 mb-1">Your Contractor Code:</p>
                <code className="bg-white px-3 py-1 rounded border text-lg font-mono">
                  {user?.contractorId}
                </code>
              </div>
              <button
                onClick={copyContractorCode}
                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {workers.map(worker => {
              const workerStatsData = workerStats[worker.id] || { totalDays: 0, presentDays: 0, totalPayments: 0, totalDihaadiUnits: 0, formattedDihaadiUnits: '0' };
              return (
                <div
                  key={worker.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{worker.name}</h3>
                      <p className="text-sm text-gray-600">{worker.skill}</p>
                      <p className="text-xs text-gray-500">{worker.mobile}</p>
                    </div>
                    <div className="text-right mr-4">
                      <div className="text-sm text-gray-600">This Month</div>
                      {loading && !workerStats[worker.id] ? (
                        <div className="text-sm text-gray-400 animate-pulse">
                          Loading...
                        </div>
                      ) : (
                        <>
                          <div className="text-lg font-semibold text-green-600">
                            ₹{workerStatsData.totalPayments}
                          </div>
                          <div className="text-xs text-blue-600 font-medium">
                            {workerStatsData.formattedDihaadiUnits} dihaadi
                          </div>
                          <div className="text-xs text-gray-500">
                            {workerStatsData.presentDays} present days
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handleWorkerSelect(worker)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  const renderCalendarView = () => {
    if (!selectedWorker) return null;

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

    const monthlyStats = getMonthlyStats();

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setView('workers');
                setSelectedWorker(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{selectedWorker.name}</h2>
              <p className="text-sm text-gray-600">{selectedWorker.skill}</p>
            </div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{monthlyStats.formattedDihaadiUnits}</div>
              <div className="text-sm text-gray-600">Total Dihaadi</div>
              <div className="text-xs text-gray-500 mt-1">{monthlyStats.presentDays} present days</div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">₹{monthlyStats.totalPayments}</div>
              <div className="text-sm text-gray-600">Total Earned</div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{monthlyStats.totalDays}</div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
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
                <div
                  key={index}
                  className={`
                    aspect-square flex flex-col items-center justify-center text-sm rounded-lg border
                    ${isCurrentMonth ? 'text-gray-900 border-gray-200' : 'text-gray-300 border-gray-100'}
                    ${isToday ? 'bg-blue-100 border-blue-500' : ''}
                    ${attendance ? 'bg-green-50 border-green-200' : ''}
                  `}
                >
                  <span className="font-medium">{day.getDate()}</span>
                  {attendance && (
                    <>
                      <span className={`
                        text-xs mt-1 px-1 rounded
                        ${attendance.attendanceType === 'A' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
                      `}>
                        {attendance.attendanceType}
                      </span>
                      {attendance.paymentAmount && attendance.paymentAmount > 0 && (
                        <span className="text-xs text-green-600 font-medium">
                          ₹{attendance.paymentAmount}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Payment History</h3>
          <div className="space-y-2">
            {workerAttendance
              .filter(record => record.paymentAmount && record.paymentAmount > 0)
              .slice(0, 10)
              .map(record => (
                <div key={record.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={`
                      px-2 py-1 rounded text-xs
                      ${record.attendanceType === 'A' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
                    `}>
                      {record.attendanceType}
                    </span>
                    <span className="text-sm text-gray-600">
                      {format(new Date(record.date), 'dd MMM yyyy')}
                    </span>
                  </div>
                  <span className="font-semibold text-green-600">
                    ₹{record.paymentAmount}
                  </span>
                </div>
              ))}
            {workerAttendance.filter(r => r.paymentAmount && r.paymentAmount > 0).length === 0 && (
              <p className="text-center text-gray-500 py-4">No payments recorded yet</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getWorkerStats = async (worker: User) => {
    try {
      // Get worker's attendance data
      const attendance = await getAttendanceByUser(worker.id);
      
      // Calculate current month stats using dihaadi calculations
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      
      return calculateMonthlyDihaadiStats(attendance, monthStart, monthEnd);
    } catch (error) {
      console.error('Error calculating worker stats:', error);
      return {
        totalDays: 0,
        presentDays: 0,
        totalPayments: 0,
        totalDihaadiUnits: 0,
        formattedDihaadiUnits: '0'
      };
    }
  };

  const getMonthlyStats = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return calculateMonthlyDihaadiStats(workerAttendance, monthStart, monthEnd);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">ShramSathi</h1>
              <p className="text-sm text-gray-600">
                {user.companyName ? `${user.companyName} - ${user.name}` : user.name}
              </p>
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

      {/* Content */}
      <div className="px-4 py-6">
        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        )}

        {!loading && view === 'workers' && renderWorkersList()}
        {!loading && view === 'calendar' && renderCalendarView()}
      </div>
    </div>
  );
}