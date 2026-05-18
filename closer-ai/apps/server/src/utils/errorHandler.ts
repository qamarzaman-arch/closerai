import { Request, Response, NextFunction } from 'express';
import logger from './logger';

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
};

export class APIError extends Error {
  constructor(public message: string, public status: number = 400) {
    super(message);
    this.name = 'APIError';
  }
}
