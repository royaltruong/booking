import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { type FastifyReply } from 'fastify';

interface ValidateException {
  statusCode: number;
  message: string[];
  error: string;
}

/**
 * Global exception filter that normalises all errors into a consistent
 * JSON response shape. Validation errors (BadRequestException) are unwrapped
 * and returned as an `errors` array.
 */
@Catch()
export class CustomExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(CustomExceptionsFilter.name);

  /**
   * Intercepts any thrown exception and sends a structured HTTP response.
   * @param exception - The caught exception (HttpException or unknown error)
   * @param host - NestJS arguments host used to access the Fastify response
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<FastifyReply>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    if (exception instanceof BadRequestException) {
      const res = exception.getResponse() as ValidateException;
      response.status(status).send({
        statusCode: res.statusCode,
        message: res.error,
        errors: res.message,
      });
    } else {
      response.status(status).send({
        statusCode: status,
        message,
      });
    }

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception);
    }
  }
}
