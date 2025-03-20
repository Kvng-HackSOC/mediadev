import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();

// Apply middlewares
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(morgan('dev')); // Request logging
app.use(express.json()); // JSON body parsing

// Define a simple route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Openverse Media Explorer API' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});