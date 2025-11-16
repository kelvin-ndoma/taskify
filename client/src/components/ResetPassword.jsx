import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2Icon, CheckCircleIcon } from 'lucide-react';

const ResetPassword = () => {
    const { isLoaded, signIn, setActive } = useSignIn();
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordReset, setPasswordReset] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        if (!isLoaded) {
            toast.error('Authentication not ready');
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
                setPasswordReset(true);
                toast.success('Password reset successfully!');
                setTimeout(() => navigate('/'), 2000);
            } else {
                console.error('Password reset incomplete:', result);
                toast.error('Password reset failed. Please try again.');
            }
        } catch (err) {
            console.error('Error resetting password:', err);
            const errorMessage = err.errors?.[0]?.message || 'Failed to reset password';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (passwordReset) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
                <div className="max-w-md w-full space-y-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                        <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Password Reset Successfully!
                    </h2>
                    
                    <p className="text-gray-600 dark:text-gray-400">
                        Your password has been updated successfully. Redirecting you to the dashboard...
                    </p>
                    
                    <Link 
                        to="/sign-in" 
                        className="inline-block text-blue-600 hover:text-blue-500 text-sm"
                    >
                        Go to Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                        Set New Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Enter the code from your email and your new password
                    </p>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                                placeholder="Enter the code from your email"
                            />
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                New Password
                            </label>
                            <input
                                id="newPassword"
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white"
                                placeholder="Enter new password (min. 8 characters)"
                                minLength={8}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white"
                                placeholder="Confirm new password"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !code || !newPassword || !confirmPassword}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                    Resetting Password...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link 
                            to="/sign-in" 
                            className="text-blue-600 hover:text-blue-500 text-sm"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;