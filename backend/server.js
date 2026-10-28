// server.js — DwellGB backend entry point: MongoDB + Express + Socket.IO.
const http = require('http');
const env = require('./config/env');
const app = require('./app');
const { connectDB, disconnectDB } = require('./db');
const realtime = require('./services/realtime');
const { ensureDirs } = require('./services/storage');

async function main() {
  await ensureDirs();
  await connectDB(env.MONGODB_URI);

  const server = http.createServer(app);
  realtime.init(server);

  server.listen(env.PORT, () => {
    console.log(`DwellGB API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await disconnectDB().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  if (/ECONNREFUSED|querySrv|ENOTFOUND|Server selection/i.test(err.message)) {
    console.error('   → Is MongoDB running and is MONGODB_URI in backend/.env correct?');
  }
  process.exit(1);
});
