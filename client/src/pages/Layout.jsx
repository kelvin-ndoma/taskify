import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { fetchWorkspaces } from '../features/workspaceSlice'
import { Loader2Icon } from 'lucide-react'
import { useUser, useAuth } from '@clerk/clerk-react'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading, initialized, workspaces, currentWorkspace } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    // Load workspaces when user is available
    useEffect(() => {
        if (user && isLoaded && getToken) {
            console.log('🔄 Layout: Dispatching fetchWorkspaces for user:', user.id)
            dispatch(fetchWorkspaces({ getToken }))
        }
    }, [user, isLoaded, getToken, dispatch])

    // Debug log
    useEffect(() => {
        if (initialized && !loading) {
            console.log('✅ Layout: Rendering main layout -', { 
                workspacesCount: workspaces?.length,
                currentWorkspace: currentWorkspace?.name 
            })
        }
    }, [initialized, loading, workspaces, currentWorkspace])

    // REMOVED: The authentication check - this is now handled by routes

    // Show loading only if not initialized OR still loading
    if (!initialized || loading) {
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