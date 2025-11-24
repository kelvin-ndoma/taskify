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
        // NEW: Folder management reducers - FIXED
        addFolder: (state, action) => {
            const { projectId, ...folder } = action.payload;
            
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === projectId) {
                    return {
                        ...p,
                        folders: [...(p.folders || []), folder]
                    };
                }
                return p;
            });

            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id
                    ? {
                          ...w,
                          projects: w.projects.map((p) =>
                              p.id === projectId
                                  ? { ...p, folders: [...(p.folders || []), folder] }
                                  : p
                          ),
                      }
                    : w
            );
        },
        updateFolder: (state, action) => {
            const { projectId, id, ...updates } = action.payload;
            
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === projectId) {
                    return {
                        ...p,
                        folders: (p.folders || []).map((f) =>
                            f.id === id ? { ...f, ...updates } : f
                        ),
                    };
                }
                return p;
            });

            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id
                    ? {
                          ...w,
                          projects: w.projects.map((p) =>
                              p.id === projectId
                                  ? {
                                        ...p,
                                        folders: (p.folders || []).map((f) =>
                                            f.id === id ? { ...f, ...updates } : f
                                        ),
                                    }
                                  : p
                          ),
                      }
                    : w
            );
        },
        deleteFolder: (state, action) => {
            const { projectId, folderId } = action.payload;
            
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === projectId) {
                    return {
                        ...p,
                        folders: (p.folders || []).filter((f) => f.id !== folderId),
                    };
                }
                return p;
            });

            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id
                    ? {
                          ...w,
                          projects: w.projects.map((p) =>
                              p.id === projectId
                                  ? {
                                        ...p,
                                        folders: (p.folders || []).filter((f) => f.id !== folderId),
                                    }
                                  : p
                          ),
                      }
                    : w
            );
        },
// In workspaceSlice.js, update the task management reducers:

addTask: (state, action) => {
    const task = action.payload;
    
    state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
        if (p.id === task.projectId) {
            // If task has a folder, add it to the folder's tasks
            if (task.folderId) {
                const updatedFolders = (p.folders || []).map((folder) => {
                    if (folder.id === task.folderId) {
                        return {
                            ...folder,
                            tasks: [...(folder.tasks || []), task]
                        };
                    }
                    return folder;
                });
                
                return {
                    ...p,
                    folders: updatedFolders,
                    tasks: task.folderId ? p.tasks : [...(p.tasks || []), task] // Only add to project tasks if no folder
                };
            } else {
                // Otherwise add to project root tasks
                return {
                    ...p,
                    tasks: [...(p.tasks || []), task]
                };
            }
        }
        return p;
    });

    state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
            ? {
                  ...w,
                  projects: w.projects.map((p) =>
                      p.id === task.projectId
                          ? {
                                ...p,
                                tasks: task.folderId ? p.tasks : [...(p.tasks || []), task],
                                folders: (p.folders || []).map((folder) => {
                                    if (folder.id === task.folderId) {
                                        return {
                                            ...folder,
                                            tasks: [...(folder.tasks || []), task]
                                        };
                                    }
                                    return folder;
                                }),
                            }
                          : p
                  ),
              }
            : w
    );
},

updateTask: (state, action) => {
    const updatedTask = action.payload;
    
    state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
        if (p.id === updatedTask.projectId) {
            // Update task in project root
            const updatedTasks = (p.tasks || []).map((t) =>
                t.id === updatedTask.id ? updatedTask : t
            );
            
            // Update task in folders
            const updatedFolders = (p.folders || []).map((folder) => ({
                ...folder,
                tasks: (folder.tasks || []).map((t) =>
                    t.id === updatedTask.id ? updatedTask : t
                )
            }));
            
            return {
                ...p,
                tasks: updatedTasks,
                folders: updatedFolders
            };
        }
        return p;
    });

    state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
            ? {
                  ...w,
                  projects: w.projects.map((p) =>
                      p.id === updatedTask.projectId
                          ? {
                                ...p,
                                tasks: (p.tasks || []).map((t) =>
                                    t.id === updatedTask.id ? updatedTask : t
                                ),
                                folders: (p.folders || []).map((folder) => ({
                                    ...folder,
                                    tasks: (folder.tasks || []).map((t) =>
                                        t.id === updatedTask.id ? updatedTask : t
                                    )
                                })),
                            }
                          : p
                  ),
              }
            : w
    );
},

deleteTask: (state, action) => {
    const taskIds = action.payload; // Now just taskIds array
    
    state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
        // Find the project that contains these tasks
        const projectHasTasks = p.tasks?.some(t => taskIds.includes(t.id)) || 
                               p.folders?.some(f => f.tasks?.some(t => taskIds.includes(t.id)));
        
        if (projectHasTasks) {
            return {
                ...p,
                tasks: (p.tasks || []).filter((t) => !taskIds.includes(t.id)),
                folders: (p.folders || []).map((folder) => ({
                    ...folder,
                    tasks: (folder.tasks || []).filter((t) => !taskIds.includes(t.id))
                }))
            };
        }
        return p;
    });

    state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
            ? {
                  ...w,
                  projects: w.projects.map((p) => {
                      const projectHasTasks = p.tasks?.some(t => taskIds.includes(t.id)) || 
                                           p.folders?.some(f => f.tasks?.some(t => taskIds.includes(t.id)));
                      
                      if (projectHasTasks) {
                          return {
                              ...p,
                              tasks: (p.tasks || []).filter((t) => !taskIds.includes(t.id)),
                              folders: (p.folders || []).map((folder) => ({
                                  ...folder,
                                  tasks: (folder.tasks || []).filter((t) => !taskIds.includes(t.id))
                              }))
                          };
                      }
                      return p;
                  }),
              }
            : w
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
    updateProject,
    addFolder,
    updateFolder,
    deleteFolder,
    addTask, 
    updateTask, 
    deleteTask,
    resetWorkspace
} = workspaceSlice.actions;

export default workspaceSlice.reducer;