import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import App from './App.jsx';
import UpdateToast from './components/UpdateToast.jsx';
import './index.css';

function AppWithSW() {
    const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
        onRegistered(r) {
            // Poll every 60 minutes for a new SW in the background
            if (r) {
                setInterval(() => r.update(), 60 * 60 * 1000);
            }
        },
    });

    return (
        <>
            <BrowserRouter>
                <App />
            </BrowserRouter>
            <UpdateToast needRefresh={needRefresh} updateServiceWorker={updateServiceWorker} />
        </>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AppWithSW />
    </React.StrictMode>
);
