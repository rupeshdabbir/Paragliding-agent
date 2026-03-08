import 'dotenv/config';
import { getAiWeeklyVerdicts } from './server/services/aiVerdict.js';

const site = { name: 'Test', lat: 37.7, lng: -122.4, altitude: 0, siteTypes: { paragliding: true }, windDirections: { W: "1" }, description: 'Test' };
const weather = {
    current: { time: '2026-03-07T14:00:00Z' },
    hourly: {
        times: ['2026-03-07T14:00:00Z'],
        windSpeed10m: [10],
        windGusts: [12],
        windDirection10m: [270],
        cloudCover: [0],
        precipitation: [0],
        visibility: [10000]
    }
};

getAiWeeklyVerdicts(site, weather).then(console.log).catch(console.error);
