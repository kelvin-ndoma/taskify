import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import ProjectDetails from "./pages/ProjectDetails";
import TaskDetails from "./pages/TaskDetails";
import { Loader2Icon } from 'lucide-react';
import EmailPasswordSignIn from "./components/EmailPasswordSignIn";
import EmailPasswordSignUp from "./components/EmailPasswordSignUp";
import ForgotPassword from "./components/ForgotPassword";

const App = () => {
    const { isLoaded, isSignedIn } = useAuth();

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading authentication...</span>
            </div>
        );
    }

    return (
        <>
            <Toaster />
            <Routes>
                {/* Public routes for authentication */}
                <Route path="/sign-in" element={<EmailPasswordSignIn />} />
                <Route path="/sign-up" element={<EmailPasswordSignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                
                {/* Protected routes */}
                {isSignedIn ? (
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="team" element={<Team />} />
                        <Route path="projects" element={<Projects />} />
                        <Route path="projectsDetail" element={<ProjectDetails />} />
                        <Route path="taskDetails" element={<TaskDetails />} />
                    </Route>
                ) : (
                    <Route path="*" element={<Navigate to="/sign-in" replace />} />
                )}
            </Routes>
        </>
    );
};

export default App;