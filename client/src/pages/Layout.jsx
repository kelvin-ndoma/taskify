// Layout.jsx
import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { fetchWorkspaces } from '../features/workspaceSlice'
import { Loader2Icon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [workspacesLoaded, setWorkspacesLoaded] = useState(false)
    const { loading, initialized, workspaces, currentWorkspace } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, loading: authLoading, getToken, logout } = useAuth() // Use custom auth
    const navigate = useNavigate()

    // Initial load of theme - only once
    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    // Load workspaces only once when user is available
    useEffect(() => {
        const loadWorkspaces = async () => {
            if (user && !authLoading && getToken && !workspacesLoaded) {
                try {
                    console.log('🔄 Layout: Dispatching fetchWorkspaces for user:', user.id)
                    await dispatch(fetchWorkspaces({ getToken })).unwrap()
                    setWorkspacesLoaded(true)
                    console.log('✅ Workspaces loaded successfully')
                } catch (error) {
                    console.error('❌ Failed to load workspaces:', error)
                    // If unauthorized, logout
                    if (error.response?.status === 401) {
                        logout()
                    }
                }
            }
        }

        loadWorkspaces()
    }, [user, authLoading, workspacesLoaded, dispatch, getToken, logout])

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            console.log('🚪 User not authenticated, redirecting to login')
            navigate('/login')
        }
    }, [user, authLoading, navigate])

    // Debug log - only log when actually relevant changes happen
    useEffect(() => {
        if (initialized && !loading && user) {
            console.log('✅ Layout: Main layout ready -', { 
                workspacesCount: workspaces?.length,
                currentWorkspace: currentWorkspace?.name 
            })
        }
    }, [initialized, loading, workspaces?.length, currentWorkspace?.name, user])

    // Reset workspacesLoaded when user changes
    useEffect(() => {
        if (user) {
            setWorkspacesLoaded(false)
        }
    }, [user?.id])

    // Show loading while checking authentication
    if (authLoading) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Loading...
                </span>
            </div>
        )
    }

    if (!user) {
        return (
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'>
                <div className='text-center'>
                    <Loader2Icon className="size-8 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
                </div>
            </div>
        )
    }

    // Show loading only if not initialized OR still loading AND we have a user
    if ((!initialized || loading) && user) {
        console.log('⏳ Layout: Showing loader -', { loading, initialized })
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Loading workspace...
                </span>
            </div>
        )
    }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout