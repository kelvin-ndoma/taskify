import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2Icon } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';

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

    // Use ref to track initialization to prevent infinite loops
    const initializedRef = useRef(false);
    const [isInitializing, setIsInitializing] = useState(false);

    // Load theme on mount
    useEffect(() => {
        dispatch(loadTheme());
    }, [dispatch]);

    // FIXED: Initialize workspaces - SINGLE EXECUTION
    useEffect(() => {
        const initializeUserData = async () => {
            // Prevent multiple initializations
            if (initializedRef.current || !user || !clerkLoaded || isInitializing) {
                return;
            }

            // If already initialized or workspaces exist, don't re-run
            if (initialized || workspaces.length > 0) {
                initializedRef.current = true;
                return;
            }

            try {
                console.log('🔄 Starting workspace initialization...');
                setIsInitializing(true);
                initializedRef.current = true;
                
                const token = await getToken();
                
                // Ensure default workspace exists (only if no workspaces)
                if (workspaces.length === 0) {
                    console.log('🔍 Ensuring default workspace for user:', user.id);
                    const workspace = await ensureDefaultWorkspace(user.id, token);
                    if (workspace) {
                        console.log('✅ Default workspace ensured:', workspace.name);
                    } else {
                        console.warn('⚠️ Could not ensure default workspace');
                    }
                }
                
                // Fetch workspaces via Redux
                console.log('📡 Fetching workspaces...');
                await dispatch(fetchWorkspaces({ getToken })).unwrap();
                
                console.log('✅ Workspace initialization completed');

            } catch (error) {
                console.error('❌ Error initializing user data:', error);
                initializedRef.current = false; // Reset on error to allow retry
            } finally {
                setIsInitializing(false);
            }
        };

        initializeUserData();
    }, [user, clerkLoaded, dispatch, getToken, initialized, workspaces.length, isInitializing]);

    // Debug logging to track re-renders
    useEffect(() => {
        console.log('🔍 Layout render state:', {
            clerkLoaded,
            user: !!user,
            userProfile: user ? { 
                id: user.id,
                firstName: user.firstName, 
                lastName: user.lastName,
                email: user.primaryEmailAddress?.emailAddress
            } : null,
            workspacesCount: workspaces.length,
            workspaces: workspaces.map(w => ({ id: w.id, name: w.name })),
            loading,
            initialized,
            isInitializing,
            initializedRef: initializedRef.current
        });
    }, [clerkLoaded, user, workspaces, loading, initialized, isInitializing]);

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

    // 2. Still initializing or loading workspaces
    if (isInitializing || loading || !initialized) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                    {isInitializing ? 'Setting up your workspace...' : 'Loading your workspace...'}
                </span>
            </div>
        );
    }

    // 3. User authenticated but no workspaces (shouldn't happen with our fix)
    if (workspaces.length === 0) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-white dark:bg-zinc-950 p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                        <Loader2Icon className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No workspaces found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                        We couldn't find any workspaces for your account.
                    </p>
                    <button 
                        onClick={() => {
                            initializedRef.current = false;
                            dispatch(fetchWorkspaces({ getToken }));
                        }} 
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm mr-2"
                    >
                        Retry
                    </button>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    // 4. SUCCESS: User authenticated with workspaces - show main app
    console.log('🎉 SUCCESS: Rendering main app with', workspaces.length, 'workspaces');
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