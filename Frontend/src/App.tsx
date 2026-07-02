import { Routes, Route, Outlet } from 'react-router-dom'
import Welcome from './pages/Welcome'
import SignIn from './pages/SignIn'
import Onboarding from './pages/Onboarding'
import ResetPassword from './pages/ResetPassword'
import AssessmentProfile from './pages/AssessmentProfile'
import AssessmentMedicalHistory from './pages/AssessmentMedicalHistory'
import AssessmentSymptoms from './pages/AssessmentSymptoms'
import AssessmentReview from './pages/AssessmentReview'
import AIAnalysis from './pages/AIAnalysis'
import AIReport from './pages/AIReport'
import Dashboard from './pages/Dashboard'
import RecommendedTests from './pages/RecommendedTests'
import { AssessmentSessionProvider } from './context/AssessmentSessionContext'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        element={
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        <Route
          path="/assessment"
          element={
            <AssessmentSessionProvider>
              <Outlet />
            </AssessmentSessionProvider>
          }
        >
          <Route path="profile" element={<AssessmentProfile />} />
          <Route path="medical-history" element={<AssessmentMedicalHistory />} />
          <Route path="symptoms" element={<AssessmentSymptoms />} />
          <Route path="review" element={<AssessmentReview />} />
        </Route>
        <Route path="/analysis" element={<AIAnalysis />} />
        <Route path="/report" element={<AIReport />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/recommended-tests" element={<RecommendedTests />} />
      </Route>
    </Routes>
  )
}

export default App
