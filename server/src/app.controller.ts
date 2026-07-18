import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Status')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Check API status' })
  @ApiResponse({ status: 200, description: 'API is running successfully.' })
  getStatus(): string {
    return this.appService.getStatus();
  }

  @SkipThrottle()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check with dependency validation' })
  @ApiResponse({ status: 200, description: 'System health status returned.' })
  async healthCheck() {
    const checks: Record<string, any> = {};
    let isHealthy = true;

    // 1. Verificar MongoDB
    try {
      const readyState = this.mongoConnection.readyState;
      checks.mongodb = {
        status: readyState === 1 ? 'up' : 'down',
        readyState,
      };
      if (readyState !== 1) isHealthy = false;
    } catch (error: any) {
      checks.mongodb = { status: 'down', error: error.message };
      isHealthy = false;
    }

    // 2. Verificar ML Service (opcional — no afecta el health general)
    const mlServiceUrl = process.env.ML_SERVICE_URL;
    if (mlServiceUrl) {
      try {
        const response = await fetch(`${mlServiceUrl}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        checks.mlService = {
          status: response.ok ? 'up' : 'down',
          statusCode: response.status,
        };
      } catch (error: any) {
        checks.mlService = { status: 'down', error: error.message };
        // ML service es opcional: no cambia el health general
      }
    }

    // 3. Uso de memoria del proceso
    const memUsage = process.memoryUsage();
    checks.memory = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    };

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: `${Math.round(process.uptime())}s`,
      checks,
    };
  }

  @SkipThrottle()
  @Get('health/live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe for orchestrators' })
  @ApiResponse({ status: 200, description: 'Process is alive.' })
  livenessCheck() {
    return { status: 'ok' };
  }
}
