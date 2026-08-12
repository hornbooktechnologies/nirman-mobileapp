import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import type { ErrorCode } from "@nirman-app/shared";

type ErrorDetails =
  Record<string, unknown> | { field?: string; message: string }[];

type StructuredHttpError = {
  code?: ErrorCode;
  message?: string | string[];
  details?: ErrorDetails;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let errors: { field?: string; message: string }[] = [];
    let code: ErrorCode = "SERVER_ERROR";
    let details: ErrorDetails = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === "string") {
        message = body;
      } else if (typeof body === "object" && body !== null) {
        const bodyObj = body as StructuredHttpError;
        message =
          typeof bodyObj.message === "string"
            ? bodyObj.message
            : exception.message;
        code = bodyObj.code ?? this.defaultCodeForStatus(status);
        details = bodyObj.details ?? {};

        // class-validator pipes return message as array
        if (Array.isArray(bodyObj.message)) {
          errors = bodyObj.message.map((msg) => ({
            message: msg,
          }));
          message = "Validation failed";
          code = "VALIDATION_FAILED";
          details = errors;
        }
      }
    } else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      message,
      errors,
      error: {
        code,
        message,
        details,
      },
    });
  }

  private defaultCodeForStatus(status: number): ErrorCode {
    if (status === 400) return "VALIDATION_FAILED";
    if (status === 403) return "PERMISSION_DENIED";
    if (status === 409) return "CONFLICT";
    return "SERVER_ERROR";
  }
}
