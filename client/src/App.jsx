import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Chat from './pages/Chat.jsx';
import MapView from './pages/MapView.jsx';
import BriefPage from './pages/BriefPage.jsx';
import OnboardingStepper from './components/OnboardingStepper.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { hasActiveKey } from './utils/aiHeaders.jsx';

export default function App() {
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
        // If they don't have a key OR haven't accepted the disclaimer, show onboarding
        const hasAccepted = localStorage.getItem('skypilot_disclaimer_accepted');
        if (!hasActiveKey() || !hasAccepted) {
            setNeedsOnboarding(true);
        }
    }, []);

    return (
        <ThemeProvider>
            <Navbar />
            <Routes>
                <Route path="/" element={<MapView />} />
                <Route path="/brief" element={<BriefPage />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            {needsOnboarding && <OnboardingStepper onComplete={() => setNeedsOnboarding(false)} />}
        </ThemeProvider>
    );
}
