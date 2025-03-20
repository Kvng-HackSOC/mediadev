// server/src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

// Custom error class with status code
export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  // Determine if this is a known API error or an unexpected error
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const message = err.message || 'Internal server error';
  
  // In development, include the stack trace
  const response: Record<string, any> = {
    error: {
      message,
      status: statusCode,
    },
  };

  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Not found middleware
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new ApiError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

// Rate limiting error handler
export const rateLimitHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new ApiError('Too many requests, please try again later.', 429);
  next(error);
};