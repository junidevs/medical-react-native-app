import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

export const correlationHeader = "x-correlation-id";

export interface CorrelatedRequest extends Request {
  correlationId: string;
}

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const rawHeader = request.header(correlationHeader);
    const correlationId = rawHeader?.trim() || randomUUID();

    (request as CorrelatedRequest).correlationId = correlationId;
    response.setHeader(correlationHeader, correlationId);
    next();
  }
}

export function getCorrelationId(request: Request) {
  return (request as Partial<CorrelatedRequest>).correlationId ?? randomUUID();
}

