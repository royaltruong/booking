import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

/**
 * Global interceptor that wraps every successful response in a uniform
 * envelope: `{ statusCode, message, data? }`.
 * Handlers can return `{ message, data }` to customise both fields.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  /**
   * Maps the controller return value into the standard response envelope.
   * @param context - The current execution context
   * @param next - The call handler to invoke the route handler
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((response: { message?: string; data?: T }) => ({
        statusCode: HttpStatus.OK,
        message: response?.message ?? 'Success',
        ...(response?.data ? { data: response?.data ?? response } : {}),
      })),
    );
  }
}
