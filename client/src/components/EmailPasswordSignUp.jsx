import { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2Icon, Eye, EyeOff } from 'lucide-react';

const EmailPasswordSignUp = () => {
    const { isLoaded, signUp, setActive } = useSignUp();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            toast.error('Please enter your first and last name');
            return;
        }

        if (!isLoaded) {
            toast.error('Authentication not ready');
            return;
        }

        setLoading(true);
        try {
            const result = await signUp.create({
                emailAddress: formData.email,
                password: formData.password,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
            });

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                toast.success('Account created successfully!');
                navigate('/');
            } else {
                console.error('Sign up incomplete:', result);
                toast.error('Sign up failed. Please try again.');
            }
        } catch (err) {
            console.error('Error signing up:', err);
            const errorMessage = err.errors?.[0]?.message || 'Sign up failed';
            
            if (errorMessage.includes('exists')) {
                toast.error('An account with this email already exists. Please sign in.');
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                        Create Account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Sign up to get started with your account
                    </p>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    First Name *
                                </label>
                                <input
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    required
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white"
                                    placeholder="First name"
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Last Name *
                                </label>
                                <input
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    required
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white"
                                    placeholder="Last name"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email Address *
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white"
                                placeholder="Enter your email"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Password *
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white pr-10"
                                    placeholder="Enter your password (min. 8 characters)"
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Must be at least 8 characters long
                            </p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white pr-10"
                                    placeholder="Confirm your password"
                                />
                                <button
                                    type="button"
                                    onClick={toggleConfirmPasswordVisibility}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                    Passwords do not match
                                </p>
                            )}
                            {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                                    Passwords match
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !formData.email || !formData.password || !formData.confirmPassword || !formData.firstName || !formData.lastName || formData.password !== formData.confirmPassword}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link 
                            to="/sign-in" 
                            className="text-blue-600 hover:text-blue-500 text-sm"
                        >
                            Already have an account? Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmailPasswordSignUp;