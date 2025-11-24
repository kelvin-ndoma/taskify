import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { CheckCircle, Clock, AlertTriangle, Users, ArrowRightIcon, FolderIcon } from "lucide-react";

// Colors for charts and priorities
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const PRIORITY_COLORS = {
    LOW: "text-red-600 bg-red-200 dark:text-red-500 dark:bg-red-600",
    MEDIUM: "text-blue-600 bg-blue-200 dark:text-blue-500 dark:bg-blue-600",
    HIGH: "text-emerald-600 bg-emerald-200 dark:text-emerald-500 dark:bg-emerald-600",
};

const ProjectAnalytics = ({ project, tasks, folders }) => {
    // 🆕 NEW: Combine tasks from project root and all folders
    const allTasks = useMemo(() => {
        const folderTasks = folders?.flatMap(folder => folder.tasks || []) || [];
        return [...tasks, ...folderTasks];
    }, [tasks, folders]);

    const { stats, statusData, typeData, priorityData, folderData } = useMemo(() => {
        const now = new Date();
        const total = allTasks.length;

        const stats = {
            total,
            completed: 0,
            inProgress: 0,
            todo: 0,
            internalReview: 0,
            overdue: 0,
            withFolders: 0,
            withoutFolders: 0,
        };

        // 🆕 UPDATED: Status map with new values
        const statusMap = { 
            TODO: 0, 
            IN_PROGRESS: 0, 
            INTERNAL_REVIEW: 0, 
            DONE: 0, 
            CANCELLED: 0 
        };
        
        // 🆕 UPDATED: Type map with new values
        const typeMap = { 
            GENERAL_TASK: 0, 
            WEEKLY_EMAILS: 0, 
            CALENDARS: 0, 
            CLIENT: 0, 
            SOCIAL: 0, 
            OTHER: 0 
        };
        
        const priorityMap = { LOW: 0, MEDIUM: 0, HIGH: 0 };

        // 🆕 NEW: Track tasks by folder
        const folderTaskCounts = {};
        folders?.forEach(folder => {
            folderTaskCounts[folder.id] = {
                name: folder.name,
                count: folder.tasks?.length || 0,
                completed: folder.tasks?.filter(task => task.status === "DONE").length || 0
            };
        });

        allTasks.forEach((t) => {
            if (t.status === "DONE") stats.completed++;
            if (t.status === "IN_PROGRESS") stats.inProgress++;
            if (t.status === "TODO") stats.todo++;
            if (t.status === "INTERNAL_REVIEW") stats.internalReview++;
            
            // 🆕 UPDATED: Overdue excludes CANCELLED status
            if (t.due_date && new Date(t.due_date) < now && t.status !== "DONE" && t.status !== "CANCELLED") stats.overdue++;

            // 🆕 NEW: Track tasks with and without folders
            if (t.folderId) {
                stats.withFolders++;
            } else {
                stats.withoutFolders++;
            }

            if (statusMap[t.status] !== undefined) statusMap[t.status]++;
            if (typeMap[t.type] !== undefined) typeMap[t.type]++;
            if (priorityMap[t.priority] !== undefined) priorityMap[t.priority]++;
        });

        // 🆕 NEW: Prepare folder data for charts
        const folderData = Object.values(folderTaskCounts)
            .filter(folder => folder.count > 0)
            .map(folder => ({
                name: folder.name,
                tasks: folder.count,
                completed: folder.completed,
                completionRate: folder.count > 0 ? Math.round((folder.completed / folder.count) * 100) : 0
            }))
            .sort((a, b) => b.tasks - a.tasks);

        return {
            stats,
            statusData: Object.entries(statusMap).map(([k, v]) => ({ 
                name: k.replace("_", " "), 
                value: v,
                count: v
            })),
            typeData: Object.entries(typeMap)
                .filter(([_, v]) => v > 0)
                .map(([k, v]) => ({ 
                    name: k.replace("_", " "), 
                    value: v,
                    count: v
                })),
            priorityData: Object.entries(priorityMap).map(([k, v]) => ({
                name: k,
                value: v,
                count: v,
                percentage: total > 0 ? Math.round((v / total) * 100) : 0,
            })),
            folderData,
            folderDistribution: [
                { name: 'In Folders', value: stats.withFolders, color: '#3b82f6' },
                { name: 'No Folder', value: stats.withoutFolders, color: '#6b7280' }
            ]
        };
    }, [allTasks, folders]);

    const completionRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
    const folderTaskPercentage = stats.total ? Math.round((stats.withFolders / stats.total) * 100) : 0;

    const metrics = [
        {
            label: "Completion Rate",
            value: `${completionRate}%`,
            color: "text-emerald-600 dark:text-emerald-400",
            icon: <CheckCircle className="size-5 text-emerald-600 dark:text-emerald-400" />,
            bg: "bg-emerald-200 dark:bg-emerald-500/10",
        },
        {
            label: "Active Tasks",
            value: stats.inProgress + stats.todo + stats.internalReview,
            color: "text-blue-600 dark:text-blue-400",
            icon: <Clock className="size-5 text-blue-600 dark:text-blue-400" />,
            bg: "bg-blue-200 dark:bg-blue-500/10",
        },
        {
            label: "Overdue Tasks",
            value: stats.overdue,
            color: "text-red-600 dark:text-red-400",
            icon: <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />,
            bg: "bg-red-200 dark:bg-red-500/10",
        },
        {
            label: "Tasks in Folders",
            value: `${folderTaskPercentage}%`,
            color: "text-purple-600 dark:text-purple-400",
            icon: <FolderIcon className="size-5 text-purple-600 dark:text-purple-400" />,
            bg: "bg-purple-200 dark:bg-purple-500/10",
        },
    ];

    // 🆕 NEW: Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 shadow-lg">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {payload[0].dataKey === 'value' ? 'Count:' : 'Tasks:'} {payload[0].value}
                    </p>
                    {payload[0].payload.completionRate !== undefined && (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">
                            Completion: {payload[0].payload.completionRate}%
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Project Header */}
            <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">{project?.name}</h1>
                        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                            {stats.total} total tasks • {folders?.length || 0} folders • {project?.members?.length || 0} team members
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {completionRate}%
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">Overall Progress</div>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((m, i) => (
                    <div
                        key={i}
                        className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm">{m.label}</p>
                                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                            </div>
                            <div className={`p-2 rounded-md ${m.bg}`}>{m.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Tasks by Status */}
                <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                    <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Tasks by Status</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={statusData}>
                            <XAxis
                                dataKey="name"
                                tick={{ fill: "#52525b", fontSize: 12 }}
                                axisLine={{ stroke: "#d4d4d8" }}
                            />
                            <YAxis 
                                tick={{ fill: "#52525b", fontSize: 12 }} 
                                axisLine={{ stroke: "#d4d4d8" }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Tasks by Type */}
                <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                    <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Tasks by Type</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={typeData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ name, value }) => `${name}: ${value}`}
                            >
                                {typeData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* 🆕 NEW: Tasks by Folder */}
                {folderData.length > 0 && (
                    <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                        <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Tasks by Folder</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={folderData} layout="vertical">
                                <XAxis type="number" />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={80}
                                    tick={{ fill: "#52525b", fontSize: 12 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="tasks" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* 🆕 NEW: Folder Distribution */}
                <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                    <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Task Organization</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={folderDistribution}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ name, value }) => `${name}: ${value}`}
                            >
                                {folderDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Priority Breakdown */}
            <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Tasks by Priority</h2>
                <div className="space-y-4">
                    {priorityData.map((p) => (
                        <div key={p.name} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <ArrowRightIcon className={`size-3.5 ${PRIORITY_COLORS[p.name]} bg-transparent dark:bg-transparent`} />
                                    <span className="text-zinc-900 dark:text-zinc-200 capitalize">{p.name.toLowerCase()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-600 dark:text-zinc-400 text-sm">{p.value} tasks</span>
                                    <span className="px-2 py-0.5 border border-zinc-400 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs rounded">
                                        {p.percentage}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-full bg-zinc-300 dark:bg-zinc-800 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full ${PRIORITY_COLORS[p.name]}`}
                                    style={{ width: `${p.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 🆕 NEW: Folder Performance */}
            {folderData.length > 0 && (
                <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                    <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Folder Performance</h2>
                    <div className="grid gap-4">
                        {folderData.map((folder, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FolderIcon className="size-5 text-purple-600 dark:text-purple-400" />
                                    <div>
                                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{folder.name}</h3>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            {folder.tasks} tasks • {folder.completed} completed
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {folder.completionRate}%
                                    </div>
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Completion</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectAnalytics;