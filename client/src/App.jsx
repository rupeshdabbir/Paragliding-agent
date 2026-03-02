import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Chat from './pages/Chat.jsx';
import MapView from './pages/MapView.jsx';
import BriefPage from './pages/BriefPage.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

export default function App() {
    return (
        <ThemeProvider>
            <Navbar />
            <Routes>
                <Route path="/" element={<MapView />} />
                <Route path="/brief" element={<BriefPage />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </ThemeProvider>
    );
}
