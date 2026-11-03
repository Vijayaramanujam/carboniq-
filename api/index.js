import { connectDB } from '../server/src/config/db.js';
import app from '../server/src/app.js';

let dbInitPromise = null;

export default async function handler(req, res) {
  if (!dbInitPromise) {
    dbInitPromise = connectDB().catch((err) => {
      console.warn('[Vercel Serverless] DB connection note:', err.message);
    });
  }
  await dbInitPromise;
  return app(req, res);
}
