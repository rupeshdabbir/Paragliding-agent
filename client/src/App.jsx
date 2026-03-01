import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Landing from './pages/Landing.jsx';
import Chat from './pages/Chat.jsx';
import MapView from './pages/MapView.jsx';

export default function App() {
    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/map" element={<MapView />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}
