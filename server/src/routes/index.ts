// server/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/database';
import { initializeAssociations } from './models/SearchHistory';

// Load environment variables
dotenv.config();

// Initialize model associations
initializeAssociations();

// Create Express application
const app = express();
const httpServer = createServer(app);

// Apply middlewares
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(morgan('dev')); // Request logging
app.use(express.json()); // JSON body parsing

// Define a simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Openverse Media Explorer API' });
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database
    await connectToDatabase();
    
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Export for testing
export { app };