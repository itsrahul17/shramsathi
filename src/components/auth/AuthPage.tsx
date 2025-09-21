'use client';

import React, { useState } from 'react';
import { Phone, ArrowRight, User, Building, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserByMobile, createUser, authenticateUser, updateUserPassword } from '@/lib/database';
import { UserRole } from '@/types';
import { trackUserRegistration, trackUserLogin } from '@/lib/analytics';

interface AuthPageProps {
  onSuccess: () => void;
}

type AuthStep = 'mobile' | 'password' | 'role' | 'profile';

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [step, setStep] = useState<AuthStep>('mobile');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isPasswordMigration, setIsPasswordMigration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile form states
  const [name, setName] = useState('');
  const [skill, setSkill] = useState('');
  const [companyName, setCompanyName] = useState('');

  const { setUser } = useAuth();

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if user exists
      const existingUser = await getUserByMobile(mobile);
      if (existingUser) {
        setIsNewUser(false);
        // Check if existing user has password (migration needed)
        if (!existingUser.password) {
          setIsPasswordMigration(true);
        } else {
          setIsPasswordMigration(false);
        }
      } else {
        setIsNewUser(true);
        setIsPasswordMigration(false);
      }
      setStep('password');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password length (4-6 digits)
    if (password.length < 4 || password.length > 6 || !/^\d+$/.test(password)) {
      setError('Password must be 4-6 digits only');
      return;
    }

    if (isNewUser || isPasswordMigration) {
      // For new users or existing users setting password, check password confirmation
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      if (isPasswordMigration) {
        // Update existing user's password and login
        await updateExistingUserPassword();
      } else {
        // New user - continue to role selection
        setStep('role');
      }
    } else {
      // Login existing user with password
      await loginExistingUserWithPassword();
    }
  };

  const updateExistingUserPassword = async () => {
    setLoading(true);
    try {
      // Get existing user data
      const existingUser = await getUserByMobile(mobile);
      if (!existingUser) {
        setError('User not found');
        return;
      }

      // Update user with password
      const updatedUserData = {
        ...existingUser,
        password // Add password to existing user
      };
      
      // Update in database (we'll need to add this function)
      await updateUserPassword(existingUser.id, password);
      
      // Track user login
      trackUserLogin(existingUser.role, existingUser.id);
      setUser(updatedUserData);
      onSuccess();
    } catch (error) {
      console.error('Password update error:', error);
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginExistingUserWithPassword = async () => {
    setLoading(true);
    try {
      const user = await authenticateUser(mobile, password);
      if (user) {
        // Track user login
        trackUserLogin(user.role, user.id);
        setUser(user);
        onSuccess();
      } else {
        setError('Invalid mobile number or password');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = (role: UserRole) => {
    setSelectedRole(role);
    setStep('profile');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Profile form submitted');
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (selectedRole === 'worker' && !skill.trim()) {
      setError('Please select your skill');
      return;
    }

    if (selectedRole === 'contractor' && !companyName.trim()) {
      setError('Please enter your company name');
      return;
    }

    setLoading(true);
    setError('');
    console.log('Starting profile creation with data:', { mobile, name: name.trim(), role: selectedRole });

    try {
      const userData = {
        mobile,
        name: name.trim(),
        role: selectedRole!,
        password, // Include the password for new users
        ...(selectedRole === 'worker' && { skill: skill.trim() }),
        ...(selectedRole === 'contractor' && { companyName: companyName.trim() })
      };

      console.log('Calling createUser with:', userData);
      const userId = await createUser(userData);
      console.log('createUser returned userId:', userId);
      
      const newUser = { ...userData, id: userId, createdAt: new Date() };
      console.log('Setting user and calling onSuccess with:', newUser);
      
      // Track user registration
      trackUserRegistration(selectedRole!, userId);
      
      setUser(newUser);
      onSuccess();
    } catch (error) {
      console.error('Profile creation error:', error);
      setError(`Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const skills = [
    'Painter', 'Carpenter', 'Mason', 'Electrician', 'Plumber', 
    'Welder', 'Driver', 'Cleaner', 'Guard', 'Helper', 'Other'
  ];

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ShramSathi</h1>
          <p className="text-gray-600">Your work companion</p>
        </div>

        {step === 'mobile' && (
          <form onSubmit={handleMobileSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                />
              </div>
            </div>
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <button
              type="submit"
              disabled={loading || mobile.length !== 10}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Checking...' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 text-center">
              {isPasswordMigration ? 'Set Up Your Password' : (isNewUser ? 'Set Your Password' : 'Enter Your Password')}
            </h2>
            
            {isPasswordMigration && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-800 text-sm text-center">
                  🔒 For enhanced security, please set up a password for your account
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(isNewUser || isPasswordMigration) ? 'Create Password (4-6 digits)' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl tracking-widest"
                  placeholder={(isNewUser || isPasswordMigration) ? 'Set 4-6 digit password' : 'Enter your password'}
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {(isNewUser || isPasswordMigration) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl tracking-widest"
                    placeholder="Confirm your password"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <button
              type="submit"
              disabled={loading || password.length < 4 || ((isNewUser || isPasswordMigration) && confirmPassword.length < 4)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 
                (isPasswordMigration ? 'Updating account...' : (isNewUser ? 'Setting up...' : 'Signing in...')) : 
                (isPasswordMigration ? 'Set Password & Continue' : (isNewUser ? 'Continue' : 'Sign In'))}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('mobile');
                setPassword('');
                setConfirmPassword('');
                setError('');
                setIsPasswordMigration(false);
                setIsNewUser(false);
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              className="w-full text-gray-600 py-2 text-sm"
            >
              Change mobile number
            </button>
          </form>
        )}

        {step === 'role' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 text-center">
              Select Your Role
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleRoleSelection('worker')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center gap-4"
              >
                <User className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-800">Worker</h3>
                  <p className="text-sm text-gray-600">Mark attendance and track payments</p>
                </div>
              </button>
              
              <button
                onClick={() => handleRoleSelection('contractor')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center gap-4"
              >
                <Building className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-800">Contractor</h3>
                  <p className="text-sm text-gray-600">Manage workers and view records</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 text-center">
              Complete Your Profile
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            {selectedRole === 'worker' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skill/Trade
                </label>
                <select
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select your skill</option>
                  {skills.map(skillOption => (
                    <option key={skillOption} value={skillOption}>
                      {skillOption}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedRole === 'contractor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company/Business Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter company name"
                />
              </div>
            )}
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}