import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Chat from './pages/Chat.jsx';
import MapView from './pages/MapView.jsx';

export default function App() {
    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<MapView />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}
