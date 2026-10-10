import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = status < 500 && typeof raw === 'object' && raw && 'message' in raw ? (raw as any).message : status < 500 && typeof raw === 'string' ? raw : 'Internal server error';
    response.status(status).json({ statusCode: status, message });
  }
}
