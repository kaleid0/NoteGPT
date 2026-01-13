import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import NotesList from './pages/NotesList';
import NoteDetail from './pages/NoteDetail';
import { ToastProvider } from './components/Toast';
import LLMSettings from './components/Settings/LLMSettings';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <header style={{ 
          backgroundColor: '#fff', 
          borderBottom: '1px solid var(--border-color)', 
          padding: '0.75rem 0',
          marginBottom: '2rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-color)' }}>
              NoteGPT
            </Link>
            <nav style={{ display: 'flex', gap: '1.5rem' }}>
              <Link to="/" style={{ fontWeight: 500, color: 'var(--text-main)' }}>我的笔记</Link>
              <Link to="/settings" style={{ fontWeight: 500, color: 'var(--text-main)' }}>设置</Link>
            </nav>
          </div>
        </header>
        <main className="container">
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
