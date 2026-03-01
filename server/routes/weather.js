import express from 'express';
import { getWeather } from '../tools/getWeather.js';

const router = express.Router();

// GET /api/weather?lat=&lng=
router.get('/', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

    const weather = await getWeather({ lat: parseFloat(lat), lng: parseFloat(lng) });
    res.json(weather);
});

export default router;
