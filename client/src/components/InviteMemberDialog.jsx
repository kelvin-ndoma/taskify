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

    // Use your EXISTING backend route for ALL invitations
    const sendBackendInvitation = async (workspaceId, email, role) => {
        const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                role,
                workspaceId // Your backend expects this
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send invitation');
        }

        return response.json();
    };

    // Gentle error handler
    const showGentleError = (error) => {
        const errorMessage = error.message || 'Something went wrong';
        
        // Common error mappings
        const errorMap = {
            'duplicate_record': 'This user is already a member',
            'rate_limit_exceeded': 'Please wait before sending another invitation',
            'not_found': 'Workspace not found',
            'invalid_email': 'Please enter a valid email address',
            'user not found': 'User not found. They must sign up first.',
            'already a member': 'User is already a member of this workspace',
            'Cannot read properties of null': 'Workspace configuration issue - please try again'
        };

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

        setIsSubmitting(true);
        
        try {
            let result;
            
            // ALWAYS use your backend for invitations - it handles both cases!
            if (currentWorkspace) {
                console.log('Using backend invitation for workspace:', currentWorkspace.name);
                result = await sendBackendInvitation(currentWorkspace.id, formData.email, formData.role);
                showGentleSuccess(result.message || "Invitation sent successfully");
            } else {
                throw new Error("No workspace available for invitation");
            }
            
            // Reset form and close dialog
            setFormData({ email: "", role: "MEMBER" });
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Invitation error:", error);
            showGentleError(error);
        } finally {
            setIsSubmitting(false);
        }
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
                            
                            {/* Information note */}
                            <div className="flex items-center gap-1 mt-1 text-xs text-amber-600 dark:text-amber-400">
                                <AlertCircle size={12} />
                                <span>User will be added to The Burns Brothers workspace automatically</span>
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
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                            Role
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
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => {
                                setFormData({ email: "", role: "MEMBER" });
                                setIsDialogOpen(false);
                            }}
                            disabled={isSubmitting}
                            className="px-5 py-2 rounded text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !currentWorkspace || !formData.email}
                            className="px-5 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white disabled:opacity-50 hover:opacity-90 transition-all duration-200 font-medium"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Sending...
                                </span>
                            ) : (
                                "Send Invitation"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteMemberDialog;