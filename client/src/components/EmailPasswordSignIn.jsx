import { useState, useEffect } from 'react';
import { useSignIn, useClerk } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2Icon, Eye, EyeOff, LogOut } from 'lucide-react';

const EmailPasswordSignIn = () => {
    const { isLoaded, signIn, setActive } = useSignIn();
    const { signOut } = useClerk();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasExistingSession, setHasExistingSession] = useState(false);
    const navigate = useNavigate();

    // Check for existing session
    useEffect(() => {
        const checkSession = async () => {
            try {
                // Try to get current session
                const currentSession = await signIn?.client?.getSession();
                if (currentSession) {
                    console.log('⚠️ Active session detected');
                    setHasExistingSession(true);
                }
            } catch (error) {
                // No active session
                setHasExistingSession(false);
            }
        };

        if (isLoaded) {
            checkSession();
        }
    }, [isLoaded, signIn]);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleResetSession = async () => {
        try {
            setLoading(true);
            await signOut();
            
            // Clear all storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear cookies
            document.cookie.split(";").forEach((c) => {
                document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            setHasExistingSession(false);
            toast.success('Session reset successfully!');
            
        } catch (error) {
            console.error('Error resetting session:', error);
            toast.error('Error resetting session');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (hasExistingSession) {
            toast.error('Please reset your session first to sign in with a different account.');
            return;
        }

        if (!isLoaded) {
            toast.error('Authentication not ready');
            return;
        }

        setLoading(true);
        try {
            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                toast.success('Signed in successfully!');
                navigate('/');
            } else {
                console.error('Sign in incomplete:', result);
                toast.error('Sign in failed. Please try again.');
            }
        } catch (err) {
            console.error('Error signing in:', err);
            const errorMessage = err.errors?.[0]?.message || 'Sign in failed';
            
            if (errorMessage.includes('not found')) {
                toast.error('No account found with this email. Please sign up first.');
                navigate('/sign-up');
            } else if (errorMessage.includes('password')) {
                toast.error('Invalid password. Please try again.');
            } else if (errorMessage.includes('signed in')) {
                toast.error('You are already signed in. Please reset your session first.');
                setHasExistingSession(true);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // Show session reset UI if user has existing session
    if (hasExistingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                            Active Session Detected
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            You're already signed in. To sign in with a different account, please reset your session first.
                        </p>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <LogOut className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                    Reset Required
                                </h3>
                                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                                    This will sign you out of all active sessions.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleResetSession}
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                Resetting Session...
                            </>
                        ) : (
                            <>
                                <LogOut className="w-4 h-4 mr-2" />
                                Reset Session & Sign Out
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                        Sign In
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Enter your credentials to access your account
                    </p>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white"
                                placeholder="Enter your email"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white pr-10"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>

                    <div className="text-center space-y-2">
                        <div>
                            <Link 
                                to="/sign-up" 
                                className="text-blue-600 hover:text-blue-500 text-sm"
                            >
                                Don't have an account? Sign up
                            </Link>
                        </div>
                        <div>
                            <Link 
                                to="/forgot-password" 
                                className="text-blue-600 hover:text-blue-500 text-sm"
                            >
                                Forgot your password?
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmailPasswordSignIn;