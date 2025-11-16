import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2Icon, Eye, EyeOff } from 'lucide-react';

const ForgotPassword = () => {
    const { isLoaded, signIn, setActive } = useSignIn();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [step, setStep] = useState(1); // 1: enter email, 2: enter code & new password
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const toggleNewPasswordVisibility = () => {
        setShowNewPassword(!showNewPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    // Step 1: Request reset code
    const handleRequestCode = async (e) => {
        e.preventDefault();
        if (!isLoaded) return;

        setLoading(true);
        try {
            await signIn.create({
                strategy: 'reset_password_email_code',
                identifier: email,
            });
            setStep(2);
            toast.success('Reset code sent to your email!');
        } catch (err) {
            console.error('Error sending reset code:', err);
            toast.error(err.errors?.[0]?.message || 'Failed to send reset code');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Reset password with code
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!isLoaded) return;

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        try {
            const result = await signIn.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code,
                password: newPassword,
            });

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                toast.success('Password reset successfully!');
                navigate('/');
            }
        } catch (err) {
            console.error('Error resetting password:', err);
            toast.error(err.errors?.[0]?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                        Reset Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {step === 1 
                            ? "Enter your email to receive a reset code" 
                            : "Enter the code from your email and new password"
                        }
                    </p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleRequestCode} className="space-y-6">
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

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Send Reset Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Reset Code
                                </label>
                                <input
                                    id="code"
                                    type="text"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white"
                                    placeholder="Enter the 6-digit code"
                                />
                            </div>

                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="newPassword"
                                        type={showNewPassword ? "text" : "password"}
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white pr-10"
                                        placeholder="Enter new password (min. 8 characters)"
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={toggleNewPasswordVisibility}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white pr-10"
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={toggleConfirmPasswordVisibility}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                        Passwords do not match
                                    </p>
                                )}
                                {confirmPassword && newPassword === confirmPassword && (
                                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                                        Passwords match
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !code || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700"
                        >
                            Back to Email
                        </button>
                    </form>
                )}

                <div className="text-center">
                    <Link to="/sign-in" className="text-blue-600 hover:text-blue-500 text-sm">
                        Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;