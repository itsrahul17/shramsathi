// Utility functions for dihaadi (daily wage) calculations
import { AttendanceType } from '@/types';

// Convert attendance type to dihaadi units
export const getAttendanceUnits = (attendanceType: AttendanceType): number => {
  switch (attendanceType) {
    case 'A':       // Absent
      return 0;
    case '1/2P':    // Half day (4 hours)
      return 0.5;
    case 'P':       // Full day (8 hours) - Single dihaadi
      return 1.0;
    case 'P1/2':    // One & half day (12 hours)
      return 1.5;
    case '2P':      // Double day (16 hours)
      return 2.0;
    default:
      return 0;
  }
};

// Format dihaadi units for display
export const formatDihaadiUnits = (units: number): string => {
  if (units === 0) return '0';
  if (units === 0.5) return '1/2P';
  if (units === 1) return '1P';
  if (units === 1.5) return '1½P';
  if (units === 2) return '2P';
  if (units % 1 === 0) return `${units}P`;
  if (units % 1 === 0.5) return `${Math.floor(units)}½P`;
  return `${units}P`;
};

// Get description for attendance type
export const getAttendanceDescription = (attendanceType: AttendanceType): string => {
  switch (attendanceType) {
    case 'A':
      return 'Absent (0 hours)';
    case '1/2P':
      return 'Half Day (4 hours)';
    case 'P':
      return 'Full Day (8 hours)';
    case 'P1/2':
      return 'One & Half Day (12 hours)';
    case '2P':
      return 'Double Day (16 hours)';
    default:
      return attendanceType;
  }
};

// Calculate total dihaadi units from attendance records
export const calculateTotalDihaadiUnits = (attendanceRecords: any[]): number => {
  return attendanceRecords.reduce((total, record) => {
    return total + getAttendanceUnits(record.attendanceType as AttendanceType);
  }, 0);
};

// Calculate monthly dihaadi statistics
export const calculateMonthlyDihaadiStats = (attendanceRecords: any[], monthStart: Date, monthEnd: Date) => {
  const monthlyRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= monthStart && recordDate <= monthEnd;
  });

  const totalDays = monthlyRecords.length; // Total attendance records
  const presentDays = monthlyRecords.filter(r => r.attendanceType !== 'A').length; // Days present (not absent)
  const totalPayments = monthlyRecords.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);
  const totalDihaadiUnits = calculateTotalDihaadiUnits(monthlyRecords); // Total work units

  return {
    totalDays,      // Total attendance records 
    presentDays,    // Days present (not absent)
    totalPayments,  // Total payment amount
    totalDihaadiUnits, // Total dihaadi work units
    formattedDihaadiUnits: formatDihaadiUnits(totalDihaadiUnits)
  };
};