// pages/Team.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UsersIcon, Search, UserPlus, Shield, Activity, Trash2, ChevronDown } from "lucide-react";
import InviteMemberDialog from "../components/InviteMemberDialog";
import { useSelector } from "react-redux";
import { useUser, useAuth } from "@clerk/clerk-react";
import api from "../configs/api";
import toast from "react-hot-toast";

const Team = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingStates, setLoadingStates] = useState({});
    const [showRoleMenu, setShowRoleMenu] = useState(null);
    
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const projects = currentWorkspace?.projects || [];
    const { user: currentUser } = useUser();
    const { getToken } = useAuth();

    const filteredUsers = users.filter(
        (user) =>
            user?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        setUsers(currentWorkspace?.members || []);
        setTasks(currentWorkspace?.projects?.reduce((acc, project) => [...acc, ...project.tasks], []) || []);
    }, [currentWorkspace]);

    // 🆕 Navigate to member details
    const handleMemberClick = (member) => {
        navigate(`/team/${member.user.id}`);
    };

    // 🆕 Check if current user is workspace admin/owner
    const isCurrentUserAdmin = () => {
        if (!currentUser || !currentWorkspace) return false;
        
        const currentUserMembership = currentWorkspace.members?.find(
            member => member.user.id === currentUser.id
        );
        
        return (
            currentWorkspace.ownerId === currentUser.id ||
            currentUserMembership?.role === "ADMIN"
        );
    };

    // 🆕 Check if user can be removed (can't remove owner, yourself, or if not admin)
    const canRemoveUser = (targetUser) => {
        if (!isCurrentUserAdmin()) return false;
        if (targetUser.user.id === currentUser.id) return false; // Can't remove yourself
        if (targetUser.user.id === currentWorkspace.ownerId) return false; // Can't remove owner
        return true;
    };

    // 🆕 Remove team member from workspace
    const handleRemoveMember = async (member, e) => {
        e?.stopPropagation();
        
        if (!canRemoveUser(member)) {
            toast.error("You don't have permission to remove this member");
            return;
        }

        if (!window.confirm(`Remove ${member.user.name} from ${currentWorkspace.name}? They will lose access to all workspace projects and tasks.`)) {
            return;
        }

        setLoadingStates(prev => ({ ...prev, [member.id]: true }));
        setShowRoleMenu(null);

        try {
            const token = await getToken();
            
            const response = await api.delete(
                `/api/workspaces/${currentWorkspace.id}/members/${member.user.id}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data) {
                // Remove member from local state
                setUsers(prev => prev.filter(u => u.id !== member.id));
                toast.success(`${member.user.name} has been removed from the workspace`);
            }
        } catch (error) {
            console.error('Error removing team member:', error);
            toast.error(error.response?.data?.message || 'Failed to remove team member');
        } finally {
            setLoadingStates(prev => ({ ...prev, [member.id]: false }));
        }
    };

    // 🆕 Update member role
    const handleUpdateRole = async (member, newRole) => {
        try {
            setLoadingStates(prev => ({ ...prev, [member.id]: true }));
            setShowRoleMenu(null);
            
            const token = await getToken();
            
            await api.patch(
                `/api/workspaces/${currentWorkspace.id}/members/${member.user.id}/role`,
                { role: newRole },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Update local state
            setUsers(prev => prev.map(u => 
                u.id === member.id ? { ...u, role: newRole } : u
            ));
            
            toast.success(`Role updated to ${newRole}`);
        } catch (error) {
            console.error('Error updating member role:', error);
            toast.error(error.response?.data?.message || 'Failed to update role');
        } finally {
            setLoadingStates(prev => ({ ...prev, [member.id]: false }));
        }
    };

    // 🆕 Safe image URL handler
    const getSafeImageUrl = (imageUrl) => {
        if (!imageUrl || imageUrl.trim() === "" || imageUrl === "null") {
            return null;
        }
        return imageUrl;
    };

    // 🆕 User avatar component with proper sizing
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

    // 🆕 Role badge component with role update functionality
    const RoleBadge = ({ member }) => {
        const isOwner = member.user.id === currentWorkspace?.ownerId;
        const isCurrentUserOwner = currentWorkspace?.ownerId === currentUser?.id;
        
        // Only allow role changes if current user is workspace owner and target is not owner/self
        const canChangeRole = isCurrentUserOwner && 
                             !isOwner && 
                             member.user.id !== currentUser?.id;

        if (isOwner) {
            return (
                <span className="px-2 py-1 text-xs rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                    OWNER
                </span>
            );
        }

        return (
            <div className="relative">
                {canChangeRole ? (
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowRoleMenu(showRoleMenu === member.id ? null : member.id);
                            }}
                            disabled={loadingStates[member.id]}
                            className={`px-2 py-1 text-xs rounded-md font-medium flex items-center gap-1 ${
                                member.role === "ADMIN"
                                    ? "bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400"
                                    : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                            } ${loadingStates[member.id] ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                        >
                            {loadingStates[member.id] ? (
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {member.role || "MEMBER"}
                                    <ChevronDown className="w-3 h-3" />
                                </>
                            )}
                        </button>
                        
                        {showRoleMenu === member.id && (
                            <div className="absolute top-full left-0 mt-1 w-24 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg z-10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateRole(member, "ADMIN");
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 first:rounded-t-md last:rounded-b-md"
                                >
                                    ADMIN
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateRole(member, "MEMBER");
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 first:rounded-t-md last:rounded-b-md"
                                >
                                    MEMBER
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <span
                        className={`px-2 py-1 text-xs rounded-md font-medium ${
                            member.role === "ADMIN"
                                ? "bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400"
                                : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                        }`}
                    >
                        {member.role || "MEMBER"}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">Team</h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm">
                        Manage team members and their contributions
                        {isCurrentUserAdmin() && " • You have admin permissions"}
                    </p>
                </div>
                <button 
                    onClick={() => setIsDialogOpen(true)} 
                    className="flex items-center px-5 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white transition"
                >
                    <UserPlus className="w-4 h-4 mr-2" /> Invite Member
                </button>
                <InviteMemberDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-4">
                {/* Total Members */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Total Members</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                            <UsersIcon className="size-4 text-blue-500 dark:text-blue-200" />
                        </div>
                    </div>
                </div>

                {/* Active Projects */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Active Projects</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {projects.filter((p) => p.status !== "CANCELLED" && p.status !== "COMPLETED").length}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/10">
                            <Activity className="size-4 text-emerald-500 dark:text-emerald-200" />
                        </div>
                    </div>
                </div>

                {/* Total Tasks */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Total Tasks</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/10">
                            <Shield className="size-4 text-purple-500 dark:text-purple-200" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3" />
                <input 
                    placeholder="Search team members..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-8 w-full text-sm rounded-md border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 py-2 focus:outline-none focus:border-blue-500" 
                />
            </div>

            {/* Team Members */}
            <div className="w-full">
                {filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <UsersIcon className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {users.length === 0
                                ? "No team members yet"
                                : "No members match your search"}
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6">
                            {users.length === 0
                                ? "Invite team members to start collaborating"
                                : "Try adjusting your search term"}
                        </p>
                    </div>
                ) : (
                    <div className="max-w-4xl w-full">
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-gray-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                            Team Member
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                            Role
                                        </th>
                                        {isCurrentUserAdmin() && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                                    {filteredUsers.map((member) => (
                                        <tr
                                            key={member.id}
                                            className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                            onClick={() => handleMemberClick(member)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0">
                                                        <UserAvatar user={member.user} size="lg" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {member.user?.name || "Unknown User"}
                                                            {member.user.id === currentUser?.id && (
                                                                <span className="text-xs text-blue-500 ml-1">(You)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                                                {member.user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <RoleBadge member={member} />
                                            </td>
                                            {isCurrentUserAdmin() && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                                                    {canRemoveUser(member) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveMember(member, e);
                                                            }}
                                                            disabled={loadingStates[member.id]}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {loadingStates[member.id] ? (
                                                                <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin mr-1" />
                                                            ) : (
                                                                <Trash2 className="w-3 h-3 mr-1" />
                                                            )}
                                                            Remove
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3">
                            {filteredUsers.map((member) => (
                                <div
                                    key={member.id}
                                    className="p-4 border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                    onClick={() => handleMemberClick(member)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <UserAvatar user={member.user} size="lg" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">
                                                        {member.user?.name || "Unknown User"}
                                                    </p>
                                                    {member.user.id === currentUser?.id && (
                                                        <span className="text-xs text-blue-500 whitespace-nowrap">(You)</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">
                                                    {member.user.email}
                                                </p>
                                                <div className="mt-2">
                                                    <RoleBadge member={member} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {isCurrentUserAdmin() && canRemoveUser(member) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveMember(member, e);
                                                }}
                                                disabled={loadingStates[member.id]}
                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 ml-2"
                                                title="Remove from workspace"
                                            >
                                                {loadingStates[member.id] ? (
                                                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Team;