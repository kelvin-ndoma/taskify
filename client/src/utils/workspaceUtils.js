// src/utils/workspaceUtils.js - UPDATED
import api from '../configs/api';

/**
 * Ensure default workspace exists for a user with robust error handling and retry logic
 * @param {string} userId - Clerk user ID
 * @param {string} token - Clerk authentication token
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<Object|null>} - Workspace object or null if failed
 */
export const ensureDefaultWorkspace = async (userId, token, maxRetries = 3) => {
    // Input validation
    if (!userId || !token) {
        console.error('ensureDefaultWorkspace: Missing required parameters', { userId: !!userId, token: !!token });
        return null;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Ensuring default workspace for user: ${userId} (attempt ${attempt}/${maxRetries})`);
            
            const response = await api.post(
                '/api/workspaces/ensure-default',
                { userId },
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000, // 10 second timeout
                }
            );

            console.log('🔍 ensureDefaultWorkspace API response:', {
                status: response.status,
                data: response.data
            });

            if (response.data?.success && response.data?.workspace) {
                console.log('✅ Default workspace ensured successfully:', {
                    workspaceId: response.data.workspace.id,
                    workspaceName: response.data.workspace.name
                });
                return response.data.workspace;
            } else {
                console.warn('⚠️ ensureDefaultWorkspace: No workspace in response or request failed', response.data);
                throw new Error(response.data?.message || 'No workspace data in response');
            }

        } catch (error) {
            // Handle timeout specifically
            if (error.code === 'ECONNABORTED') {
                console.error(`⏰ Attempt ${attempt} timed out for user: ${userId}`);
            } else {
                const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
                const status = error.response?.status;
                
                console.error(`❌ Attempt ${attempt} failed to ensure default workspace:`, {
                    error: errorMessage,
                    status: status,
                    userId
                });

                // Don't retry on client errors (4xx) except 429 (rate limit)
                if (status >= 400 && status < 500 && status !== 429) {
                    console.error('🛑 Client error, not retrying:', status);
                    return null;
                }
            }

            // Final attempt failed
            if (attempt === maxRetries) {
                console.error(`💥 All ${maxRetries} attempts to ensure default workspace failed for user: ${userId}`);
                return null;
            }

            // Exponential backoff with jitter
            const baseDelay = 1000; // 1 second
            const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 1000; // Add up to 1 second jitter
            const delay = exponentialDelay + jitter;

            console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return null; // Fallback return
};

/**
 * Fetch user's workspaces with comprehensive error handling
 * @param {string} token - Clerk authentication token
 * @returns {Promise<Array>} - Array of workspace objects
 */
export const fetchUserWorkspaces = async (token) => {
    if (!token) {
        console.error('fetchUserWorkspaces: No token provided');
        return [];
    }

    try {
        console.log('🔄 Fetching user workspaces...');
        
        const response = await api.get('/api/workspaces', {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000, // 10 second timeout
        });

        const workspaces = response.data?.workspaces || [];
        console.log(`✅ Successfully fetched ${workspaces.length} workspaces`);
        
        return workspaces;

    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        console.error('❌ Error fetching workspaces:', {
            error: errorMessage,
            status: error.response?.status,
            code: error.code
        });

        // Return empty array but log specific errors for debugging
        if (error.response?.status === 401) {
            console.error('🔐 Authentication failed - token may be invalid or expired');
        } else if (error.response?.status === 403) {
            console.error('🚫 Access forbidden - user may not have workspace permissions');
        } else if (error.code === 'ECONNABORTED') {
            console.error('⏰ Request timeout - server may be unavailable');
        }

        return [];
    }
};

/**
 * Get the current workspace with intelligent fallback logic
 * Prioritizes "The Burns Brothers" workspace, falls back to first workspace
 * @param {Array} workspaces - Array of workspace objects
 * @returns {Object|null} - Current workspace object or null
 */
export const getCurrentWorkspace = (workspaces) => {
    if (!workspaces || !Array.isArray(workspaces) || workspaces.length === 0) {
        console.warn('getCurrentWorkspace: No workspaces provided or empty array');
        return null;
    }

    // Prioritize "The Burns Brothers" workspace
    const burnsBrothersWorkspace = workspaces.find(ws => 
        ws.slug === 'the-burns-brothers' || 
        ws.name?.toLowerCase().includes('burns brothers')
    );

    if (burnsBrothersWorkspace) {
        console.log('🎯 Using "The Burns Brothers" as current workspace');
        return burnsBrothersWorkspace;
    }

    // Fallback to first workspace
    const firstWorkspace = workspaces[0];
    console.log(`🔀 Falling back to first workspace: ${firstWorkspace.name}`);
    return firstWorkspace;
};

/**
 * Validate workspace data structure
 * @param {Object} workspace - Workspace object to validate
 * @returns {boolean} - Whether the workspace is valid
 */
export const isValidWorkspace = (workspace) => {
    return workspace && 
           typeof workspace === 'object' && 
           workspace.id && 
           workspace.name && 
           workspace.slug;
};

/**
 * Get workspace by ID with fallback
 * @param {Array} workspaces - Array of workspace objects
 * @param {string} workspaceId - Target workspace ID
 * @returns {Object|null} - Workspace object or null
 */
export const getWorkspaceById = (workspaces, workspaceId) => {
    if (!workspaces || !workspaceId) {
        console.warn('getWorkspaceById: Missing parameters', { 
            workspaces: !!workspaces, 
            workspaceId: !!workspaceId 
        });
        return null;
    }

    const workspace = workspaces.find(ws => ws.id === workspaceId);
    
    if (!workspace) {
        console.warn(`Workspace not found with ID: ${workspaceId}`);
    }
    
    return workspace || null;
};

export default {
    ensureDefaultWorkspace,
    fetchUserWorkspaces,
    getCurrentWorkspace,
    isValidWorkspace,
    getWorkspaceById
};