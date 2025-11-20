import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet, useNavigate } from 'react-router-dom' // Add useNavigate
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { fetchWorkspaces } from '../features/workspaceSlice'
import { Loader2Icon } from 'lucide-react'
import { useUser, useAuth, SignIn } from '@clerk/clerk-react' // Add SignIn back

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading, initialized, workspaces, currentWorkspace } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()
    const navigate = useNavigate() // Add navigate

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

    // Redirect to sign-in if user signs out
    useEffect(() => {
        if (isLoaded && !user) {
            console.log('🚪 User signed out, redirecting to sign-in')
            navigate('/sign-in')
        }
    }, [user, isLoaded, navigate])

    // Debug log
    useEffect(() => {
        if (initialized && !loading && user) {
            console.log('✅ Layout: Rendering main layout -', { 
                workspacesCount: workspaces?.length,
                currentWorkspace: currentWorkspace?.name 
            })
        }
    }, [initialized, loading, workspaces, currentWorkspace, user])

    // Show sign-in if no user (this handles the case where navigate hasn't happened yet)
    if(!user){
        return(
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'>
                <SignIn />
            </div>
        )
    }

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