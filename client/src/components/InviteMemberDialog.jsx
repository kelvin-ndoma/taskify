import { useState } from "react";
import { X, UserPlus, Mail, Shield, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import api from "../configs/api";
import toast from "react-hot-toast";

const InviteMemberDialog = ({ isDialogOpen, setIsDialogOpen }) => {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("MEMBER");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const { getToken } = useAuth();

    const handleDialogToggle = (open) => {
        setIsDialogOpen(open);
        if (!open) {
            setEmail("");
            setRole("MEMBER");
            setMessage("");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email.trim()) {
            toast.error("Please enter an email address");
            return;
        }

        if (!isValidEmail(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        if (!currentWorkspace?.id) {
            toast.error("No workspace selected");
            return;
        }

        setIsLoading(true);

        try {
            const token = await getToken();
            
            const response = await api.post(
                `/api/workspaces/${currentWorkspace.id}/members`,
                {
                    email: email.trim(),
                    role,
                    workspaceId: currentWorkspace.id,
                    message: message.trim() || `You've been invited to join ${currentWorkspace.name}`
                },
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data) {
                toast.success(`Invitation sent to ${email}! They will receive an email to join the workspace.`);
                handleDialogToggle(false);
            }
        } catch (error) {
            console.error('Error inviting member:', error);
            
            const errorMessage = error.response?.data?.message || 
                               error.message || 
                               'Failed to send invitation';
            
            // More specific error handling
            if (error.response?.status === 404) {
                toast.error("Workspace not found. Please refresh and try again.");
            } else if (error.response?.status === 403) {
                toast.error("You don't have permission to invite members to this workspace");
            } else if (error.response?.status === 400) {
                if (errorMessage.includes("already been sent")) {
                    toast.error("An invitation has already been sent to this email address");
                } else if (errorMessage.includes("Invalid role")) {
                    toast.error("Please select a valid role");
                } else if (errorMessage.includes("member limit")) {
                    toast.error("Workspace member limit reached");
                } else {
                    toast.error("Invalid invitation data. Please check the email and try again.");
                }
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                            <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Invite Team Member
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                                Add a new member to {currentWorkspace?.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleDialogToggle(false)}
                        disabled={isLoading}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                            Email Address *
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500 w-4 h-4" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="team.member@example.com"
                                disabled={isLoading}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                required
                            />
                        </div>
                        {email && !isValidEmail(email) && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                Please enter a valid email address
                            </p>
                        )}
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                            Role *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole("MEMBER")}
                                disabled={isLoading}
                                className={`p-3 border rounded-lg text-left transition-all ${
                                    role === "MEMBER"
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                        : "border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:border-gray-400 dark:hover:border-zinc-600"
                                } disabled:opacity-50`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-gray-200 dark:bg-zinc-700 rounded">
                                        <UserPlus className="w-3 h-3" />
                                    </div>
                                    <span className="font-medium">Member</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                    Can view and edit tasks
                                </p>
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => setRole("ADMIN")}
                                disabled={isLoading}
                                className={`p-3 border rounded-lg text-left transition-all ${
                                    role === "ADMIN"
                                        ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                        : "border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:border-gray-400 dark:hover:border-zinc-600"
                                } disabled:opacity-50`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-purple-200 dark:bg-purple-700 rounded">
                                        <Shield className="w-3 h-3" />
                                    </div>
                                    <span className="font-medium">Admin</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                    Full workspace access
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Optional Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                            Personal Message (Optional)
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={`Welcome to ${currentWorkspace?.name}! We're excited to have you on board.`}
                            disabled={isLoading}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
                        />
                    </div>

                    {/* Information Box */}
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">
                                    How invitations work
                                </h4>
                                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                                    <li>• User receives an email invitation from Clerk</li>
                                    <li>• They must sign up/login to accept the invitation</li>
                                    <li>• After accepting, they'll be automatically added to the workspace</li>
                                    <li>• They'll also be added to "The Burns Brothers" workspace</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => handleDialogToggle(false)}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !email.trim() || !isValidEmail(email)}
                            className="flex-1 px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Send Invitation
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteMemberDialog;