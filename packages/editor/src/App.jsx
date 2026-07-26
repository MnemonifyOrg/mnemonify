import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CourseLibrary from './pages/CourseLibrary.jsx';
import CourseEditor from './pages/CourseEditor.jsx';
import TemplateLibrary from './pages/TemplateLibrary.jsx';
import { AuthProvider, RequireAuth } from './auth/AuthContext.jsx';
import { LoginPage, SignupPage, VerifyEmailPage, ResetPasswordPage } from './auth/AuthPages.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<RequireAuth><CourseLibrary /></RequireAuth>} />
          <Route path="/courses/:id/edit" element={<RequireAuth><CourseEditor /></RequireAuth>} />
          <Route path="/templates" element={<RequireAuth><TemplateLibrary /></RequireAuth>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
