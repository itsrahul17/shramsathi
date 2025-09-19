# ShramSathi - Your Work Companion

ShramSathi is a digital platform designed specifically for daily wage workers and contractors in India. It helps workers track their attendance and payments while allowing contractors to manage and monitor their workforce.

## Features

### For Workers:
- ✅ Simple mobile number + OTP authentication
- ✅ Interactive calendar to mark daily attendance
- ✅ Support for multiple attendance types (A, 1/2P, P, P1/2, 2P)
- ✅ Payment tracking for each day
- ✅ Monthly statistics and earnings overview
- ✅ Connect to contractors using contractor codes

### For Contractors:
- ✅ Manage multiple workers
- ✅ View worker attendance calendars (read-only)
- ✅ Track worker payments and performance
- ✅ Generate and share contractor codes
- ✅ Monthly statistics for each worker

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Firebase:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database
   - Get your Firebase configuration
   - Update `src/lib/firebase.ts` with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Demo Authentication
The app uses mock OTP for demo purposes:
- Use any 10-digit mobile number
- Enter OTP: `123456`

### Worker Flow:
1. Sign up with mobile number and OTP
2. Select "Worker" role
3. Complete profile (name, skill)
4. Mark daily attendance on calendar
5. Add payment amounts (optional)
6. Connect to contractor using contractor code

### Contractor Flow:
1. Sign up with mobile number and OTP
2. Select "Contractor" role  
3. Complete profile (name, company)
4. Share your contractor code with workers
5. View worker attendance and payments

## Project Structure

```
src/
├── app/                 # Next.js 13+ app directory
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── worker/         # Worker dashboard components  
│   └── contractor/     # Contractor dashboard components
├── contexts/           # React contexts (Auth)
├── lib/               # Utility functions and configs
│   ├── firebase.ts    # Firebase configuration
│   └── database.ts    # Database operations
└── types/             # TypeScript type definitions
```

## Database Structure

### Collections:
- `users` - User profiles (workers and contractors)
- `attendance` - Daily attendance records
- `contractor_worker_relations` - Worker-contractor assignments

### Key Features:
- Real-time updates using Firestore
- Automatic contractor code generation
- Attendance history tracking
- Payment record management

## Future Enhancements

- [ ] Multi-language support (Hindi, regional languages)
- [ ] SMS/WhatsApp notifications
- [ ] Offline support
- [ ] Payment integration
- [ ] Advanced reporting and analytics
- [ ] Mobile app (React Native)
- [ ] Geolocation-based attendance

---

**ShramSathi** - Empowering daily wage workers and contractors with digital tools.
