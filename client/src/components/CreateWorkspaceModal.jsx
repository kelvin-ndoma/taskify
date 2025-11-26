// components/CreateWorkspaceModal.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Crown, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../configs/api';
import toast from 'react-hot-toast';

const CreateWorkspaceModal = ({ isOpen, onClose, onWorkspaceCreated }) => {
  const { getToken, user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch workspace limits when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchWorkspaceLimits();
    }
  }, [isOpen]);

  // Fetch workspace creation limits
  const fetchWorkspaceLimits = async () => {
    try {
      const token = getToken();
      const response = await api.get('/api/workspaces/limits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLimits(response.data);
    } catch (error) {
      console.error('Failed to fetch workspace limits:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    // Check if user can create more workspaces
    if (limits && !limits.canCreateMore && !limits.canCreateUnlimited) {
      toast.error(`You've reached your workspace limit (${limits.maxWorkspaces}). Please upgrade or contact an administrator.`);
      return;
    }

    setLoading(true);

    try {
      const token = getToken();
      
      // Send as JSON (no FormData since we removed image upload)
      const submitData = {
        name: formData.name,
        description: formData.description || ''
      };

      console.log('🔄 Creating workspace...', {
        name: formData.name,
        description: formData.description,
        userRole: user?.role
      });

      const response = await api.post('/api/workspaces', submitData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json', // JSON content type
        },
      });

      console.log('✅ Workspace created:', response.data);

      if (response.data.workspace) {
        toast.success('Workspace created successfully!');
        onWorkspaceCreated(response.data.workspace);
        resetForm();
        onClose();
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('❌ Create workspace error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create workspace';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Role badge component
  const RoleBadge = ({ role }) => {
    const roleConfig = {
      'SUPER_ADMIN': { label: 'Super Admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      'ADMIN': { label: 'Admin', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      'MEMBER': { label: 'Member', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
    };

    const config = roleConfig[role] || roleConfig.MEMBER;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {role === 'SUPER_ADMIN' && <Crown className="w-3 h-3 mr-1" />}
        {config.label}
      </span>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-auto animate-in fade-in-90 zoom-in-90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create Workspace
              </h2>
              {user?.role && (
                <div className="flex items-center gap-2 mt-1">
                  <RoleBadge role={user.role} />
                  {limits?.canCreateUnlimited && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Unlimited workspaces
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors duration-200"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Workspace Limits Info */}
        {limits && !limits.canCreateUnlimited && (
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Workspaces: {limits.currentWorkspaces} / {limits.maxWorkspaces}
                </p>
                {!limits.canCreateMore && (
                  <p className="font-medium mt-1">
                    You've reached your workspace limit.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Workspace Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
              Workspace Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter workspace name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 transition-colors duration-200"
              required
              disabled={loading || (limits && !limits.canCreateMore && !limits.canCreateUnlimited)}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your workspace..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 resize-none transition-colors duration-200"
              disabled={loading || (limits && !limits.canCreateMore && !limits.canCreateUnlimited)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim() || (limits && !limits.canCreateMore && !limits.canCreateUnlimited)}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </div>
              ) : (
                'Create Workspace'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CreateWorkspaceModal;