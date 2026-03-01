import { useState, useEffect } from 'react';

export function useGeolocation() {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const requestLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            },
            { timeout: 10000, maximumAge: 300000 }
        );
    };

    return { location, loading, error, requestLocation };
}
