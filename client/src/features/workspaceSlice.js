import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../configs/api";

export const fetchWorkspaces = createAsyncThunk('workspace/fetchWorkspaces', async ({ getToken }) => {
    try {
        const { data } = await api.get('/api/workspaces', { 
            headers: { Authorization: `Bearer ${await getToken()}` } 
        });
        console.log('🔄 Workspaces fetched successfully:', data.workspaces?.length || 0);
        return data.workspaces || [];
    } catch (error) {
        console.error('❌ Error fetching workspaces:', error?.response?.data?.message || error.message);
        return [];
    }
});

const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
    initialized: false, // 🚨 CRITICAL: Add this missing flag
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
            state.initialized = true; // Mark as initialized
        },
        setCurrentWorkspace: (state, action) => {
            localStorage.setItem("currentWorkspaceId", action.payload);
            state.currentWorkspace = state.workspaces.find((w) => w.id === action.payload);
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);
            if (state.currentWorkspace?.id !== action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.id ? action.payload : w
            );
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter((w) => w.id !== action.payload); // Fixed: w._id to w.id
        },
        addProject: (state, action) => {
            state.currentWorkspace.projects.push(action.payload);
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? { ...w, projects: w.projects.concat(action.payload) } : w
            );
        },
        addTask: (state, action) => {
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.tasks.push(action.payload);
                }
                return p;
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? { ...p, tasks: p.tasks.concat(action.payload) } : p
                    )
                } : w
            );
        },
        updateTask: (state, action) => {
            state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.tasks = p.tasks.map((t) =>
                        t.id === action.payload.id ? action.payload : t
                    );
                }
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p, tasks: p.tasks.map((t) =>
                                t.id === action.payload.id ? action.payload : t
                            )
                        } : p
                    )
                } : w
            );
        },
        deleteTask: (state, action) => {
            state.currentWorkspace.projects.map((p) => {
                p.tasks = p.tasks.filter((t) => !action.payload.includes(t.id));
                return p;
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p, tasks: p.tasks.filter((t) => !action.payload.includes(t.id))
                        } : p
                    )
                } : w
            );
        },
        // 🆕 Add this reset action for cleanup
        resetWorkspace: (state) => {
            state.workspaces = [];
            state.currentWorkspace = null;
            state.loading = false;
            state.initialized = false;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(fetchWorkspaces.pending, (state) => {
            state.loading = true;
            state.initialized = false; // Reset on new fetch
        });
        
        builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
            state.workspaces = action.payload;
            state.initialized = true; // 🚨 CRITICAL: Mark as initialized
            
            console.log('✅ Workspaces loaded into Redux:', action.payload.length);
            
            if (action.payload.length > 0) {
                const localStorageCurrentWorkspaceId = localStorage.getItem('currentWorkspaceId');
                
                if (localStorageCurrentWorkspaceId) {
                    const findWorkspace = action.payload.find((w) => w.id === localStorageCurrentWorkspaceId);
                    if (findWorkspace) {
                        state.currentWorkspace = findWorkspace;
                        console.log('🎯 Using localStorage workspace:', findWorkspace.name);
                    } else {
                        // Prioritize "The Burns Brothers" workspace
                        const burnsBrothers = action.payload.find(ws => ws.slug === 'the-burns-brothers');
                        state.currentWorkspace = burnsBrothers || action.payload[0];
                        console.log('🔀 Falling back to default workspace:', state.currentWorkspace.name);
                    }
                } else {
                    // Prioritize "The Burns Brothers" workspace
                    const burnsBrothers = action.payload.find(ws => ws.slug === 'the-burns-brothers');
                    state.currentWorkspace = burnsBrothers || action.payload[0];
                    console.log('🏠 Setting initial workspace:', state.currentWorkspace.name);
                }
            } else {
                console.warn('⚠️ No workspaces found for user');
            }
            
            state.loading = false;
        });

        builder.addCase(fetchWorkspaces.rejected, (state) => {
            state.loading = false;
            state.initialized = true; // Even on error, mark as initialized
            console.error('💥 Workspace fetch failed');
        });
    }
});

export const { 
    setWorkspaces, 
    setCurrentWorkspace, 
    addWorkspace, 
    updateWorkspace, 
    deleteWorkspace, 
    addProject, 
    addTask, 
    updateTask, 
    deleteTask,
    resetWorkspace // 🆕 Export the new action
} = workspaceSlice.actions;

export default workspaceSlice.reducer;