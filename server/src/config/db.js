import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let mongod = null;

export async function connectDB() {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiffin_db';

  try {
    // Attempt connecting to the configured URI with a quick serverSelectionTimeoutMS
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 2500
    });
    console.log(`[Database] Connected successfully to MongoDB at ${primaryUri}`);
  } catch (err) {
    console.warn(`[Database] Could not connect to primary MongoDB at ${primaryUri}. Initializing MongoMemoryServer...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log(`[Database] Connected successfully to in-memory MongoDB at ${memUri}`);
    } catch (memErr) {
      console.error('[Database] Failed to initialize in-memory database as fallback:', memErr);
      throw memErr;
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}
