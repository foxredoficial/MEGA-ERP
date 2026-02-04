import type { NextFunction, Request, Response } from "express";

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch(next);
  };
}

export function sendError(res: Response, status: number, message: string, details?: unknown) {
  res.status(status).json({
    message,
    details: details ?? null,
  });
}
