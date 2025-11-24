import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../configs/api";

export const fetchWorkspaces = createAsyncThunk('workspace/fetchWorkspaces', async ({ getToken }, { rejectWithValue }) => {
    try {
        console.log('🔄 fetchWorkspaces called');
        
        const token = await getToken();
        if (!token) {
            throw new Error('No authentication token available');
        }

        const response = await api.get('/api/workspaces', { 
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            } 
        });

        console.log('✅ Workspaces API response:', {
            status: response.status,
            data: response.data,
            workspacesCount: response.data.workspaces?.length || 0
        });

        if (!response.data.workspaces) {
            console.warn('⚠️ No workspaces array in response:', response.data);
            return [];
        }

        return response.data.workspaces;
    } catch (error) {
        console.error('❌ Error fetching workspaces:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        return rejectWithValue(error.response?.data || error.message);
    }
});

const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
    initialized: false,
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
            state.initialized = true;
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
            state.workspaces = state.workspaces.filter((w) => w.id !== action.payload);
        },
        addProject: (state, action) => {
            // Ensure project has folders array
            const projectWithFolders = {
                ...action.payload,
                folders: action.payload.folders || [] // NEW
            };
            
            state.currentWorkspace.projects.push(projectWithFolders);
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? { 
                    ...w, 
                    projects: w.projects.concat(projectWithFolders) 
                } : w
            );
        },
        updateProject: (state, action) => {
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) =>
                p.id === action.payload.id ? action.payload : p
            );
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w,
                    projects: w.projects.map((p) =>
                        p.id === action.payload.id ? action.payload : p
                    )
                } : w
            );
        },
        // NEW: Folder management reducers
        addFolder: (state, action) => {
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.folders = p.folders ? [...p.folders, action.payload] : [action.payload];
                }
                return p;
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w,
                    projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p,
                            folders: p.folders ? [...p.folders, action.payload] : [action.payload]
                        } : p
                    )
                } : w
            );
        },
        updateFolder: (state, action) => {
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.folders = p.folders.map((f) =>
                        f.id === action.payload.id ? action.payload : f
                    );
                }
                return p;
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w,
                    projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p,
                            folders: p.folders.map((f) =>
                                f.id === action.payload.id ? action.payload : f
                            )
                        } : p
                    )
                } : w
            );
        },
        deleteFolder: (state, action) => {
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.folders = p.folders.filter((f) => f.id !== action.payload.folderId);
                }
                return p;
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w,
                    projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p,
                            folders: p.folders.filter((f) => f.id !== action.payload.folderId)
                        } : p
                    )
                } : w
            );
        },
        addTask: (state, action) => {
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    // If task has a folder, add it to the folder's tasks
                    if (action.payload.folderId) {
                        p.folders = p.folders.map((folder) => {
                            if (folder.id === action.payload.folderId) {
                                folder.tasks = folder.tasks ? [...folder.tasks, action.payload] : [action.payload];
                            }
                            return folder;
                        });
                    } else {
                        // Otherwise add to project root tasks
                        p.tasks.push(action.payload);
                    }
                }
                return p;
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p,
                            tasks: action.payload.folderId ? p.tasks : [...p.tasks, action.payload],
                            folders: p.folders.map((folder) => {
                                if (folder.id === action.payload.folderId) {
                                    return {
                                        ...folder,
                                        tasks: folder.tasks ? [...folder.tasks, action.payload] : [action.payload]
                                    };
                                }
                                return folder;
                            })
                        } : p
                    )
                } : w
            );
        },
        updateTask: (state, action) => {
            state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    // Update task in project root if it exists there
                    p.tasks = p.tasks.map((t) =>
                        t.id === action.payload.id ? action.payload : t
                    );
                    
                    // Update task in folders if it exists there
                    p.folders = p.folders.map((folder) => ({
                        ...folder,
                        tasks: folder.tasks ? folder.tasks.map((t) =>
                            t.id === action.payload.id ? action.payload : t
                        ) : []
                    }));
                }
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p,
                            tasks: p.tasks.map((t) =>
                                t.id === action.payload.id ? action.payload : t
                            ),
                            folders: p.folders.map((folder) => ({
                                ...folder,
                                tasks: folder.tasks ? folder.tasks.map((t) =>
                                    t.id === action.payload.id ? action.payload : t
                                ) : []
                            }))
                        } : p
                    )
                } : w
            );
        },
        deleteTask: (state, action) => {
            state.currentWorkspace.projects.map((p) => {
                p.tasks = p.tasks.filter((t) => !action.payload.includes(t.id));
                p.folders = p.folders.map((folder) => ({
                    ...folder,
                    tasks: folder.tasks ? folder.tasks.filter((t) => !action.payload.includes(t.id)) : []
                }));
                return p;
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p,
                            tasks: p.tasks.filter((t) => !action.payload.includes(t.id)),
                            folders: p.folders.map((folder) => ({
                                ...folder,
                                tasks: folder.tasks ? folder.tasks.filter((t) => !action.payload.includes(t.id)) : []
                            }))
                        } : p
                    )
                } : w
            );
        },
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
            state.initialized = false;
        });
        
        builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
            state.workspaces = action.payload;
            state.initialized = true;
            
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
            state.initialized = true;
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
    updateProject, // NEW
    addFolder, // NEW
    updateFolder, // NEW
    deleteFolder, // NEW
    addTask, 
    updateTask, 
    deleteTask,
    resetWorkspace
} = workspaceSlice.actions;

export default workspaceSlice.reducer;