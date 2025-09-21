export type UserRole = 'worker' | 'contractor';

export type AttendanceType = 'A' | '1/2P' | 'P' | 'P1/2' | '2P';

export interface User {
  id: string;
  mobile: string;
  name: string;
  role: UserRole;
  password?: string; // 4-6 digit password for authentication
  createdAt: Date;
  // Worker specific fields
  skill?: string;
  contractorCode?: string;
  // Contractor specific fields
  companyName?: string;
  contractorId?: string; // Auto-generated unique code
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  attendanceType: AttendanceType;
  paymentAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractorWorkerRelation {
  id: string;
  contractorId: string;
  workerId: string;
  contractorCode: string;
  createdAt: Date;
}

export interface DashboardStats {
  totalDays: number;
  presentDays: number;
  totalPayments: number;
  pendingPayments: number;
}