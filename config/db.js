const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
