import { Routes, Route, Navigate, useSearchParams } from "react-router-dom";
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
import VerifyEmail from "./components/VerifyEmail";
import ResetPassword from "./components/ResetPassword";

// Create a wrapper component for the sign-up that handles invitation context
const SignUpWithInvitation = () => {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('__clerk_ticket');
  const invitationCode = searchParams.get('__clerk_invitation_token');
  
  return <EmailPasswordSignUp 
    invitationToken={invitationToken}
    invitationCode={invitationCode}
  />;
};

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
            <Toaster 
                position="top-center"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 3000,
                        iconTheme: {
                            primary: '#10B981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        duration: 5000,
                        iconTheme: {
                            primary: '#EF4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            <Routes>
                {/* Public routes for authentication */}
                <Route path="/sign-in" element={<EmailPasswordSignIn />} />
                <Route path="/sign-up" element={<SignUpWithInvitation />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
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