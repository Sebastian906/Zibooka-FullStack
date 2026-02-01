import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

// Extender la interfaz Request para incluir userId
export interface RequestWithUser extends Request {
  userId?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private configService: ConfigService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // Intentar obtener token de cookie O header
    let token = request.cookies?.token;

    // Si no hay cookie, buscar en header Authorization
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    console.log('Auth Guard - Token presente:', !!token);
    console.log('Token source:', request.cookies?.token ? 'cookie' : 'header');

    if (!token) {
      throw new UnauthorizedException('Not authorized. Login again');
    }

    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        throw new UnauthorizedException('JWT_SECRET is not configured');
      }

      const decoded = jwt.verify(token, jwtSecret) as unknown as {
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
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Session expired. Login again');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token. Login again');
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Not authorized. Login again');
    }
  }
}
