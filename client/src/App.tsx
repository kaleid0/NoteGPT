import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import NotesList from './pages/NotesList';
import NoteDetail from './pages/NoteDetail';

export default function App() {
  return (
    <BrowserRouter>
      <header style={{ padding: 12, borderBottom: '1px solid #eee' }}>
        <Link to="/">NoteGPT</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<NotesList />} />
          <Route path="/note/:id" element={<NoteDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
