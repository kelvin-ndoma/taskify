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

  const workspaces = useSelector((state) => state.workspace.workspaces ?? []);
  const currentWorkspace = useSelector((state) => state.workspace.currentWorkspace ?? null);
  const currentUserId = user?.id;

  // 🆕 Handle new workspace creation and navigation
  useEffect(() => {
    const handleOrganizationCreated = async (organization) => {
      console.log('🎯 New organization created:', organization);
      
      try {
        // Refresh workspaces to include the new one
        const token = await getToken();
        dispatch(fetchWorkspaces({ getToken }));
        
        // Set the new workspace as current
        setTimeout(() => {
          if (organization?.id) {
            dispatch(setCurrentWorkspace(organization.id));
            navigate("/");
            console.log('✅ Navigated to new workspace:', organization.name);
          }
        }, 1000); // Small delay to ensure workspace is synced
        
      } catch (error) {
        console.error('❌ Error handling new organization:', error);
      }
    };

    // Listen for organization creation (Clerk event)
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
    // Create a custom event listener for Clerk's organization creation
    const handleClerkOrganizationCreated = (org) => {
      console.log('🏢 Clerk organization created:', org);
      
      // Dispatch custom event for our handler
      window.dispatchEvent(new CustomEvent('organizationCreated', { detail: org }));
    };

    // Open Clerk organization creation with success callback
    openCreateOrganization({
      // Clerk doesn't have a direct callback, so we'll use a different approach
    });
    
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

      // Refresh workspaces after deletion
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-3 text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
      >
        <div className="flex items-center gap-3">
          {currentWorkspace?.image_url ? (
            <img
              src={currentWorkspace.image_url}
              alt={currentWorkspace.name}
              className="w-8 h-8 rounded shadow"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-medium text-gray-600">
              {currentWorkspace?.name?.[0] ?? "W"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
              {currentWorkspace?.name || "Select Workspace"}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
              {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0">
          <div className="p-2">
            <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
              Workspaces
            </p>

            {workspaces.map((workspace) => {
              const isCurrent = currentWorkspace?.id === workspace.id;

              // Admin/Owner detection
              const isAdminOrOwner =
                workspace.owner?.id === currentUserId ||
                workspace.members?.some(
                  (m) => m.user.id === currentUserId && m.role === "ADMIN"
                );

              return (
                <div
                  key={workspace.id}
                  onClick={() => onSelectWorkspace(workspace.id)}
                  className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  {workspace.image_url ? (
                    <img src={workspace.image_url} alt={workspace.name} className="w-6 h-6 rounded" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-xs">
                      {workspace.name?.[0] ?? "W"}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {workspace.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                      {workspace.members?.length ?? 0} members
                    </p>
                  </div>

                  {isCurrent && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  )}

                  {isAdminOrOwner && (
                    <Trash2
                      onClick={(e) => handleDeleteWorkspace(workspace, e)}
                      className="w-4 h-4 text-red-500 hover:text-red-700 flex-shrink-0 cursor-pointer ml-2"
                      title="Delete workspace"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <hr className="border-gray-200 dark:border-zinc-700" />

          <div
            onClick={handleCreateWorkspace}
            className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
              <Plus className="w-4 h-4" /> Create Workspace
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspaceDropdown;