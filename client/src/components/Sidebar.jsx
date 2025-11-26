import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import MyTasksSidebar from './MyTasksSidebar'
import ProjectSidebar from './ProjectsSidebar'
import WorkspaceDropdown from './WorkspaceDropdown'
import { FolderOpenIcon, LayoutDashboardIcon, SettingsIcon, UsersIcon, HomeIcon, Loader2Icon } from 'lucide-react'
import { useAuth } from '../context/AuthContext' // Fixed import path (should be contexts, not context)
import { useSelector } from 'react-redux'

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const { user, logout } = useAuth()
    const location = useLocation()
    const { currentWorkspace, loading, initialized } = useSelector(state => state.workspace)

    const menuItems = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboardIcon },
        { name: 'Projects', href: '/projects', icon: FolderOpenIcon },
        { name: 'Team', href: '/team', icon: UsersIcon },
    ]

    const sidebarRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setIsSidebarOpen]);

    // Close sidebar on route change on mobile
    useEffect(() => {
        if (window.innerWidth < 640) {
            setIsSidebarOpen(false)
        }
    }, [location.pathname, setIsSidebarOpen])

    // Handle settings click
    const handleSettingsClick = () => {
        console.log('Settings clicked - implement your settings modal here');
        if (window.innerWidth < 640) {
            setIsSidebarOpen(false);
        }
    }

    // Safe image URL handler
    const getSafeImageUrl = (imageUrl) => {
        if (!imageUrl || imageUrl.trim() === "" || imageUrl === "null") {
            return null;
        }
        return imageUrl;
    };

    // User avatar component
    const UserAvatar = ({ user, size = "md" }) => {
        const safeImage = getSafeImageUrl(user?.image);
        
        const sizeClasses = {
            sm: "w-6 h-6 text-xs",
            md: "w-8 h-8 text-sm",
            lg: "w-10 h-10 text-base",
            xl: "w-12 h-12 text-lg"
        };
        
        const sizeClass = sizeClasses[size] || sizeClasses.md;
        
        if (safeImage) {
            return (
                <img
                    src={safeImage}
                    alt={user?.name || "User"}
                    className={`${sizeClass} rounded-full bg-gray-200 dark:bg-zinc-800 object-cover`}
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            );
        }
        
        const initials = user?.name?.charAt(0)?.toUpperCase() || "U";
        return (
            <div className={`${sizeClass} rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-medium`}>
                {initials}
            </div>
        );
    };

    // 🆕 Show loading state if workspace data isn't ready
    if (loading || !initialized) {
        return (
            <div className={`z-20 bg-white dark:bg-zinc-900 w-68 flex flex-col h-screen border-r border-gray-200 dark:border-zinc-800 max-sm:fixed transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0 sm:static`}>
                <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center justify-center py-8">
                        <Loader2Icon className="size-6 text-blue-500 animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={sidebarRef} 
            className={`z-20 bg-white dark:bg-zinc-900 w-68 flex flex-col h-screen border-r border-gray-200 dark:border-zinc-800 max-sm:fixed transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0 sm:static`}
        >
            {/* Workspace Header */}
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
                <WorkspaceDropdown />
            </div>

            {/* User Welcome */}
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="md" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user?.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {currentWorkspace?.name || 'Workspace'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="p-4 space-y-1">
                    {menuItems.map((item) => (
                        <NavLink 
                            to={item.href} 
                            key={item.name} 
                            className={({ isActive }) => 
                                `flex items-center gap-3 py-2 px-3 text-gray-700 dark:text-zinc-200 cursor-pointer rounded-lg transition-all ${
                                    isActive 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                                        : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'
                                }`
                            }
                        >
                            <item.icon size={18} />
                            <p className='text-sm font-medium'>{item.name}</p>
                        </NavLink>
                    ))}
                </div>

                {/* My Tasks Section */}
                <div className="px-4 py-2">
                    <MyTasksSidebar />
                </div>

                {/* Projects Section */}
                <div className="px-4 py-2 flex-1">
                    <ProjectSidebar />
                </div>
            </div>

            {/* Footer/Settings */}
            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 space-y-2">
              
                
                {/* Logout button */}
                <button 
                    onClick={logout} 
                    className='flex w-full items-center gap-3 py-2 px-3 text-red-600 dark:text-red-400 cursor-pointer rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all'
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <p className='text-sm font-medium'>Logout</p>
                </button>
            </div>
        </div>
    )
}

export default Sidebar