import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from root project directory first, then server directory (server takes precedence)
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '.env') }); // override with server-specific vars if present

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import chatRouter from './routes/chat.js';
import sitesRouter from './routes/sites.js';
import weatherRouter from './routes/weather.js';
import searchRouter from './routes/search.js';
import forecastRouter from './routes/forecast.js';
import briefRouter from './routes/brief.js';
import validateRouter from './routes/validate.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://canifly.me', 'https://www.canifly.me']
        : ['http://localhost:5173', 'http://localhost:3000']
}));
app.use(express.json({ limit: '500kb' }));

// Rate limiting (Global)
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again after 10 minutes' }
});
app.use(limiter);

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// API Routes
app.use('/api/chat', chatRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/search', searchRouter);
app.use('/api/forecast', forecastRouter);
app.use('/api/brief', briefRouter);
app.use('/api/validate', validateRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        gemini: !!process.env.GEMINI_API_KEY,
        pinecone: !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX),
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Error]', err.message, err.stack);

    // Strip stack traces and internal paths in production
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
        error: isProd ? 'Internal server error' : (err.message || 'Internal server error')
    });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`\n🪂 SkyPilot API running at http://localhost:${PORT}`);
        console.log(`   Gemini: ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ GEMINI_API_KEY missing'}`);
        console.log(`   Pinecone: ${process.env.PINECONE_API_KEY ? '✅ configured' : '⚠️  not configured (optional)'}\n`);
    });
}

export default app;
