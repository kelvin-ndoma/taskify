// pages/ResetPassword.jsx - Enhanced with better password visibility
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle, Check, X } from 'lucide-react'; // Added icons
import api from '../configs/api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Password strength checker
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  useEffect(() => {
    console.log('🔗 Reset password link params:', { token, email });
    
    if (!token || !email) {
      console.error('❌ Missing token or email in reset link');
      setIsValidLink(false);
      toast.error('Invalid or expired reset link');
      return;
    }

    if (!email.includes('@')) {
      setIsValidLink(false);
      toast.error('Invalid email in reset link');
      return;
    }

    setIsValidLink(true);
  }, [token, email, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update password strength when password changes
    if (name === 'newPassword') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isValidLink) {
      toast.error('Invalid reset link. Please request a new one.');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Resetting password for:', email);
      
      await api.post('/api/auth/reset-password', {
        token,
        email,
        newPassword: formData.newPassword,
      });

      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error) {
      console.error('❌ Reset password error:', error);
      const errorMessage = error.response?.data?.message || 'Password reset failed. The link may have expired.';
      toast.error(errorMessage);
      
      if (error.response?.status === 400) {
        setIsValidLink(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordRequirements = [
    { text: 'At least 6 characters', met: formData.newPassword.length >= 6 },
    { text: 'At least 8 characters', met: formData.newPassword.length >= 8 },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(formData.newPassword) },
    { text: 'Contains number', met: /[0-9]/.test(formData.newPassword) },
    { text: 'Contains special character', met: /[^A-Za-z0-9]/.test(formData.newPassword) },
  ];

  // ... (keep the invalid link and success states the same as before)

  if (!isValidLink) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="mx-auto h-12 w-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This password reset link is invalid or has expired.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Please request a new password reset link.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              to="/forgot-password"
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Request New Reset Link
            </Link>
            <Link
              to="/login"
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-zinc-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="mx-auto h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Password reset!
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Your password has been successfully reset.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              You can now login with your new password.
            </p>
          </div>
          <Link
            to="/login"
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Set new password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your new password for <strong>{email}</strong>
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            Choose a strong password you haven't used before.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-zinc-700 placeholder-gray-500 dark:placeholder-zinc-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-zinc-900"
                  placeholder="Enter new password (min. 6 characters)"
                  minLength="6"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength <= 1 ? 'bg-red-500' :
                          passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {passwordStrength <= 1 ? 'Weak' : passwordStrength <= 3 ? 'Medium' : 'Strong'}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center text-xs">
                        {req.met ? (
                          <Check className="h-3 w-3 text-green-500 mr-2" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400 mr-2" />
                        )}
                        <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-zinc-700 placeholder-gray-500 dark:placeholder-zinc-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-zinc-900"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
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
                  Resetting password...
                </div>
              ) : (
                'Reset password'
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

export default ResetPassword;