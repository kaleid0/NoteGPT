import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import NotesList from './pages/NotesList';
import NoteDetail from './pages/NoteDetail';
import { ToastProvider } from './components/Toast';
import LLMSettings from './components/Settings/LLMSettings';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <header style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <Link to="/">NoteGPT</Link>
          </div>
          <div>
            <Link to="/settings">设置</Link>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<NotesList />} />
            <Route path="/note/:id" element={<NoteDetail />} />
            <Route path="/settings" element={<LLMSettings />} />
          </Routes>
        </main>
      </BrowserRouter>
    </ToastProvider>
  );
}
