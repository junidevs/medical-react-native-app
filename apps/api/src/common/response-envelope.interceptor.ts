import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Request } from "express";
import { map, Observable } from "rxjs";

import { getCorrelationId } from "./correlation.middleware.js";

export interface PaginatedPayload<TData> {
  data: TData;
  nextCursor?: string;
}

function hasPaginatedShape(value: unknown): value is PaginatedPayload<unknown> {
  if (typeof value !== "object" || value === null) return false;
  return "data" in value;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = getCorrelationId(request);

    return next.handle().pipe(
      map((payload: unknown) => ({
        ok: true,
        data: hasPaginatedShape(payload) ? payload.data : payload,
        error: null,
        meta: {
          correlationId,
          ...(hasPaginatedShape(payload) ? { nextCursor: payload.nextCursor } : {})
        }
      }))
    );
  }
}

