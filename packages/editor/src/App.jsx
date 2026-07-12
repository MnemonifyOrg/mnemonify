import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CourseLibrary from './pages/CourseLibrary.jsx';
import CourseEditor from './pages/CourseEditor.jsx';
import TemplateLibrary from './pages/TemplateLibrary.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CourseLibrary />} />
        <Route path="/courses/:id/edit" element={<CourseEditor />} />
        <Route path="/templates" element={<TemplateLibrary />} />
      </Routes>
    </BrowserRouter>
  );
}
