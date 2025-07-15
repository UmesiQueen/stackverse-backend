import { MongoClient } from 'mongodb';
let db;

const connectDB = async () => {
  try {
    const client = await MongoClient.connect(process.env.DATABASE_URL);
    db = client.db(process.env.DB_NAME);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

export default connectDB;