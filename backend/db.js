// db.js — MongoDB connection (Mongoose).
// Replaces the old rent.json file store, which kept the whole database in memory,
// wrote it synchronously on every request, and silently RESET all data if the
// file was ever corrupted. Use scripts/migrate-json.js to import old rent.json data.
const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

async function connectDB(uri) {
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: true,
  });
  console.log(`MongoDB connected (${mongoose.connection.name})`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB };
