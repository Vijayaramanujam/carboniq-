import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import documentRoutes from './routes/documentRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import authRoutes from './routes/authRoutes.js';
import emissionFactorRoutes from './routes/emissionFactorRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health and DB diagnostic check
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    database: states[dbState] || 'unknown',
    databaseConnected: dbState === 1,
    aiVisionConfigured: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()),
    aiModel: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
    ocrSpaceConfigured: Boolean(process.env.OCR_SPACE_API_KEY && process.env.OCR_SPACE_API_KEY.trim()),
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/emission-factors', emissionFactorRoutes);
app.use('/api/reports', reportRoutes);


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

// Start server after connecting to MongoDB
async function startServer() {
  try {
    await connectDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] CarbonIQ Input Handling Backend running on http://127.0.0.1:${PORT}`);
    });
    // Prevent keep-alive socket race conditions with reverse proxies (e.g. Vite)
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    console.error('[Server] Failed to connect to MongoDB. Starting HTTP server in diagnostic mode...');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] CarbonIQ Input Backend listening on http://127.0.0.1:${PORT} (Database Offline)`);
    });
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  }
}

startServer();
