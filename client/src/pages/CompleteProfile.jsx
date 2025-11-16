import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2Icon } from 'lucide-react';

const CompleteProfile = () => {
    const { user, isLoaded } = useUser();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: ''
    });
    const [loading, setLoading] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(true);

    // Check if profile is already complete
    useEffect(() => {
        if (isLoaded && user) {
            const hasCompleteProfile = user.firstName && user.lastName;
            
            if (hasCompleteProfile) {
                console.log('✅ Profile already complete, redirecting to dashboard');
                navigate('/');
            } else {
                setFormData({
                    firstName: user.firstName || '',
                    lastName: user.lastName || ''
                });
                setCheckingProfile(false);
            }
        }
    }, [user, isLoaded, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            await user.update({
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim()
            });
            
            toast.success('Profile updated successfully!');
            navigate('/');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(error.errors[0]?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    // Show loading while checking profile
    if (checkingProfile || !isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Checking your profile...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                        Complete Your Profile
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Please provide your name to continue using the app
                    </p>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                First Name
                            </label>
                            <input
                                id="firstName"
                                name="firstName"
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white"
                                placeholder="Enter your first name"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Last Name
                            </label>
                            <input
                                id="lastName"
                                name="lastName"
                                type="text"
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-white"
                                placeholder="Enter your last name"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !formData.firstName.trim() || !formData.lastName.trim()}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Complete Profile'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfile;