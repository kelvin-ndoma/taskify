import { useState, useEffect } from 'react';
import { useSignUp, useClerk, useSession } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2Icon, Eye, EyeOff, LogOut } from 'lucide-react';

const EmailPasswordSignUp = ({ invitationToken, invitationCode }) => {
    const { isLoaded, signUp, setActive } = useSignUp();
    const { client, signOut } = useClerk();
    const { session } = useSession();
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
    const [isInvitationFlow, setIsInvitationFlow] = useState(false);
    const [hasExistingSession, setHasExistingSession] = useState(false);
    const navigate = useNavigate();

    // Check for existing session and invitation flow
    useEffect(() => {
        console.log('🔍 Session status:', { 
            hasSession: !!session, 
            isLoaded,
            invitationToken,
            invitationCode 
        });

        if (session) {
            console.log('⚠️ User already has an active session');
            setHasExistingSession(true);
        }

        if (invitationToken || invitationCode) {
            setIsInvitationFlow(true);
            console.log('🎯 Invitation flow detected:', { invitationToken, invitationCode });
        }
    }, [session, isLoaded, invitationToken, invitationCode]);

    // Pre-fill email from invitation if available
    useEffect(() => {
        const getInvitationDetails = async () => {
            if ((invitationToken || invitationCode) && client) {
                try {
                    console.log('📧 Fetching invitation details...');
                    
                    // Try to get invitation details
                    if (invitationToken) {
                        const invitation = await client.signUp.get();
                        console.log('Invitation details:', invitation);
                        
                        if (invitation.emailAddress) {
                            setFormData(prev => ({
                                ...prev,
                                email: invitation.emailAddress
                            }));
                            console.log('✅ Pre-filled email from invitation:', invitation.emailAddress);
                        }
                    }
                } catch (error) {
                    console.error('❌ Error fetching invitation details:', error);
                }
            }
        };
        
        getInvitationDetails();
    }, [invitationToken, invitationCode, client]);

    // Handle session reset
    const handleResetSession = async () => {
        try {
            setLoading(true);
            console.log('🔄 Resetting session...');
            
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

            console.log('✅ Session reset complete');
            setHasExistingSession(false);
            toast.success('Session reset. You can now sign up.');
            
        } catch (error) {
            console.error('❌ Error resetting session:', error);
            toast.error('Error resetting session. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
        
        if (hasExistingSession) {
            toast.error('Please reset your session first to create a new account.');
            return;
        }

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
            let result;

            console.log('🚀 Starting sign-up process...', {
                isInvitationFlow,
                invitationToken,
                email: formData.email
            });

            if (isInvitationFlow && invitationToken) {
                // Handle invitation acceptance flow
                console.log('🎯 Processing invitation acceptance...');
                
                result = await signUp.create({
                    emailAddress: formData.email,
                    password: formData.password,
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    strategy: 'invitation_link',
                    ticket: invitationToken,
                });
            } else {
                // Regular sign-up flow
                result = await signUp.create({
                    emailAddress: formData.email,
                    password: formData.password,
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                });
            }

            console.log('✅ Sign up result:', result);

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                
                if (isInvitationFlow) {
                    toast.success('Account created and invitation accepted!');
                } else {
                    toast.success('Account created successfully!');
                }
                
                navigate('/');
            } else if (result.status === 'missing_requirements') {
                console.log('📧 Sign up requires email verification');
                
                await signUp.prepareEmailAddressVerification({
                    strategy: 'email_code',
                });
                
                navigate('/verify-email');
                toast.success('Verification code sent to your email!');
            } else {
                console.error('❌ Sign up incomplete:', result);
                toast.error('Sign up failed. Please try again.');
            }
        } catch (err) {
            console.error('❌ Error signing up:', err);
            const errorMessage = err.errors?.[0]?.message || 'Sign up failed';
            
            if (errorMessage.includes('exists') || errorMessage.includes('already')) {
                toast.error('An account with this email already exists. Please sign in.');
                navigate('/sign-in');
            } else if (errorMessage.includes('invitation') || errorMessage.includes('ticket')) {
                toast.error('Invalid or expired invitation. Please request a new one.');
            } else if (errorMessage.includes('signed in')) {
                toast.error('You are already signed in. Please sign out first.');
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
                            Session Detected
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            You already have an active session. To create a new account, please reset your session first.
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
                                    This will sign you out of all active sessions and clear your browser data.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
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

                        <button
                            onClick={() => navigate('/sign-in')}
                            className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700"
                        >
                            Go to Sign In Instead
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                        {isInvitationFlow ? 'Accept Invitation' : 'Create Account'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {isInvitationFlow 
                            ? 'Complete your profile to join the workspace' 
                            : 'Sign up to get started with your account'
                        }
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
                                disabled={isInvitationFlow && formData.email}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="Enter your email"
                            />
                            {isInvitationFlow && formData.email && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Email is pre-filled from your invitation
                                </p>
                            )}
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
                                    {isInvitationFlow ? 'Accepting invitation...' : 'Creating account...'}
                                </>
                            ) : (
                                isInvitationFlow ? 'Accept Invitation & Create Account' : 'Create Account'
                            )}
                        </button>
                    </div>

                    {!isInvitationFlow && (
                        <div className="text-center">
                            <Link 
                                to="/sign-in" 
                                className="text-blue-600 hover:text-blue-500 text-sm"
                            >
                                Already have an account? Sign in
                            </Link>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default EmailPasswordSignUp;