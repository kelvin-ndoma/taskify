// pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../configs/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      console.log('📧 Sending password reset email to:', email);
      
      // FIXED: Use correct endpoint path
      await api.post('/api/auth/forgot-password', { email });
      
      setEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      // Don't show specific error for security, but show success anyway
      setEmailSent(true);
      toast.success('If an account with that email exists, a password reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="mx-auto h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              If an account with <strong>{email}</strong> exists, we've sent a password reset link.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              The link will expire in 1 hour.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              to="/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Back to login
            </Link>
            <button
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-zinc-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Try another email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-zinc-700 placeholder-gray-500 dark:placeholder-zinc-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-zinc-900"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </div>
              ) : (
                'Send reset link'
              )}
            </button>

            <Link
              to="/login"
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-zinc-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;