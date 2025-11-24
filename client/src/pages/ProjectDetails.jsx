import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  PlusIcon,
  SettingsIcon,
  BarChart3Icon,
  CalendarIcon,
  FileStackIcon,
  ZapIcon,
  FolderIcon,
} from "lucide-react";
import ProjectAnalytics from "../components/ProjectAnalytics";
import ProjectSettings from "../components/ProjectSettings";
import CreateTaskDialog from "../components/CreateTaskDialog";
import ProjectCalendar from "../components/ProjectCalendar";
import ProjectTasks from "../components/ProjectTasks";
import ProjectFolders from "../components/ProjectFolders"; // NEW

export default function ProjectDetail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const id = searchParams.get("id");

  const navigate = useNavigate();
  const projects = useSelector(
    (state) => state?.workspace?.currentWorkspace?.projects || []
  );

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [folders, setFolders] = useState([]); // NEW
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [activeTab, setActiveTab] = useState(tab || "tasks");

  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    if (projects && projects.length > 0) {
      const proj = projects.find((p) => p.id === id);
      setProject(proj);
      setTasks(proj?.tasks || []);
      setFolders(proj?.folders || []); // NEW
    }
  }, [id, projects]);

  const statusColors = {
    PLANNING: "bg-zinc-200 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-200",
    ACTIVE:
      "bg-emerald-200 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-900",
    ON_HOLD:
      "bg-amber-200 text-amber-900 dark:bg-amber-500 dark:text-amber-900",
    COMPLETED: "bg-blue-200 text-blue-900 dark:bg-blue-500 dark:text-blue-900",
    CANCELLED: "bg-red-200 text-red-900 dark:bg-red-500 dark:text-red-900",
  };

  // 🆕 UPDATED: Correct task counting including folder tasks
  const getTaskCounts = () => {
    // Combine tasks from project root and all folders
    const allTasks = [
      ...tasks, // Tasks in project root
      ...folders.flatMap((folder) => folder.tasks || []), // Tasks in folders
    ];

    return {
      total: allTasks.length,
      completed: allTasks.filter((t) => t.status === "DONE").length,
      todo: allTasks.filter((t) => t.status === "TODO").length,
      inProgress: allTasks.filter((t) => t.status === "IN_PROGRESS").length,
      internalReview: allTasks.filter((t) => t.status === "INTERNAL_REVIEW")
        .length,
      cancelled: allTasks.filter((t) => t.status === "CANCELLED").length,
      inProgressAndTodo: allTasks.filter(
        (t) =>
          t.status === "IN_PROGRESS" ||
          t.status === "TODO" ||
          t.status === "INTERNAL_REVIEW"
      ).length,
      totalFolders: folders.length, // NEW: Folder count
    };
  };

  const taskCounts = getTaskCounts();

  if (!project) {
    return (
      <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
        <p className="text-3xl md:text-5xl mt-40 mb-10">Project not found</p>
        <button
          onClick={() => navigate("/projects")}
          className="mt-4 px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto text-zinc-900 dark:text-white">
      {/* Header */}
      <div className="flex max-md:flex-col gap-4 flex-wrap items-start justify-between max-w-6xl">
        <div className="flex items-center gap-4">
          <button
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            onClick={() => navigate("/projects")}
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium">{project.name}</h1>
            <span
              className={`px-2 py-1 rounded text-xs capitalize ${
                statusColors[project.status]
              }`}
            >
              {project.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* NEW: Create Folder Button */}
          <button
            onClick={() => setSearchParams({ id: id, tab: "folders" })}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <FolderIcon className="size-4" />
            New Folder
          </button>
          <button
            onClick={() => setShowCreateTask(true)}
            className="flex items-center gap-2 px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          >
            <PlusIcon className="size-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Info Cards - UPDATED */}
      <div className="grid grid-cols-2 sm:flex flex-wrap gap-6">
        {[
          {
            label: "Total Tasks",
            value: taskCounts.total,
            color: "text-zinc-900 dark:text-white",
          },
          {
            label: "Completed",
            value: taskCounts.completed,
            color: "text-emerald-700 dark:text-emerald-400",
          },
          {
            label: "In Progress",
            value: taskCounts.inProgress,
            color: "text-amber-700 dark:text-amber-400",
          },
          {
            label: "To Do",
            value: taskCounts.todo,
            color: "text-blue-700 dark:text-blue-400",
          },
          {
            label: "Internal Review",
            value: taskCounts.internalReview,
            color: "text-purple-700 dark:text-purple-400",
          },
          {
            label: "Folders",
            value: taskCounts.totalFolders,
            color: "text-orange-700 dark:text-orange-400",
          }, // NEW
          {
            label: "Team Members",
            value: project.members?.length || 0,
            color: "text-indigo-700 dark:text-indigo-400",
          },
        ].map((card, idx) => (
          <div
            key={idx}
            className=" dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex justify-between sm:min-w-60 p-4 py-2.5 rounded"
          >
            <div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {card.label}
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
            </div>
            <ZapIcon className={`size-4 ${card.color}`} />
          </div>
        ))}
      </div>

      {/* Tabs - UPDATED */}
      <div>
        <div className="inline-flex flex-wrap max-sm:grid grid-cols-3 gap-2 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
          {[
            { key: "tasks", label: "Tasks", icon: FileStackIcon },
            { key: "folders", label: "Folders", icon: FolderIcon }, // NEW
            { key: "calendar", label: "Calendar", icon: CalendarIcon },
            { key: "analytics", label: "Analytics", icon: BarChart3Icon },
            { key: "settings", label: "Settings", icon: SettingsIcon },
          ].map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => {
                setActiveTab(tabItem.key);
                setSearchParams({ id: id, tab: tabItem.key });
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                activeTab === tabItem.key
                  ? "bg-zinc-100 dark:bg-zinc-800/80"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              <tabItem.icon className="size-3.5" />
              {tabItem.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "tasks" && (
            <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
              <ProjectTasks tasks={tasks} folders={folders} projectId={id} />
            </div>
          )}
          {activeTab === "folders" && ( // NEW
            <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
              <ProjectFolders folders={folders} projectId={id} />
            </div>
          )}
          {activeTab === "analytics" && (
            <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
              <ProjectAnalytics
                tasks={tasks}
                project={project}
                folders={folders}
              />
            </div>
          )}
          {activeTab === "calendar" && (
            <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
              <ProjectCalendar tasks={tasks} folders={folders} />
            </div>
          )}
          {activeTab === "settings" && (
            <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
              <ProjectSettings project={project} />
            </div>
          )}
        </div>
      </div>

    

      {showCreateTask && (
        <CreateTaskDialog
          showCreateTask={showCreateTask}
          setShowCreateTask={setShowCreateTask}
          projectId={id}
          folders={folders}
          // 🆕 NEW: Auto-select current folder when creating from folder context
          initialFolderId={searchParams.get("folderId") || null}
        />
      )}
    </div>
  );
}
