# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ShramSathi is a Next.js 15 web application designed for daily wage workers and contractors in India. It's a dual-role platform where workers track attendance and payments, while contractors manage their workforce.

## Development Commands

### Core Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build production bundle with Turbopack
npm start           # Start production server
npm run lint        # Run ESLint
```

### Testing and Quality
```bash
npx next build     # Verify build works without errors
npx eslint .       # Run linting with custom configuration
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **Database**: Firebase Firestore (NoSQL)
- **State Management**: React Context API
- **Authentication**: Mock OTP system (mobile + 123456)
- **Language**: TypeScript with strict configuration

### Application Structure

**Dual-Role Architecture**: The app branches at `src/app/page.tsx` based on user role:
- Workers get `WorkerDashboard` - calendar-based attendance tracking
- Contractors get `ContractorDashboard` - workforce management view

**Authentication Flow**: 
- Uses `AuthContext` for global state management
- Stores user data in localStorage (key: `shramsathi_user`)
- Mock authentication with any 10-digit mobile + OTP "123456"

**Database Design**:
- `users` - Stores worker and contractor profiles
- `attendance` - Daily attendance records with payment tracking
- `contractor_worker_relations` - Links workers to contractors via codes

### Key Components Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main routing logic (worker vs contractor)
│   └── layout.tsx         # Root layout with AuthProvider
├── components/
│   ├── auth/              # Authentication components
│   ├── worker/            # Worker-specific UI (attendance calendar)
│   └── contractor/        # Contractor management interface
├── contexts/
│   └── AuthContext.tsx    # Global authentication state
├── lib/
│   ├── firebase.ts        # Firebase configuration
│   └── database.ts        # Firestore operations and business logic
└── types/
    └── index.ts           # TypeScript definitions for User, Attendance, etc.
```

### Data Flow Patterns

**Contractor-Worker Relationship**:
1. Contractor gets auto-generated `contractorCode` (6-char alphanumeric)
2. Worker enters this code to establish relationship
3. Creates entry in `contractor_worker_relations` collection
4. Enables contractor to view worker's attendance (read-only)

**Attendance System**:
- Uses calendar interface for date selection
- Supports attendance types: `A` (absent), `1/2P`, `P` (present), `P1/2`, `2P`
- Optional payment amounts per day
- Real-time updates via Firestore

## Development Guidelines

### Firebase Configuration
Before development, update `src/lib/firebase.ts` with actual Firebase config:
```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};
```

### TypeScript Patterns
- All components use strict TypeScript
- Import paths use `@/*` alias pointing to `src/*`
- Firestore timestamps are converted to JavaScript Date objects in database operations

### State Management
- User authentication state managed via React Context
- Local state for UI components (calendar, forms)
- No external state management library (Redux, Zustand)

### Styling Conventions
- Tailwind CSS with custom configuration
- Gradient backgrounds (`from-blue-50 to-indigo-100` pattern)
- Responsive design not heavily emphasized (mobile-first target users)

### Database Operations
All database functions are centralized in `src/lib/database.ts`:
- User CRUD: `createUser()`, `getUserByMobile()`, `getUserById()`
- Relationships: `assignWorkerToContractor()`, `getWorkersByContractor()`
- Attendance: `saveAttendance()`, `getAttendanceByUser()`
- Contractor code generation: `generateContractorCode()`

## Important Notes

### Mock Authentication
The app uses demo authentication (OTP: "123456" for any mobile number). This is suitable for development but needs replacement for production.

### Firebase Demo Mode
Current Firebase configuration uses demo values. The app will not persist data until proper Firebase setup is completed.

### Future Architecture Considerations
The README mentions planned features (multi-language, offline support, mobile app) that may require architectural changes to the current web-only implementation.