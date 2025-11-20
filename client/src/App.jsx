import { Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import { Toaster } from "react-hot-toast";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import ProjectDetails from "./pages/ProjectDetails";
import TaskDetails from "./pages/TaskDetails";
import { SignIn, SignUp } from "@clerk/clerk-react";

const App = () => {
    return (
        <>
            <Toaster />
            <Routes>
                {/* Public routes */}
                <Route 
                    path="/sign-in" 
                    element={
                        <div className='flex justify-center items-center min-h-screen bg-white dark:bg-zinc-950'>
                            <SignIn />
                        </div>
                    } 
                />
                <Route 
                    path="/sign-up" 
                    element={
                        <div className='flex justify-center items-center min-h-screen bg-white dark:bg-zinc-950'>
                            <SignUp />
                        </div>
                    } 
                />
                
                {/* Protected routes - Layout handles authentication */}
                <Route path="/*" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="team" element={<Team />} />
                    <Route path="projects" element={<Projects />} />
                    <Route path="projectsDetail" element={<ProjectDetails />} />
                    <Route path="taskDetails" element={<TaskDetails />} />
                </Route>
            </Routes>
        </>
    );
};

export default App;