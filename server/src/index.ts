// server/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { configureRoutes } from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { connectToDatabase } from './config/database';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const httpServer = createServer(app);

// Apply middlewares
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(morgan('dev')); // Request logging
app.use(express.json()); // JSON body parsing

// Configure API routes
configureRoutes(app);

// Apply error handling middleware
app.use(errorHandler);

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