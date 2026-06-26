import { Routes, Route } from 'react-router-dom'
import Welcome from './pages/Welcome'
import SignIn from './pages/SignIn'
import Onboarding from './pages/Onboarding'
import AssessmentProfile from './pages/AssessmentProfile'
import AssessmentMedicalHistory from './pages/AssessmentMedicalHistory'
import AssessmentSymptoms from './pages/AssessmentSymptoms'
import AssessmentReview from './pages/AssessmentReview'
import AIAnalysis from './pages/AIAnalysis'
import AIReport from './pages/AIReport'
import Dashboard from './pages/Dashboard'
import RecommendedTests from './pages/RecommendedTests'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/assessment/profile" element={<AssessmentProfile />} />
      <Route path="/assessment/medical-history" element={<AssessmentMedicalHistory />} />
      <Route path="/assessment/symptoms" element={<AssessmentSymptoms />} />
      <Route path="/assessment/review" element={<AssessmentReview />} />
      <Route path="/analysis" element={<AIAnalysis />} />
      <Route path="/report" element={<AIReport />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/recommended-tests" element={<RecommendedTests />} />
    </Routes>
  )
}

export default App
