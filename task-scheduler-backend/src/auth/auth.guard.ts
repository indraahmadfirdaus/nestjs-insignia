import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const headerKey =
      req.headers['x-api-key'] ||
      req.header('X-API-Key') ||
      req.header('X-API-KEY');

    const expectedKey = process.env.API_KEY;

    if (!expectedKey) {
      throw new UnauthorizedException('API key not configured');
    }

    if (!headerKey) {
      throw new UnauthorizedException('API key missing');
    }

    if (headerKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
