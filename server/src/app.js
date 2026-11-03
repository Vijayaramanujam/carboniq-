import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import documentRoutes from './routes/documentRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import authRoutes from './routes/authRoutes.js';
import emissionFactorRoutes from './routes/emissionFactorRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables if available
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health and DB diagnostic check (supported on both /api/health and /health)
const healthHandler = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    database: states[dbState] || 'unknown',
    databaseConnected: dbState === 1,
    aiVisionConfigured: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()),
    aiModel: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
    ocrSpaceConfigured: Boolean(process.env.OCR_SPACE_API_KEY && process.env.OCR_SPACE_API_KEY.trim()),
    serverless: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Mount Routes (supporting both /api/path and /path prefixes for seamless Vercel serverless routing)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/documents', '/documents'], documentRoutes);
app.use(['/api/activities', '/activities'], activityRoutes);
app.use(['/api/emission-factors', '/emission-factors'], emissionFactorRoutes);
app.use(['/api/reports', '/reports'], reportRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File size exceeds permitted limit.' });
    }
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }

  if (err.message && err.message.includes('Unsupported file type')) {
    return res.status(400).json({ success: false, error: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error.',
  });
});

export default app;
