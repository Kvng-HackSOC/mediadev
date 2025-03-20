// server/src/config/database.ts
import { Pool } from 'pg';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'openverse_explorer',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Sequelize ORM instance
export const sequelize = new Sequelize(
  process.env.DB_NAME || 'openverse_explorer',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Connect to database
export const connectToDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync models with database (in development)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
      console.log('Database models synchronized.');
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

// Graceful shutdown
export const closeDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    await pool.end();
    console.log('Database connections closed.');
  } catch (error) {
    console.error('Error closing database connections:', error);
    throw error;
  }
};