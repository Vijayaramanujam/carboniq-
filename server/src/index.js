import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

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

export default app;
