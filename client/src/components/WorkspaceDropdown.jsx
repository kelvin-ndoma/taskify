import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace, addWorkspace, fetchWorkspaces } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { useClerk, useUser, useAuth } from "@clerk/clerk-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function WorkspaceDropdown() {
  const { user } = useUser();
  const { openCreateOrganization } = useClerk();
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

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

  // 🆕 Handle new workspace creation and navigation
  useEffect(() => {
    const handleOrganizationCreated = async (organization) => {
      console.log('🎯 New organization created:', organization);
      
      try {
        const token = await getToken();
        dispatch(fetchWorkspaces({ getToken }));
        
        setTimeout(() => {
          if (organization?.id) {
            dispatch(setCurrentWorkspace(organization.id));
            navigate("/");
            console.log('✅ Navigated to new workspace:', organization.name);
          }
        }, 1000);
        
      } catch (error) {
        console.error('❌ Error handling new organization:', error);
      }
    };

    window.addEventListener('organizationCreated', (event) => {
      handleOrganizationCreated(event.detail);
    });

    return () => {
      window.removeEventListener('organizationCreated', handleOrganizationCreated);
    };
  }, [dispatch, getToken, navigate]);

  // Select workspace
  const onSelectWorkspace = (workspaceId) => {
    dispatch(setCurrentWorkspace(workspaceId));
    setIsOpen(false);
    navigate("/");
  };

  // 🆕 Enhanced create workspace handler
  const handleCreateWorkspace = () => {
    openCreateOrganization();
    setIsOpen(false);
  };

  // Delete workspace
  const handleDeleteWorkspace = async (workspace, e) => {
    e.stopPropagation();
    if (!workspace?.id) return;

    if (!window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) return;

    try {
      const token = await getToken();

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

  // Helper function to render workspace image with fallback
  const renderWorkspaceImage = (workspace, size = 8) => {
    const hasValidImage = workspace?.image_url && !imageErrors[workspace.id];
    
    if (hasValidImage) {
      return (
        <img
          src={workspace.image_url}
          alt={workspace.name}
          className={`w-${size} h-${size} rounded shadow object-cover`}
          onError={() => handleImageError(workspace.id)}
        />
      );
    }
    
    return (
      <div className={`w-${size} h-${size} rounded bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center text-sm font-medium text-white`}>
        {workspace?.name?.[0]?.toUpperCase() ?? "W"}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-3 text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors duration-200"
      >
        <div className="flex items-center gap-3 min-w-0">
          {renderWorkspaceImage(currentWorkspace, 8)}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
              {currentWorkspace?.name || "Select Workspace"}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
              {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg top-full left-0 mt-1 overflow-hidden">
          <div className="p-2">
            <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2 font-medium">
              Your Workspaces
            </p>

            {workspaces.map((workspace) => {
              const isCurrent = currentWorkspace?.id === workspace.id;
              const isAdminOrOwner =
                workspace.owner?.id === currentUserId ||
                workspace.members?.some(
                  (m) => m.user.id === currentUserId && m.role === "ADMIN"
                );

              return (
                <div
                  key={workspace.id}
                  onClick={() => onSelectWorkspace(workspace.id)}
                  className="flex items-center gap-3 p-2 cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors duration-200 group"
                >
                  {renderWorkspaceImage(workspace, 6)}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {workspace.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                      {workspace.members?.length ?? 0} member{workspace.members?.length !== 1 ? 's' : ''}
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
  );
}

export default WorkspaceDropdown;