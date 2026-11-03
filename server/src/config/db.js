import mongoose from 'mongoose';

let embeddedMongo = null;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carboniq';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[MongoDB] Connected successfully to ${uri}`);
  } catch (error) {
    if (uri.includes('127.0.0.1:27017') || uri.includes('localhost:27017')) {
      console.log('[MongoDB] Local MongoDB server not found. Launching embedded MongoDB service on port 27017...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const fs = await import('fs');
        const path = await import('path');
        const dbDir = path.resolve('data/db');
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

        embeddedMongo = await MongoMemoryServer.create({
          instance: {
            port: 27017,
            dbName: 'carboniq',
            dbPath: dbDir,
            storageEngine: 'wiredTiger',
          },
        });

        console.log(`[MongoDB] Embedded MongoDB service online at mongodb://127.0.0.1:27017/carboniq`);
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log(`[MongoDB] Connected successfully to ${uri}`);
        return;
      } catch (embeddedErr) {
        console.error(`[MongoDB] Failed to launch embedded MongoDB: ${embeddedErr.message}`);
        throw embeddedErr;
      }
    }

    console.error(`[MongoDB] Connection error: ${error.message}`);
    console.error(`[MongoDB] Please ensure MongoDB is running locally on port 27017 or update MONGODB_URI in .env`);
    throw error;
  }
}
