import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

// Extender la interfaz Request para incluir userId
export interface RequestWithUser extends Request {
  userId?: string;
}

// Retrieves the raw JWT from cookie or Authorization header.
function extractToken(request: Request): string | undefined {
  const cookieToken = (request as any).cookies?.token;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return undefined;
}

// Maps jwt.verify errors to a descriptive UnauthorizedException.
function mapJwtError(error: unknown): UnauthorizedException {
  if (error instanceof jwt.TokenExpiredError) {
    return new UnauthorizedException('Session expired. Login again');
  }
  if (error instanceof jwt.JsonWebTokenError) {
    return new UnauthorizedException('Invalid token. Login again');
  }
  if (error instanceof UnauthorizedException) {
    return error;
  }
  return new UnauthorizedException('Not authorized. Login again');
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this route should skip auth guard
    const skipAuthGuard = this.reflector.get<boolean>(
      'skipAuthGuard',
      context.getHandler(),
    );
    if (skipAuthGuard) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // Intentar obtener token de cookie O header
    const token = extractToken(request);

    // Si no hay cookie, buscar en header Authorization
    console.log('Auth Guard - Token presente:', !!token);
    console.log(
      'Token source:',
      (request as any).cookies?.token ? 'cookie' : 'header',
    );

    if (!token) {
      throw new UnauthorizedException('Not authorized. Login again');
    }

    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        throw new UnauthorizedException('JWT_SECRET is not configured');
      }

      const decoded = jwt.verify(token, jwtSecret) as {
        id: string;
        session?: string;
        exp: number;
      };

      if (!decoded.id) {
        throw new UnauthorizedException('Not authorized. Login again');
      }

      // Verificar expiración del token (jwt.verify ya lo hace, pero doble check)
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTime) {
        throw new UnauthorizedException('Session expired. Login again');
      }

      request.userId = decoded.id;
      return true;
    } catch (error) {
      throw mapJwtError(error);
    }
  }
}
