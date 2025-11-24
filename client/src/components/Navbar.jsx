import { SearchIcon, PanelLeft, BellIcon, XIcon, CheckIcon } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useState, useEffect } from 'react'
import { toggleTheme } from '../features/themeSlice'
import { MoonIcon, SunIcon } from 'lucide-react'
import { UserButton, useUser } from '@clerk/clerk-react'
import api from '../configs/api'

const Navbar = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const dispatch = useDispatch();
    const { user } = useUser();
    const { theme } = useSelector(state => state.theme);
    const { currentWorkspace } = useSelector(state => state.workspace);
    
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationsLoading, setNotificationsLoading] = useState(false);

    // Fetch notifications
    const fetchNotifications = async () => {
        if (!user) return;
        
        try {
            setNotificationsLoading(true);
            // This would be your actual notifications API endpoint
            const { data } = await api.get('/api/notifications');
            setNotifications(data.notifications || []);
            
            // Calculate unread count
            const unread = data.notifications?.filter(n => !n.read).length || 0;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setNotificationsLoading(false);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            await api.patch(`/api/notifications/${notificationId}/read`);
            setNotifications(prev => 
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await api.patch('/api/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    // Delete notification
    const deleteNotification = async (notificationId) => {
        try {
            await api.delete(`/api/notifications/${notificationId}`);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            setUnreadCount(prev => {
                const notification = notifications.find(n => n.id === notificationId);
                return notification && !notification.read ? Math.max(0, prev - 1) : prev;
            });
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    // Handle search
    const handleSearch = (e) => {
        console.log('Search:', e.target.value);
    };

    // Close notifications when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showNotifications && !event.target.closest('.notifications-container')) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications]);

    // Fetch notifications on component mount and when workspace changes
    useEffect(() => {
        fetchNotifications();
    }, [user, currentWorkspace]);

    // Mock notification data structure (replace with actual API data)
    const mockNotifications = [
        {
            id: 1,
            type: 'TASK_ASSIGNED',
            title: 'New Task Assignment',
            message: 'You have been assigned to "Update Dashboard Design"',
            entityId: 'task-123',
            entityType: 'task',
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
            actor: {
                name: 'Sarah Wilson',
                image: '/avatars/sarah.jpg'
            }
        },
        {
            id: 2,
            type: 'COMMENT_MENTION',
            title: 'Mentioned in Comment',
            message: 'Sarah mentioned you in a comment on "Mobile App Redesign"',
            entityId: 'comment-456',
            entityType: 'comment',
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            actor: {
                name: 'Sarah Wilson',
                image: '/avatars/sarah.jpg'
            }
        },
        {
            id: 3,
            type: 'PROJECT_INVITE',
            title: 'Project Invitation',
            message: 'You have been invited to join "E-commerce Platform" project',
            entityId: 'project-789',
            entityType: 'project',
            read: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            actor: {
                name: 'Mike Chen',
                image: '/avatars/mike.jpg'
            }
        },
        {
            id: 4,
            type: 'DEADLINE_REMINDER',
            title: 'Deadline Approaching',
            message: 'Task "User Testing Analysis" is due tomorrow',
            entityId: 'task-101',
            entityType: 'task',
            read: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            actor: null
        }
    ];

    // Use mock data for now - replace with actual notifications when API is ready
    const displayNotifications = notifications.length > 0 ? notifications : mockNotifications;

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        const icons = {
            TASK_ASSIGNED: '🎯',
            COMMENT_MENTION: '💬',
            PROJECT_INVITE: '👥',
            DEADLINE_REMINDER: '⏰',
            STATUS_UPDATE: '🔄',
            NEW_COMMENT: '📝',
            FILE_UPLOAD: '📎',
            MILESTONE_REACHED: '🏆'
        };
        return icons[type] || '🔔';
    };

    // Format time ago
    const formatTimeAgo = (date) => {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return new Date(date).toLocaleDateString();
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
                    <div className="relative notifications-container">
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                        >
                            <BellIcon size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
                                <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            Notifications
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={markAllAsRead}
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                                >
                                                    Mark all as read
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setShowNotifications(false)}
                                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                <XIcon size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-y-auto max-h-64">
                                    {notificationsLoading ? (
                                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                            Loading notifications...
                                        </div>
                                    ) : displayNotifications.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                            <BellIcon size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No notifications</p>
                                            <p className="text-xs mt-1">You're all caught up!</p>
                                        </div>
                                    ) : (
                                        displayNotifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`p-4 border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${
                                                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="text-lg flex-shrink-0">
                                                        {getNotificationIcon(notification.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                                                                {notification.title}
                                                            </h4>
                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                {!notification.read && (
                                                                    <button
                                                                        onClick={() => markAsRead(notification.id)}
                                                                        className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                                                                        title="Mark as read"
                                                                    >
                                                                        <CheckIcon size={12} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => deleteNotification(notification.id)}
                                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                                    title="Delete notification"
                                                                >
                                                                    <XIcon size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                                            {notification.message}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {formatTimeAgo(notification.createdAt)}
                                                            </span>
                                                            {notification.actor && (
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    by {notification.actor.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="p-3 border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50">
                                    <button 
                                        onClick={fetchNotifications}
                                        className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1"
                                    >
                                        View All Notifications
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

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