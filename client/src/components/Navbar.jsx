// components/Navbar.jsx - Update the existing code
import { useState, useRef, useEffect } from "react";
import {
  SearchIcon,
  PanelLeft,
  BellIcon,
  MoonIcon,
  SunIcon,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "../features/themeSlice";
import { useAuth } from "../context/AuthContext";
import ProfileSettingsModal from "./ProfileSettingsModal";

const Navbar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const dispatch = useDispatch();
  const { user, logout } = useAuth();
  const { theme } = useSelector((state) => state.theme);
  const { currentWorkspace } = useSelector((state) => state.workspace);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef(null);

  const handleSearch = (e) => {
    console.log("Search:", e.target.value);
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const handleProfileSettings = () => {
    setShowProfileModal(true);
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // User avatar with fallback
  const UserAvatar = () => {
    if (user?.image) {
      return (
        <img
          src={user.image}
          alt={user.name}
          className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800 object-cover border-2 border-gray-300 dark:border-zinc-600"
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
      );
    }

    const initials =
      user?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U";
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm border-2 border-white dark:border-zinc-800 shadow-sm">
        {initials}
      </div>
    );
  };

  return (
    <>
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
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>

              {/* User Avatar with Dropdown */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <UserAvatar />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 py-1">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700">
                    <div className="flex items-center gap-3 mb-2">
                      <UserAvatar />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    {user?.role && user.role !== "MEMBER" && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                        {user.role.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  {/* Profile Settings */}
                  <button
                    onClick={handleProfileSettings}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile Settings</span>
                  </button>

                

                  {/* Logout */}
                  <div className="border-t border-gray-100 dark:border-zinc-700 mt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
};

export default Navbar;
