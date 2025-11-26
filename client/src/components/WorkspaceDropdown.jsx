// components/WorkspaceDropdown.jsx
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, Trash2, Crown, Shield } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace, addWorkspace, fetchWorkspaces } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Fixed import path
import CreateWorkspaceModal from "./CreateWorkspaceModal";

const API_BASE = import.meta.env.VITE_BASEURL || "http://localhost:5000";

function WorkspaceDropdown() {
  const { user, getToken } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const workspaces = useSelector((state) => state.workspace.workspaces ?? []);
  const currentWorkspace = useSelector((state) => state.workspace.currentWorkspace ?? null);
  const currentUserId = user?.id;

  // Image error handler
  const handleImageError = (workspaceId) => {
    console.log(`Image failed to load for workspace: ${workspaceId}`);
    setImageErrors(prev => ({ ...prev, [workspaceId]: true }));
  };

  // Clear image errors when workspaces change
  useEffect(() => {
    setImageErrors({});
  }, [workspaces]);

  // Select workspace
  const onSelectWorkspace = (workspaceId) => {
    dispatch(setCurrentWorkspace(workspaceId));
    setIsOpen(false);
    navigate("/");
  };

  // Create workspace handler
  const handleCreateWorkspace = () => {
    setShowCreateModal(true);
    setIsOpen(false);
  };

  // Handle successful workspace creation
  const handleWorkspaceCreated = (newWorkspace) => {
    console.log('✅ Workspace created:', newWorkspace);
    
    // Refresh workspaces list
    dispatch(fetchWorkspaces({ getToken }));
    
    // Set the new workspace as current
    setTimeout(() => {
      if (newWorkspace?.id) {
        dispatch(setCurrentWorkspace(newWorkspace.id));
        navigate("/");
        console.log('✅ Navigated to new workspace:', newWorkspace.name);
      }
    }, 500);
  };

  // Delete workspace
  const handleDeleteWorkspace = async (workspace, e) => {
    e.stopPropagation();
    if (!workspace?.id) return;

    if (!window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) return;

    try {
      const token = getToken();

      const res = await fetch(`${API_BASE}/api/workspaces/${workspace.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete workspace");
      }

      dispatch(fetchWorkspaces({ getToken }));
      alert("Workspace deleted successfully!");
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🆕 NEW: Role badge component for workspace members
  const MemberRoleBadge = ({ role, size = "xs" }) => {
    const sizeClasses = {
      xs: "px-1.5 py-0.5 text-xs",
      sm: "px-2 py-1 text-sm"
    };

    const roleConfig = {
      'ADMIN': { label: 'Admin', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: Shield },
      'MEMBER': { label: 'Member', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
    };

    const config = roleConfig[role] || roleConfig.MEMBER;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center rounded-full ${sizeClasses[size]} ${config.color} font-medium`}>
        {IconComponent && <IconComponent className="w-3 h-3 mr-1" />}
        {config.label}
      </span>
    );
  };

  // 🆕 NEW: User role badge
  const UserRoleBadge = ({ role }) => {
    const roleConfig = {
      'SUPER_ADMIN': { label: 'Super Admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', icon: Crown },
      'ADMIN': { label: 'Admin', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: Shield },
      'MEMBER': { label: 'Member', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
    };

    const config = roleConfig[role] || roleConfig.MEMBER;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {IconComponent && <IconComponent className="w-3 h-3 mr-1" />}
        {config.label}
      </span>
    );
  };

  // FIXED: Helper function to render workspace image with fallback
  const renderWorkspaceImage = (workspace, size = "md") => {
    const hasValidImage = workspace?.image_url && !imageErrors[workspace.id];
    
    // Size classes mapping
    const sizeClasses = {
      sm: "w-6 h-6 text-xs",
      md: "w-8 h-8 text-sm", 
      lg: "w-10 h-10 text-base",
      xl: "w-12 h-12 text-lg"
    };
    
    const sizeClass = sizeClasses[size] || sizeClasses.md;

    if (hasValidImage) {
      return (
        <img
          src={workspace.image_url}
          alt={workspace.name}
          className={`${sizeClass} rounded shadow object-cover`}
          onError={() => handleImageError(workspace.id)}
        />
      );
    }
    
    return (
      <div className={`${sizeClass} rounded bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center font-medium text-white`}>
        {workspace?.name?.[0]?.toUpperCase() ?? "W"}
      </div>
    );
  };

  // 🆕 NEW: Get user's role in workspace
  const getUserRoleInWorkspace = (workspace) => {
    if (workspace.owner?.id === currentUserId) {
      return 'OWNER';
    }
    
    const userMembership = workspace.members?.find(m => m.user.id === currentUserId);
    return userMembership?.role || 'MEMBER';
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between p-3 text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors duration-200"
        >
          <div className="flex items-center gap-3 min-w-0">
            {renderWorkspaceImage(currentWorkspace, "md")}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                {currentWorkspace?.name || "Select Workspace"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                  {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                </p>
                {user?.role && user.role !== 'MEMBER' && (
                  <UserRoleBadge role={user.role} />
                )}
              </div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-80 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg top-full left-0 mt-1 overflow-hidden">
            <div className="p-2">
              {/* 🆕 NEW: User info section */}
              <div className="px-2 py-3 mb-2 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {user?.name || 'User'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                        {user?.email}
                      </p>
                      {user?.role && <UserRoleBadge role={user.role} />}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2 font-medium">
                Your Workspaces
              </p>

              {workspaces.map((workspace) => {
                const isCurrent = currentWorkspace?.id === workspace.id;
                const userRole = getUserRoleInWorkspace(workspace);
                const isAdminOrOwner = userRole === 'OWNER' || userRole === 'ADMIN';

                return (
                  <div
                    key={workspace.id}
                    onClick={() => onSelectWorkspace(workspace.id)}
                    className="flex items-center gap-3 p-2 cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors duration-200 group"
                  >
                    {renderWorkspaceImage(workspace, "sm")}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {workspace.name}
                        </p>
                        <MemberRoleBadge role={userRole} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                        {workspace.members?.length ?? 0} member{workspace.members?.length !== 1 ? 's' : ''}
                        {workspace.owner && ` • Owned by ${workspace.owner.name}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {isCurrent && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}

                      {isAdminOrOwner && (
                        <Trash2
                          onClick={(e) => handleDeleteWorkspace(workspace, e)}
                          className="w-4 h-4 text-gray-400 hover:text-red-500 flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200"
                          title="Delete workspace"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 dark:border-zinc-700">
              <div
                onClick={handleCreateWorkspace}
                className="p-3 cursor-pointer rounded-lg group hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors duration-200"
              >
                <p className="flex items-center text-sm gap-2 text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 font-medium">
                  <Plus className="w-4 h-4" /> Create New Workspace
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    </>
  );
}

export default WorkspaceDropdown;