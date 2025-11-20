import { useState } from "react";
import { Mail, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { useOrganization, useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";

const InviteMemberDialog = ({ isDialogOpen, setIsDialogOpen }) => {
    const { organization, isLoaded: orgLoaded } = useOrganization();
    const { user, isLoaded: userLoaded } = useUser();
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        role: "MEMBER", // Matches your backend enum
    });

    // ✅ FIXED: Use workspaceId in the URL, not in the body
    const sendBackendInvitation = async (workspaceId, email, role) => {
        console.log(`📧 Sending invitation to ${email} for workspace ${workspaceId} as ${role}`);
        
        const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                role,
                // ✅ REMOVED: workspaceId from body since it's now in the URL
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to send invitation (${response.status})`);
        }

        return response.json();
    };

    // Enhanced error handler with more specific mappings
    const showGentleError = (error) => {
        const errorMessage = error.message || 'Something went wrong';
        
        console.log('🔧 Raw error:', errorMessage);
        
        // Comprehensive error mappings
        const errorMap = {
            'method not allowed': 'Server configuration error. Please contact support.',
            '405': 'Server routing issue. Please try again.',
            'duplicate_record': 'This user is already a member of this workspace',
            'rate_limit_exceeded': 'Please wait before sending another invitation',
            'not_found': 'Workspace not found',
            'invalid_email': 'Please enter a valid email address',
            'user not found': 'User not found. They must sign up first before being invited.',
            'already a member': 'User is already a member of this workspace',
            'permission': 'You do not have permission to add members to this workspace',
            'default workspace not found': 'System configuration issue - contact support',
            'missing required fields': 'Please fill in all required fields',
            'invalid role': 'Please select a valid role',
            'failed to execute': 'Network error. Please check your connection.',
            'unexpected end of json': 'Server response error. Please try again.',
            'workspace not found': 'The workspace was not found. Please refresh the page.',
            'cannot read properties of null': 'Workspace configuration issue - please refresh and try again'
        };

        // Find the most specific error message
        const friendlyMessage = Object.entries(errorMap).find(([key]) => 
            errorMessage.toLowerCase().includes(key.toLowerCase())
        )?.[1] || 'Failed to send invitation. Please try again.';

        toast.error(friendlyMessage, {
            duration: 5000,
            style: {
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px'
            },
            icon: <AlertCircle size={18} />
        });
    };

    const showGentleSuccess = (message) => {
        toast.success(message, {
            duration: 4000,
            style: {
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px'
            },
            icon: <CheckCircle size={18} />
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showGentleError(new Error('invalid_email'));
            return;
        }

        // Validate workspace exists
        if (!currentWorkspace?.id) {
            showGentleError(new Error('workspace not found'));
            return;
        }

        setIsSubmitting(true);
        
        try {
            console.log('🚀 Starting invitation process...');
            console.log('Workspace ID:', currentWorkspace.id);
            console.log('Target email:', formData.email);
            console.log('Role:', formData.role);
            
            // ✅ ALWAYS use your backend for invitations
            const result = await sendBackendInvitation(
                currentWorkspace.id, 
                formData.email, 
                formData.role
            );
            
            console.log('✅ Invitation successful:', result);
            
            // Show success message with details about default workspace
            let successMessage = "Invitation sent successfully!";
            if (result.addedToDefault) {
                successMessage += " The user has been automatically added to The Burns Brothers workspace.";
            } else {
                successMessage += " The user was already a member of The Burns Brothers workspace.";
            }
            
            showGentleSuccess(result.message || successMessage);
            
            // Reset form and close dialog
            setFormData({ email: "", role: "MEMBER" });
            setIsDialogOpen(false);
            
        } catch (error) {
            console.error("❌ Invitation error:", error);
            showGentleError(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({ email: "", role: "MEMBER" });
        setIsDialogOpen(false);
    };

    // Show loading state while Clerk loads
    if (!orgLoaded || !userLoaded) {
        return null;
    }

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200">
                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UserPlus className="size-5 text-zinc-900 dark:text-zinc-200" /> 
                        Invite Team Member
                    </h2>
                    
                    {currentWorkspace && (
                        <div className="text-sm text-zinc-700 dark:text-zinc-400 mt-2">
                            <p>
                                Inviting to workspace:{" "}
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    {currentWorkspace.name}
                                </span>
                            </p>
                            
                            {/* Information note about default workspace */}
                            <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
                                <AlertCircle className="size-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-blue-700 dark:text-blue-300">
                                    <p className="font-medium mb-1">Automatic Default Workspace Access</p>
                                    <p>
                                        This user will be automatically added to <strong>"The Burns Brothers"</strong> workspace first, then to this workspace. This ensures all users have access to the main workspace.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Input */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 w-4 h-4" />
                            <input 
                                type="email" 
                                value={formData.email} 
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                                placeholder="Enter email address" 
                                className="pl-10 w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 py-2 focus:outline-none focus:border-blue-500 transition-colors" 
                                required 
                                disabled={isSubmitting}
                            />
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            User must have an account with this email address
                        </p>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                            Role in this Workspace
                        </label>
                        <select 
                            value={formData.role} 
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })} 
                            className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 py-2 px-3 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                            disabled={isSubmitting}
                        >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Admins can manage members and workspace settings
                        </p>
                    </div>

                    {/* Workspace Info */}
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-200 mb-2">
                            Workspace Access
                        </h4>
                        <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <div className="flex justify-between">
                                <span>The Burns Brothers:</span>
                                <span className="text-green-600 dark:text-green-400 font-medium">Auto-joined</span>
                            </div>
                            <div className="flex justify-between">
                                <span>{currentWorkspace?.name}:</span>
                                <span className="font-medium capitalize">{formData.role.toLowerCase()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-5 py-2 rounded text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !currentWorkspace || !formData.email}
                            className="px-5 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white disabled:opacity-50 hover:opacity-90 transition-all duration-200 font-medium flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

                {/* Debug info (remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-2 bg-yellow-50 dark:bg-yellow-500/10 rounded border border-yellow-200 dark:border-yellow-500/20">
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                            <strong>Debug:</strong> Workspace ID: {currentWorkspace?.id}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InviteMemberDialog;