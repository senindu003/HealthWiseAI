import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";

// --- COMPONENT IMPORTS ---
import TopNav from "./components/TopNav";
import BottomNav from "./components/BottomNav";
import Footer from "./components/Footer";

// --- PAGE IMPORTS ---
import Welcome from "./pages/Welcome";
import SignIn from "./pages/SignIn";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import HealthAssessmentWizard from "./pages/HealthAssessmentWizard";
import AIAnalysis from "./pages/AIAnalysis";
import LabRecommendations from "./pages/LabRecommendations";

/**
 * WorkspaceLayout Component
 * Wraps around your core logged-in application workspaces.
 */
function WorkspaceLayout() {
  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      {/* Global Sticky Desktop Header */}
      <TopNav activeLink="Recommendations" />

      {/* Primary Workspace Render Context Panel */}
      <div className="flex-grow pb-20 md:pb-0">
        <Outlet />
      </div>

      {/* Global Sandbox Regulatory Footer */}
      <Footer />

      {/* Fixed Haptic Mobile Bottom Menu Utility Tray */}
      <BottomNav activeItem="Recommendations" />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Standalone Full-Screen Routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* High-Fidelity Asynchronous Pipeline Simulator */}
        <Route path="/analysis" element={<AIAnalysis />} />

        {/* Protected Workspace Layout Context */}
        <Route element={<WorkspaceLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/assessment/profile"
            element={<HealthAssessmentWizard />}
          />

          {/* Unified Destination Path for Both Tab Clicks and AI Navigation Redirects */}
          <Route path="/recommendations" element={<LabRecommendations />} />
        </Route>
      </Routes>
    </Router>
  );
}
