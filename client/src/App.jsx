import { Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import { Toaster } from "react-hot-toast";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import ProjectDetails from "./pages/ProjectDetails";
import TaskDetails from "./pages/TaskDetails";
import CustomSignUp from "./components/CustomSignUp"; // Add this import
import VerifyEmail from "./components/VerifyEmail"; // Add this import

const App = () => {
    return (
        <>
            <Toaster />
            <Routes>
                {/* Public routes - outside the layout */}
                <Route path="/sign-up" element={<CustomSignUp />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                
                {/* Protected routes - inside the layout */}
                <Route path="/" element={<Layout />}>
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