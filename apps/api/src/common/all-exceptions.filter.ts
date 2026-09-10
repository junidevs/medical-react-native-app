import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { Request, Response } from "express";
import { ZodError } from "zod";

import { Prisma } from "../../generated/prisma/client.js";
import { getCorrelationId } from "./correlation.middleware.js";

interface ErrorResponseBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = this.getStatus(exception);
    const error = this.getErrorBody(exception);
    const correlationId = getCorrelationId(request);

    response.status(status).json({
      ok: false,
      data: null,
      error: { ...error, correlationId },
      meta: { correlationId }
    });
  }

  private getStatus(exception: unknown) {
    if (exception instanceof HttpException) return exception.getStatus();
    if (exception instanceof Prisma.PrismaClientKnownRequestError) return 400;
    if (exception instanceof ZodError) return 400;

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorBody(exception: unknown): ErrorResponseBody {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof ZodError) {
      return {
        code: "VALIDATION_ERROR",
        message: "Nieprawidłowe dane wejściowe.",
        details: { issues: exception.issues }
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return { code: "BAD_REQUEST", message: "Operacja na bazie nie powiodła się." };
    }

    return { code: "INTERNAL_ERROR", message: "Wystąpił nieoczekiwany błąd." };
  }

  private fromHttpException(exception: HttpException): ErrorResponseBody {
    const response = exception.getResponse();
    if (typeof response === "object" && response !== null && "code" in response) {
      return response as ErrorResponseBody;
    }

    return {
      code: this.mapStatus(exception.getStatus()),
      message: exception.message
    };
  }

  private mapStatus(status: number) {
    if (status === HttpStatus.UNAUTHORIZED) return "UNAUTHORIZED";
    if (status === HttpStatus.FORBIDDEN) return "FORBIDDEN";
    if (status === HttpStatus.NOT_FOUND) return "NOT_FOUND";
    if (status === HttpStatus.TOO_MANY_REQUESTS) return "RATE_LIMITED";
    return "BAD_REQUEST";
  }
}

