// components/CustomSignUp.jsx
import { useState, useRef, useEffect } from 'react';
import { useSignUp, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { User, Upload, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomSignUp = () => {
  const { isLoaded, signUp } = useSignUp();
  const { user } = useUser(); // Check if user exists (for profile completion)
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isProfileCompletion, setIsProfileCompletion] = useState(false);

  // Check if this is for profile completion or new sign-up
  useEffect(() => {
    if (user) {
      setIsProfileCompletion(true);
      // Pre-fill email if user exists
      setFormData(prev => ({
        ...prev,
        email: user.primaryEmailAddress?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      }));
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setImageFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isLoaded && !isProfileCompletion) {
      toast.error('Sign up service not ready');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isProfileCompletion && !formData.password) {
      toast.error('Password is required');
      return;
    }

    if (!isProfileCompletion && formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      if (isProfileCompletion) {
        // Update existing user profile
        await user.update({
          firstName: formData.firstName,
          lastName: formData.lastName,
        });

        // Update image if selected
        if (imageFile) {
          await user.setProfileImage({ file: imageFile });
        }

        toast.success('Profile updated successfully!');
        navigate('/'); // Go to main app
      } else {
        // New sign-up
        await signUp.create({
          emailAddress: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });

        // Upload image if selected
        if (imageFile) {
          await signUp.setProfileImage({ file: imageFile });
        }

        // Prepare email verification
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        navigate('/verify-email');
      }
      
    } catch (err) {
      console.error('Error:', err);
      toast.error(err.errors?.[0]?.message || 
        (isProfileCompletion ? 'Profile update failed' : 'Sign up failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToApp = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center">
          {isProfileCompletion && (
            <button
              onClick={handleBackToApp}
              className="absolute left-4 top-4 p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <h2 className="mt-6 text-3xl font-bold text-zinc-900 dark:text-white">
            {isProfileCompletion ? 'Complete Your Profile' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {isProfileCompletion 
              ? 'Add your name and photo to personalize your account' 
              : 'Join us and start managing your projects'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <div className="relative">
              <div 
                className="w-24 h-24 rounded-full bg-gray-200 dark:bg-zinc-700 border-4 border-white dark:border-zinc-800 shadow-lg cursor-pointer group relative overflow-hidden"
                onClick={triggerFileInput}
              >
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : user?.imageUrl ? (
                  <img 
                    src={user.imageUrl} 
                    alt="Current profile" 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                {/* Upload overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
              
              <button
                type="button"
                onClick={triggerFileInput}
                className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                First Name *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleInputChange}
                className="relative block w-full px-3 py-3 border border-zinc-300 dark:border-zinc-600 placeholder-zinc-500 dark:placeholder-zinc-400 text-zinc-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 text-sm transition-colors"
                placeholder="John"
              />
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Last Name *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                className="relative block w-full px-3 py-3 border border-zinc-300 dark:border-zinc-600 placeholder-zinc-500 dark:placeholder-zinc-400 text-zinc-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 text-sm transition-colors"
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Email Address *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              disabled={isProfileCompletion} // Disable for profile completion
              className="relative block w-full px-3 py-3 border border-zinc-300 dark:border-zinc-600 placeholder-zinc-500 dark:placeholder-zinc-400 text-zinc-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="john@example.com"
            />
          </div>

          {/* Password Field - Only for new sign-ups */}
          {!isProfileCompletion && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="relative block w-full px-3 py-3 pr-10 border border-zinc-300 dark:border-zinc-600 placeholder-zinc-500 dark:placeholder-zinc-400 text-zinc-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 text-sm transition-colors"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Must be at least 8 characters long
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isProfileCompletion ? 'Updating profile...' : 'Creating account...'}
                </div>
              ) : (
                isProfileCompletion ? 'Complete Profile' : 'Create Account'
              )}
            </button>
          </div>

          {/* Sign In Link - Only for new sign-ups */}
          {!isProfileCompletion && (
            <div className="text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Already have an account?{' '}
                <a
                  href="/sign-in"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Sign in
                </a>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CustomSignUp;