import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom'; // Add useNavigate
import { useDispatch, useSelector } from 'react-redux';
import { Loader2Icon } from 'lucide-react';
import { useUser, SignIn, useAuth } from '@clerk/clerk-react';

import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { loadTheme } from '../features/themeSlice';
import { fetchWorkspaces } from '../features/workspaceSlice';
import { ensureDefaultWorkspace } from '../utils/workspaceUtils';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { loading, workspaces, initialized } = useSelector((state) => state.workspace);
    const dispatch = useDispatch();
    const { user, isLoaded: clerkLoaded } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate(); // Add navigate

    // 🆕 Use ref to track initialization to prevent infinite loops
    const initializedRef = useRef(false);

    // Load theme on mount
    useEffect(() => {
        dispatch(loadTheme());
    }, [dispatch]);

    // 🆕 Redirect to sign-up if user needs to complete profile
    useEffect(() => {
        if (user && clerkLoaded) {
            // Check if user has incomplete profile (generic name)
            const hasGenericName = user.firstName === null || 
                                 user.lastName === null || 
                                 !user.firstName || 
                                 !user.lastName;
            
            if (hasGenericName) {
                console.log('🔄 User needs to complete profile, redirecting to sign-up');
                navigate('/sign-up');
            }
        }
    }, [user, clerkLoaded, navigate]);

    // 🆕 FIXED: Initialize workspaces - SINGLE EXECUTION
    useEffect(() => {
        const initializeUserData = async () => {
            // Prevent multiple initializations
            if (initializedRef.current || !user || !clerkLoaded) {
                return;
            }

            // If already initialized or workspaces exist, don't re-run
            if (initialized || workspaces.length > 0) {
                initializedRef.current = true;
                return;
            }

            try {
                console.log('🔄 Starting workspace initialization...');
                initializedRef.current = true; // Mark as initializing
                
                const token = await getToken();
                
                // Ensure default workspace exists (only if no workspaces)
                if (workspaces.length === 0) {
                    await ensureDefaultWorkspace(user.id, token);
                }
                
                // Fetch workspaces via Redux
                dispatch(fetchWorkspaces({ getToken }));
                
                console.log('✅ Workspace initialization completed');

            } catch (error) {
                console.error('❌ Error initializing user data:', error);
                initializedRef.current = false; // Reset on error to allow retry
            }
        };

        initializeUserData();
    }, [user, clerkLoaded, dispatch, getToken, initialized, workspaces.length]);

    // 🆕 Debug logging to track re-renders
    useEffect(() => {
        console.log('🔍 Layout render state:', {
            clerkLoaded,
            user: !!user,
            workspacesCount: workspaces.length,
            loading,
            initialized,
            initializedRef: initializedRef.current
        });
    }, [clerkLoaded, user, workspaces.length, loading, initialized]);

    // ========== RENDER LOGIC ==========

    // 1. Clerk still loading authentication state
    if (!clerkLoaded) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading authentication...</span>
            </div>
        );
    }

    // 2. User not authenticated - show sign in
    if (!user) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-white dark:bg-zinc-950 p-4">
                <SignIn 
                    routing="path"
                    path="/sign-in"
                    signUpUrl="/sign-up" // Redirect to our custom sign-up
                />
            </div>
        );
    }

    // 3. Workspace data still initializing - show loading
    if (loading || !initialized) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading your workspace...</span>
            </div>
        );
    }

    // 4. User authenticated but no workspaces (shouldn't happen with default workspace)
    if (workspaces.length === 0) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-white dark:bg-zinc-950 p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                        <Loader2Icon className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Setting up your workspace
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        This should only take a moment. If this persists, please refresh the page.
                    </p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    // 5. SUCCESS: User authenticated with workspaces - show main app
    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;