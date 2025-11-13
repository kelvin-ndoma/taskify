import { SearchIcon, PanelLeft, BellIcon } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleTheme } from '../features/themeSlice'
import { MoonIcon, SunIcon } from 'lucide-react'
import { UserButton, useUser } from '@clerk/clerk-react'

const Navbar = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const dispatch = useDispatch();
    const { user } = useUser();
    const { theme } = useSelector(state => state.theme);
    const { currentWorkspace } = useSelector(state => state.workspace);

    const handleSearch = (e) => {
        // Implement search functionality
        console.log('Search:', e.target.value);
    };

    return (
        <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 xl:px-16 py-3 flex-shrink-0">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
                {/* Left section */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Sidebar Trigger */}
                    <button 
                        onClick={() => setIsSidebarOpen((prev) => !prev)} 
                        className="sm:hidden p-2 rounded-lg transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                        <PanelLeft size={20} />
                    </button>

                    {/* Workspace Info - Show on desktop */}
                    {currentWorkspace && (
                        <div className="hidden md:flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {currentWorkspace.name}
                            </span>
                        </div>
                    )}

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-4" />
                        <input
                            type="text"
                            placeholder="Search projects, tasks, team members..."
                            onChange={handleSearch}
                            className="pl-10 pr-4 py-2 w-full bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-4">

                    {/* Notifications */}
                    <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <BellIcon size={20} />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Theme Toggle */}
                    <button 
                        onClick={() => dispatch(toggleTheme())} 
                        className="p-2 flex items-center justify-center bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg transition hover:scale-105 active:scale-95"
                        aria-label="Toggle theme"
                    >
                        {theme === "light" ? (
                            <MoonIcon className="size-4 text-gray-700 dark:text-gray-300" />
                        ) : (
                            <SunIcon className="size-4 text-yellow-400" />
                        )}
                    </button>

                    {/* User Info & Dropdown */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {user?.fullName || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {user?.primaryEmailAddress?.emailAddress}
                            </p>
                        </div>
                        <UserButton 
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8"
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Navbar