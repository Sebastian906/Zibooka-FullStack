import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

export interface RequestWithAdmin extends Request {
  adminEmail?: string;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const adminToken = request.cookies?.adminToken;

    if (!adminToken) {
      throw new UnauthorizedException('Not authorized. Login again');
    }

    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        throw new UnauthorizedException('JWT_SECRET is not configured');
      }

      const decoded = jwt.verify(adminToken, jwtSecret) as unknown as {
        email: string;
      };

      if (!decoded.email) {
        throw new UnauthorizedException('Not authorized. Login again');
      }

      request.adminEmail = decoded.email;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Not authorized. Login again');
    }
  }
}