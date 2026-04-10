import { Request, Response, NextFunction } from 'express';

export interface ErrorResponse {
  message: string;
  error?: string;
  status: number;
}

export class AppError extends Error {
  public readonly status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, AppError);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      message: err.message,
      error: err.status === 500 ? err.stack : undefined
    });
  }

  console.error(`[Error] ${err.stack || err}`);

  return res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
